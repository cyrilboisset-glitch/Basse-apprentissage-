import { describe, it, expect, vi } from 'vitest';
import { encodeWav } from './wav';
import { CommandDetector } from './command';
import { Footswitch } from '../nux/footswitch';
import { parseIncoming } from '../nux/protocol';

describe('encodeWav', () => {
  const dv = (u: Uint8Array) => new DataView(u.buffer, u.byteOffset, u.byteLength);
  it('en-tête RIFF/WAVE PCM 16 bits correct', () => {
    const w = encodeWav([new Float32Array(480)], 48000), v = dv(w), s = (o: number) => String.fromCharCode(...w.slice(o, o + 4));
    expect([s(0), s(8), s(12), s(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']); expect(v.getUint16(20, true)).toBe(1); expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(48000); expect(v.getUint32(28, true)).toBe(96000); expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(960); expect(v.getUint32(4, true)).toBe(36 + 960); expect(w.length).toBe(44 + 960);
  });
  it('échantillons : bornés, symétriques, entrelacés en stéréo', () => {
    const w = encodeWav([Float32Array.of(1, -1, 0.5, 2), Float32Array.of(0, 0, -0.5, -3)], 44100), v = dv(w);
    expect(v.getInt16(44, true)).toBe(32767); expect(v.getInt16(46, true)).toBe(0); expect(v.getInt16(48, true)).toBe(-32768);
    expect(v.getInt16(52, true)).toBe(16383); expect(v.getInt16(54, true)).toBe(-16384); expect(v.getInt16(56, true)).toBe(32767); expect(v.getInt16(58, true)).toBe(-32768);
  });
  it('un sinus 440 Hz fait un aller-retour sans perte audible', () => {
    const x = Float32Array.from({ length: 4800 }, (_, i) => 0.8 * Math.sin(2 * Math.PI * 440 * i / 48000)), v = dv(encodeWav([x], 48000));
    let err = 0; for (let i = 0; i < x.length; i++) err = Math.max(err, Math.abs(v.getInt16(44 + i * 2, true) / 32768 - x[i])); expect(err).toBeLessThan(1e-4);
  });
  it('aucun canal ou aucun échantillon : fichier valide', () => { expect(encodeWav([new Float32Array(0)], 48000).length).toBe(44); });
});
describe('note commande (double note isolée)', () => {
  const E = 28;
  it('Mi à vide deux fois après un silence : déclenche', () => { const d = new CommandDetector(E); expect(d.feed(5, E)).toBe(false); expect(d.feed(5.5, E)).toBe(true); });
  it('jeu continu avec des Mi : ne déclenche pas', () => { const d = new CommandDetector(E); const r = [0, 0.3, 0.6, 0.9, 1.2, 1.5].map((t, i) => d.feed(t, i % 2 ? E : 33)); expect(r).not.toContain(true); const r2 = [2.0, 2.4].map(t => d.feed(t, E)); expect(r2).toEqual([false, false]); // pas de silence avant : jeu normal
    const r3 = [10, 10.4].map(t => d.feed(t, E)); expect(r3).toEqual([false, true]); // après un vrai silence : commande
  });
  it('autre note : ne déclenche pas', () => { const d = new CommandDetector(E); expect([d.feed(5, 33), d.feed(5.4, 33)]).toEqual([false, false]); });
  it('deux notes trop espacées : non', () => { const d = new CommandDetector(E); expect([d.feed(5, E), d.feed(6.5, E)]).toEqual([false, false]); });
  it('trois Mi d’affilée : une seule commande, puis délai de garde', () => { const d = new CommandDetector(E); const r = [d.feed(5, E), d.feed(5.4, E), d.feed(5.8, E), d.feed(6.2, E)]; expect(r.filter(Boolean).length).toBe(1); });
  it('note commande réglable', () => { const d = new CommandDetector(33); expect([d.feed(5, 33), d.feed(5.4, 33)]).toEqual([false, true]); });
  it('note étouffée (sans hauteur) ignorée', () => { const d = new CommandDetector(E); expect(d.feed(5, null)).toBe(false); });
});
describe('footswitch BLE MIDI', () => {
  it('décode note-on, note-off, CC, PC', () => {
    expect(parseIncoming([0x80, 0x80, 0x90, 60, 100])).toEqual([{ kind: 'note', note: 60, velocity: 100, on: true }]);
    expect(parseIncoming([0x80, 0x80, 0x90, 60, 0])[0]).toMatchObject({ kind: 'note', on: false }); expect(parseIncoming([0x80, 0x80, 0x80, 60, 0])[0]).toMatchObject({ on: false });
  });
  function fake() { let L: ((e: any) => void)[] = []; const ch = { startNotifications: async () => {}, addEventListener: (_: string, l: any) => L.push(l), removeEventListener() {} };
    const dev = { name: 'FootCtrl', addEventListener() {}, removeEventListener() {}, gatt: { connected: true, connect: async () => ({ getPrimaryService: async () => ({ getCharacteristic: async () => ch }) }), disconnect() {} } };
    return { provider: { requestDevice: async () => dev }, send: (b: number[]) => L.forEach(l => l({ target: { value: new DataView(new Uint8Array(b).buffer) } })) }; }
  it('un appui déclenche, les rebonds sont ignorés, le relâchement ne déclenche pas', async () => {
    let t = 1000; const f = fake(), fs = new Footswitch(f.provider as any, () => t), cb = vi.fn(); fs.onTrigger = cb; await fs.connect(); expect(fs.status).toBe('connected');
    f.send([0x80, 0x80, 0x90, 60, 100]); t += 50; f.send([0x80, 0x80, 0x90, 60, 100]); t += 500; f.send([0x80, 0x80, 0x90, 60, 0]); t += 10; f.send([0x80, 0x80, 0xb0, 64, 127]);
    expect(cb).toHaveBeenCalledTimes(2);
  });
  it('sans Web Bluetooth : unsupported', async () => { const fs = new Footswitch(undefined); expect(fs.status).toBe('unsupported'); expect(await fs.connect()).toBe(false); });
});
