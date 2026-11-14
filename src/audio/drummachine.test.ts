import { describe, it, expect } from 'vitest';
import { patternFromStyle, dmStepTime, emptyPattern, DM_STYLES, DM_VOICES } from './drummachine';

describe('boîte à rythmes', () => {
  it('motif rock : grosse caisse 1-3-3&, caisse claire 2 et 4', () => {
    const p = patternFromStyle('rock'); const on = (v: string) => p[v].map((x, i) => (x ? i : -1)).filter(i => i >= 0);
    expect(on('kick')).toEqual([0, 8, 10]); expect(on('snare')).toEqual([4, 12]);
  });
  it('tous les modèles ont au moins deux voix et tiennent sur 16 pas', () => {
    expect(DM_STYLES.length).toBeGreaterThanOrEqual(6);
    for (const s of DM_STYLES) { const p = patternFromStyle(s.id); expect(Object.values(p).every(r => r.length === 16)).toBe(true); expect(Object.values(p).filter(r => r.some(Boolean)).length, s.id).toBeGreaterThanOrEqual(2); }
  });
  it('motif vide : aucune voix active', () => { const e = emptyPattern(); expect(DM_VOICES.every(v => !e[v.id].some(Boolean))).toBe(true); });
  it('temps : 100 BPM = 16 pas en 2,4 s ; le swing retarde seulement les pas impairs', () => {
    expect(dmStepTime(0, 16, 100, 0)).toBeCloseTo(2.4, 6); expect(dmStepTime(0, 4, 100, 0.8)).toBeCloseTo(0.6, 6);
    expect(dmStepTime(0, 1, 100, 0.6)).toBeGreaterThan(dmStepTime(0, 1, 100, 0)); expect(dmStepTime(0, 1, 100, 1) - 0.15).toBeLessThan(0.15 * 2 / 3 + 1e-9);
  });
});
