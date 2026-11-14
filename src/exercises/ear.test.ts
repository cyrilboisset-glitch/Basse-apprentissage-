import { describe, it, expect } from 'vitest';
import { makeInterval, intervalNotes, intervalChoices, makeChord, chordChoices, makeDegrees, degreeChord, makeLine, INTERVAL_LEVELS } from './ear';
import { pc } from '../theory/scales';

let seed = 11; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const none = new Map();
describe('oreille', () => {
  it('intervalles : la réponse correspond aux deux notes jouées, dans les deux sens', () => {
    for (let l = 0; l < 3; l++) for (let i = 0; i < 100; i++) {
      const q = makeInterval(l, none, rng), [a, b] = intervalNotes(q);
      expect(Math.abs(b - a)).toBe(Number(q.answer)); expect(INTERVAL_LEVELS[l]).toContain(Number(q.answer)); expect(Math.min(a, b)).toBeGreaterThanOrEqual(36);
      expect(intervalChoices(l).map(c => c.id)).toContain(q.answer);
    }
  });
  it('niveaux croissants : 3 → 5 → 12 intervalles proposés', () => { expect([0, 1, 2].map(l => intervalChoices(l).length)).toEqual([3, 5, 12]); });
  it('accords : les notes correspondent à la qualité annoncée', () => {
    for (let l = 0; l < 3; l++) for (let i = 0; i < 60; i++) {
      const q = makeChord(l, none, rng); expect(chordChoices(l).map(c => c.id)).toContain(q.answer);
      expect(q.notes.map(n => n - q.root)).toEqual(q.quality.steps);
    }
  });
  it('degrés : l’accord demandé est bien celui joué, 1er accord = I', () => {
    for (let l = 0; l < 3; l++) for (let i = 0; i < 60; i++) { const q = makeDegrees(l, none, rng); expect(q.chords[0]).toBe('I'); expect(q.chords[q.ask]).toBe(q.answer); expect(q.ask).toBeGreaterThanOrEqual(1); }
  });
  it('degrés : accords de Do (I = Do-Mi-Sol, V = Sol-Si-Ré, vi = La-Do-Mi)', () => {
    expect(degreeChord('I', 0).map(pc)).toEqual([0, 4, 7]); expect(degreeChord('V', 0).map(pc)).toEqual([7, 11, 2]); expect(degreeChord('vi', 0).map(pc)).toEqual([9, 0, 4]);
  });
  it('lignes : longueur croissante, tessiture de basse, pas de note répétée, sauts ≤ quinte+', () => {
    for (let l = 0; l < 3; l++) for (let i = 0; i < 60; i++) { const q = makeLine(l, none, rng); expect(q.notes.length).toBe(3 + l);
      q.notes.forEach((n, k) => { expect(n).toBeGreaterThanOrEqual(28); expect(n).toBeLessThanOrEqual(52); if (k) { expect(n).not.toBe(q.notes[k - 1]); expect(Math.abs(n - q.notes[k - 1])).toBeLessThanOrEqual(7); } }); }
  });
});
