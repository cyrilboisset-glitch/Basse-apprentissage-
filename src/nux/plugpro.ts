import { ccMessage, CC, MIDI_CHARACTERISTIC, MIDI_SERVICE, parseIncoming, pcMessage, TunerDecoder, tunerSettingsMessage, USB_MODE, type TunerReading, type TunerSettings } from './protocol';

export type NuxStatus = 'unsupported' | 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
export interface Capabilities { preset: boolean; volume: boolean; tuner: 'unknown' | 'available' | 'unavailable'; usbMode: boolean }
/** Éléments minimalistes de Web Bluetooth utilisés (injectables pour les tests). */
export interface BleChar { startNotifications(): Promise<unknown>; writeValueWithoutResponse?(v: BufferSource): Promise<void>; writeValue?(v: BufferSource): Promise<void>; addEventListener(t: string, l: (e: any) => void): void; removeEventListener(t: string, l: (e: any) => void): void; value?: DataView }
export interface BleDevice { name?: string; gatt?: { connected: boolean; connect(): Promise<{ getPrimaryService(u: string): Promise<{ getCharacteristic(u: string): Promise<BleChar> }> }>; disconnect(): void }; addEventListener(t: string, l: () => void): void; removeEventListener(t: string, l: () => void): void }
export interface BleProvider { requestDevice(o: unknown): Promise<BleDevice> }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Contrôle du Mighty Plug Pro en BLE MIDI. Tout ce qui n'est pas confirmé est « non disponible », jamais une exception. */
export class PlugPro {
  status: NuxStatus; caps: Capabilities = { preset: true, volume: true, tuner: 'unknown', usbMode: true };
  deviceName = ''; preset: number | null = null; volume: number | null = null;
  private dev: BleDevice | null = null; private ch: BleChar | null = null; private dec = new TunerDecoder();
  private onStatus = new Set<(s: NuxStatus) => void>(); private onTuner = new Set<(t: TunerReading) => void>(); private manualStop = false;
  private tunerTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(private ble: BleProvider | undefined = (typeof navigator !== 'undefined' ? (navigator as any).bluetooth : undefined), private retryMs = [1000, 2000, 4000, 8000]) {
    this.status = this.ble ? 'idle' : 'unsupported';
  }
  subscribeStatus(l: (s: NuxStatus) => void) { this.onStatus.add(l); return () => this.onStatus.delete(l); }
  subscribeTuner(l: (t: TunerReading) => void) { this.onTuner.add(l); return () => this.onTuner.delete(l); }
  private set(s: NuxStatus) { this.status = s; this.onStatus.forEach(l => l(s)); }
  get connected() { return this.status === 'connected'; }

  /** À appeler depuis un geste de l'utilisateur (exigence de Web Bluetooth). */
  async connect(): Promise<boolean> {
    if (!this.ble) { this.set('unsupported'); return false; }
    try {
      this.set('connecting'); this.manualStop = false;
      this.dev = await this.ble.requestDevice({ acceptAllDevices: true, optionalServices: [MIDI_SERVICE] });
      this.deviceName = this.dev.name ?? 'Appareil BLE MIDI';
      this.dev.addEventListener('gattserverdisconnected', this.onDrop);
      await this.link(); return true;
    } catch (e) { this.set((e as DOMException)?.name === 'NotFoundError' ? 'idle' : 'error'); return false; }
  }
  private async link() {
    const server = await this.dev!.gatt!.connect();
    const svc = await server.getPrimaryService(MIDI_SERVICE);
    this.ch = await svc.getCharacteristic(MIDI_CHARACTERISTIC);
    this.ch.addEventListener('characteristicvaluechanged', this.onValue);
    await this.ch.startNotifications();
    this.set('connected');
  }
  private onDrop = () => { this.ch = null; if (this.manualStop) { this.set('idle'); return; } this.set('reconnecting'); this.retry(); };
  private async retry() {
    for (const ms of this.retryMs) {
      await sleep(ms); if (this.manualStop || this.status === 'connected') return;
      try { await this.link(); if (this.tunerWanted) this.tunerSet(this.tunerWanted); return; } catch { /* on réessaie */ }
    }
    this.set('disconnected');
  }
  disconnect() { this.manualStop = true; this.dev?.removeEventListener('gattserverdisconnected', this.onDrop); this.dev?.gatt?.disconnect(); this.ch = null; this.set('idle'); }

  private onValue = (e: any) => {
    const v: DataView = e.target?.value ?? e.value; if (!v) return;
    for (const m of parseIncoming(new Uint8Array(v.buffer, v.byteOffset, v.byteLength))) {
      if (m.kind === 'cc' && m.cc === CC.MASTER) this.volume = m.value;
      if (m.kind === 'pc') this.preset = m.program;
      const t = this.dec.feed(m); if (t) { if (this.caps.tuner === 'unknown') this.caps = { ...this.caps, tuner: 'available' }; this.onTuner.forEach(l => l(t)); }
    }
  };
  private async write(bytes: number[]): Promise<boolean> {
    if (!this.ch || !this.connected) return false;
    try { const buf = new Uint8Array(bytes); if (this.ch.writeValueWithoutResponse) await this.ch.writeValueWithoutResponse(buf); else await this.ch.writeValue?.(buf); return true; } catch { return false; }
  }
  /** Preset 1 à 7. */
  async setPreset(n: number) { if (n < 1 || n > 7) return false; const ok = await this.write(pcMessage(n - 1)); if (ok) this.preset = n - 1; return ok; }
  /** Niveau 0-100 % → 0-127 (échelle réelle en dB propre à l'appareil, non vérifiée). */
  async setVolume(pct: number) { const v = Math.round(Math.max(0, Math.min(100, pct)) * 1.27); const ok = await this.write(ccMessage(CC.MASTER, v)); if (ok) this.volume = v; return ok; }
  async setUsbMode(mode: 'dryOut' | 'normal' | 'reamp', loopback = false) { return this.write(ccMessage(CC.USB_AUDIO_MODE, USB_MODE[mode] | (loopback ? USB_MODE.loopbackBit : 0))); }

  private tunerWanted: TunerSettings | null = null;
  /** Active l'accordeur du Plug Pro ; sans réponse sous 2,5 s (firmware ancien), il est déclaré « non disponible ». */
  async tunerSet(t: TunerSettings) {
    this.tunerWanted = t.on ? t : null;
    const ok = await this.write(tunerSettingsMessage(t)); if (!ok) return false;
    if (this.tunerTimer) clearTimeout(this.tunerTimer);
    if (t.on && this.caps.tuner === 'unknown') this.tunerTimer = setTimeout(() => { if (this.caps.tuner === 'unknown') { this.caps = { ...this.caps, tuner: 'unavailable' }; this.onTuner.forEach(l => l({ ...this.dec.state, pc: null, cents: null })); } }, 2500);
    return true;
  }
}
export const nux = new PlugPro();
