import { describe, it, expect, vi } from 'vitest';
import { ccMessage, pcMessage, tunerSettingsMessage, parseIncoming, TunerDecoder, CC, tunerRequestMessage, MIDI_SERVICE, MIDI_CHARACTERISTIC } from './protocol';
import { PlugPro, type BleChar, type BleDevice } from './plugpro';

describe('protocole (trames identiques à Mightier Amp)', () => {
  it('Control Change : en-tête 0x80 0x80, statut 0xB0', () => { expect(ccMessage(73, 100)).toEqual([0x80, 0x80, 0xb0, 73, 100]); });
  it('valeurs CC bornées à 0-127', () => { expect(ccMessage(73, 300)[4]).toBe(127); expect(ccMessage(73, -5)[4]).toBe(0); });
  it('Program Change : 0xC0 + preset (0-6), refus hors plage', () => {
    expect(pcMessage(2)).toEqual([0x80, 0x80, 0xc0, 2]); expect(() => pcMessage(7)).toThrow(); expect(() => pcMessage(-1)).toThrow();
  });
  it('SysEx accordeur : F0 43 58 70 6F 01 [on, mode, réf, mute, 0,0,0] 80 F7 ; réf = Hz − 430', () => {
    expect(tunerSettingsMessage({ on: true, mode: 'bass', refHz: 440, mute: false })).toEqual([0x80, 0x80, 0xf0, 0x43, 0x58, 0x70, 0x6f, 1, 1, 3, 10, 0, 0, 0, 0, 0x80, 0xf7]);
    expect(tunerSettingsMessage({ on: false, mode: 'chromatic', refHz: 442, mute: true }).slice(7, 12)).toEqual([1, 0, 0, 12, 1]);
    expect(tunerSettingsMessage({ on: true, mode: 'bass', refHz: 500, mute: false })[10]).toBe(20); // borné
    expect(tunerRequestMessage().slice(5, 8)).toEqual([0x70, 0x6f, 0]);
  });
  it('UUID officiels', () => { expect(MIDI_SERVICE).toBe('03b80e5a-ede8-4b33-a751-6ce34ec4c700'); expect(MIDI_CHARACTERISTIC).toBe('7772e5db-3868-4112-a1a9-f2669d106bf3'); });
});
describe('décodage des paquets entrants', () => {
  it('un CC, un PC, plusieurs messages dans un paquet', () => {
    expect(parseIncoming([0x80, 0x80, 0xb0, 73, 99])).toEqual([{ kind: 'cc', cc: 73, value: 99 }]);
    expect(parseIncoming([0x80, 0x80, 0xc0, 4])).toEqual([{ kind: 'pc', program: 4 }]);
    expect(parseIncoming([0x90, 0x81, 0xb0, 12, 3, 0x82, 0xb0, 72, 55])).toEqual([{ kind: 'cc', cc: 12, value: 3 }, { kind: 'cc', cc: 72, value: 55 }]);
  });
  it('SysEx complet', () => { expect(parseIncoming([0x80, 0x80, 0xf0, 0x43, 0x58, 0x70, 0x6f, 2, 0x80, 0xf7])).toEqual([{ kind: 'sysex', data: [0x43, 0x58, 0x70, 0x6f, 2] }]); });
  it('paquets tronqués ou vides : pas d’exception', () => { for (const p of [[], [0x80], [0x80, 0x80, 0xb0], [0x80, 0x80, 0xb0, 1], [0x80, 0x80, 0xf0, 1]]) expect(() => parseIncoming(p)).not.toThrow(); });
  it('accordeur : note 0 = La, centièmes = valeur − 50, « pas de signal » reconnu', () => {
    const d = new TunerDecoder(); const f = (cc: number, value: number) => d.feed({ kind: 'cc', cc, value });
    f(CC.TUNER_STATE, 1); f(CC.TUNER_NOTE, 7); const r = f(CC.TUNER_CENT, 60)!; // 7 demi-tons après La = Mi
    expect(r).toMatchObject({ enabled: true, pc: 4, cents: 10 });
    f(CC.TUNER_NOTE, 0); expect(f(CC.TUNER_CENT, 50)).toMatchObject({ pc: null, cents: null });
    f(CC.TUNER_NOTE, 0); expect(f(CC.TUNER_CENT, 44)).toMatchObject({ pc: 9, cents: -6 }); // La, 6 cents bas
    expect(d.feed({ kind: 'cc', cc: 99, value: 1 })).toBeNull();
  });
});

