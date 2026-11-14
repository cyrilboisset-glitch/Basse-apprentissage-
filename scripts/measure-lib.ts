/** Mesure du taux de reconnaissance sur des fichiers WAV nommés d'après la note (E1.wav, F#2.wav, Bb1.wav…). */
import { readdirSync } from 'node:fs';
import { YinDetector } from '../src/audio/pitch';
import { midiToFreq } from '../src/audio/notes';
import { readWav } from './wav';

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const parseNoteName = (n: string): number | null => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); return m ? 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) : null; };

export interface Row { file: string; midi: number; expectedHz: number; hz: number | null; cents: number | null; ok: boolean }
export function measureFolder(dir: string, offsetS = 0.08, tolCents = 5): Row[] {
  const rows: Row[] = [];
  for (const file of readdirSync(dir).filter(f => f.toLowerCase().endsWith('.wav')).sort()) {
    const midi = parseNoteName(file.replace(/\.wav$/i, '')); if (midi === null) continue;
    const { samples, sampleRate } = readWav(`${dir}/${file}`); const det = new YinDetector(sampleRate, 8192, 28, 1000, 0.15, 4);
    const start = Math.min(Math.floor(offsetS * sampleRate), Math.max(0, samples.length - 8192)); const win = samples.subarray(start, start + 8192);
    const exp = midiToFreq(midi), r = win.length === 8192 ? det.detect(win) : null, cents = r ? 1200 * Math.log2(r.freq / exp) : null;
    rows.push({ file, midi, expectedHz: exp, hz: r?.freq ?? null, cents, ok: cents !== null && Math.abs(cents) <= tolCents });
  }
  return rows;
}
