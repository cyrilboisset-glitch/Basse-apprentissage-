import { MIDI_CHARACTERISTIC, MIDI_SERVICE, parseIncoming } from './protocol';
import type { BleChar, BleDevice, BleProvider } from './plugpro';

export type FsStatus = 'unsupported' | 'idle' | 'connecting' | 'connected' | 'error';
/** Footswitch BLE MIDI générique (service MIDI standard) : toute pression (note, CC ≥ 64, Program Change) = « bascule ». */
export class Footswitch {
  status: FsStatus; name = ''; private dev: BleDevice | null = null; private ch: BleChar | null = null; private last = 0;
  private sub = new Set<(s: FsStatus) => void>(); onTrigger?: () => void;
  constructor(private ble: BleProvider | undefined = (typeof navigator !== 'undefined' ? (navigator as any).bluetooth : undefined), private now = () => Date.now()) { this.status = ble ? 'idle' : 'unsupported'; }
  subscribe(l: (s: FsStatus) => void) { this.sub.add(l); return () => this.sub.delete(l); }
  private set(s: FsStatus) { this.status = s; this.sub.forEach(l => l(s)); }
  async connect(): Promise<boolean> {
    if (!this.ble) return false;
    try {
      this.set('connecting');
      this.dev = await this.ble.requestDevice({ acceptAllDevices: true, optionalServices: [MIDI_SERVICE] }); this.name = this.dev.name ?? 'Footswitch';
      const server = await this.dev.gatt!.connect(); const svc = await server.getPrimaryService(MIDI_SERVICE);
      this.ch = await svc.getCharacteristic(MIDI_CHARACTERISTIC); this.ch.addEventListener('characteristicvaluechanged', this.onValue); await this.ch.startNotifications();
      this.dev.addEventListener('gattserverdisconnected', () => this.set('idle')); this.set('connected'); return true;
    } catch (e) { this.set((e as DOMException)?.name === 'NotFoundError' ? 'idle' : 'error'); return false; }
  }
  disconnect() { this.dev?.gatt?.disconnect(); this.set('idle'); }
  private onValue = (e: any) => {
    const v: DataView = e.target?.value ?? e.value; if (!v) return;
    const press = parseIncoming(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)).some(m => (m.kind === 'note' && m.on) || (m.kind === 'cc' && m.value >= 64) || m.kind === 'pc');
    const t = this.now(); if (press && t - this.last > 300) { this.last = t; this.onTrigger?.(); } // anti-rebond
  };
}
export const footswitch = new Footswitch();