function fakeBle(opts: { failConnects?: number } = {}) {
  const writes: number[][] = []; const listeners: Record<string, ((e: any) => void)[]> = {}; let fail = opts.failConnects ?? 0;
  const ch: BleChar = { startNotifications: async () => {}, writeValueWithoutResponse: async v => { writes.push(Array.from(v as Uint8Array)); }, addEventListener: (t, l) => { (listeners[t] ??= []).push(l); }, removeEventListener: () => {} };
  const devL: (() => void)[] = []; let connected = false;
  const dev: BleDevice = { name: 'NUX MIGHTY PLUG PRO MIDI', addEventListener: (_t, l) => { devL.push(l); }, removeEventListener: () => {},
    gatt: { get connected() { return connected; }, connect: async () => { if (fail-- > 0) throw new Error('GATT'); connected = true; return { getPrimaryService: async (u: string) => { expect(u).toBe(MIDI_SERVICE); return { getCharacteristic: async (c: string) => { expect(c).toBe(MIDI_CHARACTERISTIC); return ch; } }; } }; }, disconnect: () => { connected = false; } } };
  return { writes, drop: () => { connected = false; devL.forEach(l => l()); }, notify: (bytes: number[]) => listeners['characteristicvaluechanged']?.forEach(l => l({ target: { value: new DataView(new Uint8Array(bytes).buffer) } })),
    provider: { requestDevice: vi.fn(async () => dev) } };
}
describe('contrôleur PlugPro (Web Bluetooth simulé)', () => {
  it('sans Web Bluetooth : « unsupported », aucune exception', async () => {
    const p = new PlugPro(undefined); expect(p.status).toBe('unsupported'); expect(await p.connect()).toBe(false); expect(await p.setPreset(1)).toBe(false);
  });
  it('connexion avec service MIDI optionnel, envoi preset / volume / mode USB', async () => {
    const f = fakeBle(); const p = new PlugPro(f.provider);
    expect(await p.connect()).toBe(true); expect(p.status).toBe('connected'); expect(f.provider.requestDevice).toHaveBeenCalledWith({ acceptAllDevices: true, optionalServices: [MIDI_SERVICE] });
    await p.setPreset(3); await p.setVolume(100); await p.setUsbMode('dryOut'); await p.setUsbMode('normal', true);
    expect(f.writes).toEqual([[0x80, 0x80, 0xc0, 2], [0x80, 0x80, 0xb0, 73, 127], [0x80, 0x80, 0xb0, 88, 0], [0x80, 0x80, 0xb0, 88, 0x11]]);
    expect(await p.setPreset(8)).toBe(false); expect(await p.setPreset(0)).toBe(false);
  });
  it('envoi impossible une fois déconnecté (pas d’exception)', async () => { const p = new PlugPro(fakeBle().provider); expect(await p.setVolume(50)).toBe(false); });
  it('accordeur : lecture des notifications ; sans réponse = « non disponible »', async () => {
    vi.useFakeTimers(); const f = fakeBle(); const p = new PlugPro(f.provider); await p.connect(); const seen: any[] = []; p.subscribeTuner(t => seen.push(t));
    await p.tunerSet({ on: true, mode: 'bass', refHz: 440, mute: false }); expect(f.writes.at(-1)![5]).toBe(0x70);
    await vi.advanceTimersByTimeAsync(2600); expect(p.caps.tuner).toBe('unavailable');
    const g = fakeBle(); const q = new PlugPro(g.provider); await q.connect(); q.subscribeTuner(t => seen.push(t));
    await q.tunerSet({ on: true, mode: 'bass', refHz: 440, mute: false }); g.notify([0x80, 0x80, 0xb0, 11, 1]); g.notify([0x80, 0x80, 0xb0, 12, 3]); g.notify([0x80, 0x80, 0xb0, 72, 50 + 8]);
    expect(q.caps.tuner).toBe('available'); expect(seen.at(-1)).toMatchObject({ pc: 0, cents: 8 }); // Do, +8 cents
    await vi.advanceTimersByTimeAsync(3000); expect(q.caps.tuner).toBe('available'); vi.useRealTimers();
  });
  it('déconnexion : reconnexion automatique avec nouvelles tentatives', async () => {
    const f = fakeBle(); const p = new PlugPro(f.provider, [5, 5, 5]); await p.connect(); const st: string[] = []; p.subscribeStatus(s => st.push(s));
    (f.provider as any); f.drop(); await new Promise(r => setTimeout(r, 40));
    expect(st).toContain('reconnecting'); expect(p.status).toBe('connected');
  });
  it('échecs répétés : statut « disconnected » (sans boucle infinie)', async () => {
    const f = fakeBle(); const p = new PlugPro(f.provider, [3, 3]); await p.connect();
    // les prochaines connexions échouent
    const dev = await f.provider.requestDevice(); (dev.gatt as any).connect = async () => { throw new Error('x'); };
    f.drop(); await new Promise(r => setTimeout(r, 40)); expect(p.status).toBe('disconnected');
  });
  it('déconnexion volontaire : pas de reconnexion', async () => { const f = fakeBle(); const p = new PlugPro(f.provider, [5]); await p.connect(); p.disconnect(); f.drop(); await new Promise(r => setTimeout(r, 20)); expect(p.status).toBe('idle'); });
  it('annulation de la fenêtre de choix : retour à « idle »', async () => { const p = new PlugPro({ requestDevice: async () => { throw Object.assign(new Error('x'), { name: 'NotFoundError' }); } }); expect(await p.connect()).toBe(false); expect(p.status).toBe('idle'); });
});
