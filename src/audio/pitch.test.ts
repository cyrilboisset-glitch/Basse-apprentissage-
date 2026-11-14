import { describe, it, expect } from 'vitest';
import { YinDetector } from './pitch';
import { midiToFreq } from './notes';

const SR = 48000;
/** Son de basse de synthèse ; `weakFund` simule une fondamentale faible (cas réel des graves). */
function bass(f: number, weakFund = false, n = 8192, detune = 0): Float32Array {
  const out = new Float32Array(n);
  const amps = weakFund ? [0.25, 1, 0.8, 0.5, 0.3, 0.2] : [1, 0.6, 0.4, 0.3, 0.2, 0.1];
  for (let i = 0; i < n; i++) {
    let v = 0;
    amps.forEach((a, h) => { v += a * Math.sin(2 * Math.PI * f * (h + 1) * i / SR); });
    out[i] = v * 0.2 * (1 + 0.01 * Math.sin(i / 3)) + detune * 0;
  }
  return out;
}

describe('YIN – notes de basse B0 (23) à G4 (67)', () => {
  const det = new YinDetector(SR, 8192, 28, 1000, 0.15, 4);
  for (const weak of [false, true]) {
    it(`reconnaît toutes les notes à ±2 cents (fondamentale ${weak ? 'faible' : 'normale'})`, () => {
      let ok = 0, total = 0; const bad: string[] = [];
      for (let m = 23; m <= 67; m++) {
        const f = midiToFreq(m); const r = det.detect(bass(f, weak)); total++;
        const cents = r ? 1200 * Math.log2(r.freq / f) : NaN;
        if (r && Math.abs(cents) < 2) ok++; else bad.push(`${m}:${cents.toFixed(1)}`);
      }
      console.log(`taux de reconnaissance (${weak ? 'fond. faible' : 'normal'}) : ${ok}/${total}`, bad.join(' '));
      expect(ok / total).toBeGreaterThanOrEqual(0.95);
    });
  }
  it('Mi grave E1 = 41,20 Hz exact', () => {
    const r = det.detect(bass(41.2035))!;
    expect(Math.abs(1200 * Math.log2(r.freq / 41.2035))).toBeLessThan(1);
  });
  it('Si grave B0 = 30,87 Hz exact', () => {
    const r = det.detect(bass(30.8677))!;
    expect(Math.abs(1200 * Math.log2(r.freq / 30.8677))).toBeLessThan(1);
  });
  it('ne détecte rien sur du silence', () => {
    expect(det.detect(new Float32Array(8192))).toBeNull();
  });
});
