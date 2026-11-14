import { describe, it, expect } from 'vitest';
import { EXERCISES, analyze, getEx, makeScripts, makePhrase, place, teacherAdvice, type BarScript, type Played, type ExDef } from './impro';
import { gridFromPresetForTest } from './testutil';
import { pc } from '../theory/scales';
import { chordNotes } from '../theory/chords';

const BPM = 100, BEAT = 60 / BPM;
let seed = 3; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function setup(id: string, key?: string) {
  const ex = getEx(id) as ExDef; const grid = gridFromPresetForTest(ex.gridId, key ?? ex.key)!;
  const scripts = makeScripts(ex, grid, ex.laps, rng);
  const bars = scripts.map((_, i) => ({ time: 2 + i * 4 * BEAT, bpm: BPM, bar: i % grid.bars.length }));
  return { ex, grid, scripts, bars };
}
const at = (bars: { time: number }[], bar: number, beat: number, midi: number, jitter = 0): Played => ({ t: bars[bar].time + beat * BEAT + jitter, midi });
const rootMidi = (c: { root: number }) => 28 + ((c.root - 4 + 12) % 12);

describe('scripts', () => {
  it('chaque exercice génère un script par mesure', () => {
    for (const ex of EXERCISES) { const g = gridFromPresetForTest(ex.gridId, ex.key)!; expect(makeScripts(ex, g, ex.laps, rng).length).toBe(g.bars.length * ex.laps); }
  });
  it('question/réponse : mesures paires = écoute avec phrase, impaires = jeu', () => {
    const { scripts } = setup('qa'); expect(scripts[0].mode).toBe('listen'); expect(scripts[0].phrase!.length).toBeGreaterThan(1); expect(scripts[1].mode).toBe('play');
  });
  it('phrases : commencent par la fondamentale, notes d’accord, dans le registre de la basse', () => {
    const g = gridFromPresetForTest('blues12', 'A')!;
    for (let k = 0; k < 40; k++) { const c = g.bars[k % 12][0].chord, p = makePhrase(c, rng); expect(pc(p[0].midi)).toBe(c.root); for (const n of p) { expect(chordNotes(c)).toContain(pc(n.midi)); expect(n.midi).toBeGreaterThanOrEqual(28); expect(n.midi).toBeLessThanOrEqual(52); expect(n.beat).toBeLessThan(4); } }
  });
});

describe('analyse : joueur parfait = 100 %', () => {
  it('une seule note (noires / croches / syncopes)', () => {
    const { ex, grid, scripts, bars } = setup('root'); const notes: Played[] = [];
    scripts.forEach((s, i) => s.expected!.forEach(b => notes.push(at(bars, i, b, rootMidi(grid.bars[i][0].chord), 0.01))));
    const r = analyze(ex, bars, scripts, grid, notes); expect(r.score).toBe(100); expect(r.metrics.inChordPct).toBe(1);
  });
  it('notes cibles : tierce au temps 1', () => {
    const { ex, grid, scripts, bars } = setup('targets'); const notes = scripts.map((s, i) => { const c = grid.bars[bars[i].bar][0].chord; return at(bars, i, 0, 28 + ((s.targetPc! - 4 + 12) % 12) + (c.root >= 0 ? 12 : 0)); });
    expect(analyze(ex, bars, scripts, grid, notes).score).toBe(100);
  });
  it('approches chromatiques', () => {
    const { ex, grid, scripts, bars } = setup('chromatic'); const notes: Played[] = [];
    scripts.forEach((s, i) => { const c = grid.bars[bars[i].bar][0].chord; notes.push(at(bars, i, 0, rootMidi(c))); notes.push(at(bars, i, 3.5, 28 + ((s.approachPcs![0] - 4 + 12) % 12))); });
    expect(analyze(ex, bars, scripts, grid, notes).score).toBe(100);
  });
  it('walking : 1 racine, 2-3 notes d’accord, 4 approche', () => {
    const { ex, grid, scripts, bars } = setup('walking'); const notes: Played[] = [];
    scripts.forEach((s, i) => { const c = grid.bars[bars[i].bar][0].chord, r = rootMidi(c); notes.push(at(bars, i, 0, r), at(bars, i, 1, r + c.quality.steps[1]), at(bars, i, 2, r + 7), at(bars, i, 3, 28 + ((s.approachPcs![0] - 4 + 12) % 12))); });
    expect(analyze(ex, bars, scripts, grid, notes).score).toBe(100);
  });
  it('contraintes : 4 contraintes respectées', () => {
    const { ex, grid, scripts, bars } = setup('constraints'); const notes: Played[] = [];
    scripts.forEach((s, i) => { const r = rootMidi(grid.bars[bars[i].bar][0].chord); const seq = s.constraint === 'ascending' ? [r, r + 3, r + 7] : [r, r + 7, r];
      seq.forEach((m, k) => notes.push(at(bars, i, k, m))); });
    expect(analyze(ex, bars, scripts, grid, notes).score).toBe(100);
  });
  it('copie : rejouer identique réussit, rejouer autre chose échoue', () => {
    const { ex, grid, scripts, bars } = setup('copy');
    const play = (alter: boolean) => { const notes: Played[] = []; scripts.forEach((s, i) => { if (s.mode === 'play' && s.copyOf && s.copyKind === 'copy') s.copyOf.forEach(n => notes.push(at(bars, i, n.beat, alter ? n.midi + 1 : n.midi))); }); return notes; };
    const good = analyze(ex, bars, scripts, grid, play(false)), bad = analyze(ex, bars, scripts, grid, play(true));
    const copyItems = (r: typeof good) => r.items.filter(i => /copy/.test(i.label));
    expect(copyItems(good).every(i => i.ok)).toBe(true); expect(copyItems(bad).some(i => i.ok)).toBe(false);
  });
});

