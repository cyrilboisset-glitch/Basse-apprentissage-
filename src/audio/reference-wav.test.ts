import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { measureFolder, parseNoteName } from '../../scripts/measure-lib';
import { readWav } from '../../scripts/wav';
import { YinDetector } from './pitch';
import { midiToFreq } from './notes';

describe('fichiers WAV de référence (tests/audio : B0 → G4, 48 kHz, générés par scripts/make-reference-wavs.ts)', () => {
  const rows = measureFolder('tests/audio');
  it('45 fichiers, de B0 (23) à G4 (67), un par demi-ton', () => {
    expect(rows.length).toBe(45); expect(rows.map(r => r.midi)).toEqual(expect.arrayContaining(Array.from({ length: 45 }, (_, i) => 23 + i)));
  });
  it('taux de reconnaissance ≥ 98 % à ±5 cents (mesuré : 45/45, écart moyen 0,5 cent)', () => {
    const ok = rows.filter(r => r.ok).length; console.log(`reconnaissance WAV de référence : ${ok}/${rows.length}`);
    expect(ok / rows.length).toBeGreaterThanOrEqual(0.98);
  });
  it('les graves (B0 = 30,87 Hz, E1 = 41,20 Hz) sont justes à moins de 2 cents', () => {
    for (const n of ['B0.wav', 'E1.wav']) { const r = rows.find(x => x.file === n)!; expect(Math.abs(r.cents!), n).toBeLessThan(2); }
  });
  it('robustesse au bruit blanc : ≥ 95 % à 20 dB de rapport signal/bruit ; ≥ 70 % à 10 dB (limite connue, voir docs/qualite.md)', () => {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const rate = (snrDb: number, fails?: string[]) => { let ok = 0, n = 0;
      for (const f of readdirSync('tests/audio')) { const midi = parseNoteName(f.replace('.wav', ''))!; const { samples, sampleRate } = readWav(`tests/audio/${f}`);
        const w = samples.slice(Math.floor(0.08 * sampleRate), Math.floor(0.08 * sampleRate) + 8192); const rms = Math.sqrt(w.reduce((a, x) => a + x * x, 0) / w.length); const sigma = rms / Math.pow(10, snrDb / 20);
        const noisy = w.map(x => x + (rnd() + rnd() + rnd() - 1.5) * 2 * sigma); const r = new YinDetector(sampleRate, 8192, 28, 1000, 0.15, 4).detect(noisy); n++;
        if (r && Math.abs(1200 * Math.log2(r.freq / midiToFreq(midi))) <= 5) ok++; else fails?.push(f.replace('.wav', '')); }
      return ok / n; };
    const f10: string[] = []; const r20 = rate(20), r10 = rate(10, f10); console.log(`bruit : 20 dB → ${(100 * r20).toFixed(1)} % · 10 dB → ${(100 * r10).toFixed(1)} % (échecs à 10 dB : ${f10.join(' ')})`);
    expect(r20).toBeGreaterThanOrEqual(0.95); expect(r10).toBeGreaterThanOrEqual(0.7);
  });
});
