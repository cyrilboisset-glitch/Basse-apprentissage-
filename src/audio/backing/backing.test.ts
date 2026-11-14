import { describe, it, expect } from 'vitest';
import { STYLES } from './styles';
import { planBar, stepTime, chordAtStep, voicing } from './plan';
import { parseGrid } from '../../theory/grid';
import { parseChord } from '../../theory/chords';
import { GRID_PRESETS, progressionToGrid } from '../../theory/grid';

const grid = parseGrid('Am7 | D7 Gmaj7')!;
describe('styles', () => {
  it('9 styles, aucun pas hors de la mesure', () => {
    expect(STYLES.length).toBe(9);
    for (const s of STYLES) {
      const all = [...Object.values(s.drums).flat(), ...[s.keys, s.gtr, s.organ].flatMap(h => (h ?? []).map(x => x.s))];
      expect(Math.max(...all), s.id).toBeLessThan(s.grid);
      expect(Math.min(...all), s.id).toBeGreaterThanOrEqual(0);
      expect(s.bpm).toBeGreaterThanOrEqual(s.bpmRange[0]); expect(s.bpm).toBeLessThanOrEqual(s.bpmRange[1]);
      expect(Object.keys(s.drums).length, s.id).toBeGreaterThan(1);
    }
  });
  it('aucune basse dans les backings', () => {
    for (const s of STYLES) { const ev = planBar(s, grid.bars[0], 0, 100, 0); for (const e of ev) for (const m of e.midi ?? []) expect(m, s.id).toBeGreaterThanOrEqual(38); }
  });
  it('chaque style a une grille par défaut existante', () => {
    for (const s of STYLES) expect(GRID_PRESETS.find(g => g.id === s.defaultGrid), s.id).toBeTruthy();
    for (const g of GRID_PRESETS) expect(progressionToGrid(g.romans, 'A'), g.id).not.toBeNull();
  });
});
describe('planification', () => {
  const rock = STYLES.find(s => s.id === 'rock')!;
  it('la mesure dure 4 temps : tous les événements sont dans [début, début + durée]', () => {
    for (const s of STYLES) for (const e of planBar(s, grid.bars[0], 10, 120, 0.5)) { expect(e.t).toBeGreaterThanOrEqual(10); expect(e.t).toBeLessThan(10 + 2 + 0.1); }
  });
  it('rock à 120 bpm : caisse claire aux temps 2 et 4 (0,5 s et 1,5 s)', () => {
    const sn = planBar(rock, grid.bars[0], 0, 120, 0).filter(e => e.voice === 'snare').map(e => e.t);
    expect(sn).toEqual([0.5, 1.5]);
  });
  it('swing : la croche en retard est décalée, pas les temps forts', () => {
    const j = STYLES.find(s => s.id === 'jazz')!;
    expect(stepTime(j, 4, 0, 0.5, 0.66)).toBe(0.5);
    expect(stepTime(j, 2, 0, 0.5, 0.66)).toBeCloseTo(0.25 + 0.66 * 0.5 / 6, 6);
    expect(stepTime(j, 2, 0, 0.5, 0)).toBe(0.25);
  });
  it('deux accords par mesure : la 2ᵉ moitié joue le 2ᵉ accord', () => {
    const bar = grid.bars[1]; expect(chordAtStep(bar, 0, 4)).toBe(0); expect(chordAtStep(bar, 7, 4)).toBe(0); expect(chordAtStep(bar, 8, 4)).toBe(1); expect(chordAtStep(bar, 15, 4)).toBe(1);
    const ev = planBar(rock, bar, 0, 120, 0).filter(e => e.voice === 'gtr');
    expect(ev[0].chord).toBe(0); expect(ev[ev.length - 1].chord).toBe(1);
  });
  it('voicings : notes de l’accord, dans le médium', () => {
    for (const sym of ['Am7', 'D7', 'Gmaj7', 'Bb', 'F#m7b5', 'E']) {
      const c = parseChord(sym)!, v = voicing(c, 'keys');
      expect(v[0]).toBeGreaterThanOrEqual(48); expect(v[v.length - 1]).toBeLessThanOrEqual(78);
      expect(v.map(m => m % 12).sort()).toEqual(c.quality.steps.map(s => (c.root + s) % 12).sort());
    }
    expect(voicing(parseChord('E')!, 'power')).toEqual([40, 47, 52]);
  });
});