describe('analyse : joueur fautif', () => {
  it('notes cibles : jouer la fondamentale au lieu de la tierce échoue', () => {
    const { ex, grid, scripts, bars } = setup('targets'); const notes = scripts.map((_, i) => at(bars, i, 0, rootMidi(grid.bars[bars[i].bar][0].chord)));
    expect(analyze(ex, bars, scripts, grid, notes).score).toBe(0);
  });
  it('silence total : score nul et conseil de vérifier l’entrée', () => {
    const { ex, grid, scripts, bars } = setup('free'); const r = analyze(ex, bars, scripts, grid, []);
    expect(r.score).toBe(0); expect(r.advice[0]).toMatch(/entrée audio/);
  });
  it('jouer faux sur « une seule note » est sanctionné', () => {
    const { ex, grid, scripts, bars } = setup('root'); const notes: Played[] = [];
    scripts.forEach((s, i) => s.expected!.forEach(b => notes.push(at(bars, i, b, rootMidi(grid.bars[i][0].chord) + 1))));
    expect(analyze(ex, bars, scripts, grid, notes).score).toBe(0);
  });
  it('en retard de 60 ms : conseil sur le retard', () => {
    const { ex, grid, scripts, bars } = setup('free'); const notes: Played[] = [];
    scripts.forEach((_, i) => { const c = grid.bars[bars[i].bar][0].chord; for (let b = 0; b < 4; b++) notes.push(at(bars, i, b, rootMidi(c), 0.06)); });
    const r = analyze(ex, bars, scripts, grid, notes);
    expect(r.metrics.meanOffsetMs).toBeGreaterThan(50); expect(r.advice.join(' ')).toMatch(/en retard/);
  });
  it('trop de notes sur accord mineur : « laissez respirer »', () => {
    const adv = teacherAdvice('free', { notes: 60, inChordPct: .9, avoid: 0, rhythmPct: .9, meanOffsetMs: 0, notesPerBar: 8, beat1RootPct: .8, minorDensity: 8 }, [], 70);
    expect(adv[0]).toMatch(/laissez respirer/);
  });
  it('notes à éviter signalées', () => {
    const { ex, grid, scripts, bars } = setup('free'); const notes: Played[] = [];
    scripts.forEach((_, i) => { const c = grid.bars[bars[i].bar][0].chord; for (let b = 0; b < 4; b++) notes.push(at(bars, i, b, 28 + ((c.root + 5 - 4 + 12) % 12))); });
    expect(analyze(ex, bars, scripts, grid, notes).advice.join(' ')).toMatch(/à éviter/);
  });
  it('une note très en avance du temps 1 est rattachée à la mesure suivante', () => {
    const { grid, bars } = setup('free'); const p = place(bars, grid, [{ t: bars[1].time - 0.05, midi: 40 }]);
    expect(p[0].bar).toBe(1);
  });
  it('conseil positif quand tout va bien', () => {
    expect(teacherAdvice('free', { notes: 40, inChordPct: .95, avoid: 0, rhythmPct: .95, meanOffsetMs: 3, notesPerBar: 4, beat1RootPct: .9, minorDensity: 2 }, [], 92)[0]).toMatch(/Très propre/);
  });
});
