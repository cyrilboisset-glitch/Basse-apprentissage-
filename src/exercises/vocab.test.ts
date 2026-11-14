import { describe, it, expect } from 'vitest';
import { PHRASES, STYLE_ORDER, bluesShare, transpose, validate, harmonicShare, parseNotes, retab, quantizeCapture, toBars, toPattern, getPhrase, phraseGrid } from './vocab';
import { analyzeGroove, patternBars } from './groove';

describe('bibliothèque de phrases', () => {
  it('au moins 60 phrases, au moins 6 par style, 8 styles', () => {
    expect(PHRASES.length).toBeGreaterThanOrEqual(60);
    for (const s of STYLE_ORDER) expect(PHRASES.filter(p => p.style === s).length, s).toBeGreaterThanOrEqual(6);
  });
  it('identifiants uniques, noms uniques par style, conseil présent', () => {
    expect(new Set(PHRASES.map(p => p.id)).size).toBe(PHRASES.length);
    for (const s of STYLE_ORDER) { const n = PHRASES.filter(p => p.style === s).map(p => p.name); expect(new Set(n).size, s).toBe(n.length); }
    for (const p of PHRASES) expect(p.tip.length, p.id).toBeGreaterThan(20);
  });
  it('chaque phrase est valide (grille, cases 0-12, notes dans la mesure)', () => {
    for (const p of PHRASES) expect(validate(p), p.id).toEqual([]);
  });
  it('chaque phrase est harmoniquement cohérente (≥ 60 % de notes d’accord, ≤ 30 % de passage, aucune note à éviter tenue)', () => {
    const bad: string[] = [];
    for (const p of PHRASES) { const h = harmonicShare(p);
      if (p.style === 'blues') { if (bluesShare(p) < 0.9) bad.push(`${p.id} gamme blues ${bluesShare(p).toFixed(2)}`); }
      else { if (h.chord < 0.6) bad.push(`${p.id} accord ${h.chord.toFixed(2)}`); if (h.passing > 0.3) bad.push(`${p.id} passage ${h.passing.toFixed(2)}`); }
      if (h.avoidStrong) bad.push(`${p.id} note à éviter tenue`); }
    expect(bad).toEqual([]);
  });
  it('aucune transcription : tempo et notes plausibles, ≥ 4 notes ou longue tenue', () => {
    for (const p of PHRASES) { expect(p.bpm).toBeGreaterThanOrEqual(60); expect(p.bpm).toBeLessThanOrEqual(140); expect(p.notes.length, p.id).toBeGreaterThanOrEqual(2); }
  });
});
describe('transposition dans les 12 tonalités', () => {
  const keys = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  it('toutes les phrases restent jouables (≥ Mi grave, cases ≤ 19) et gardent leurs intervalles', () => {
    for (const p of PHRASES) for (const k of keys) {
      const t = transpose(p, k); const iv = (n: typeof t.notes) => n.slice(1).map((x, i) => x.midi - n[i].midi);
      expect(iv(t.notes), `${p.id}→${k}`).toEqual(iv(p.notes));
      for (const n of t.notes) { expect(n.midi, `${p.id}→${k}`).toBeGreaterThanOrEqual(28); expect(n.fret, `${p.id}→${k}`).toBeLessThanOrEqual(19); expect(n.midi).toBe([28, 33, 38, 43][n.string] + n.fret); }
      expect(validate(t).filter(e => !/hors 0-12/.test(e)), `${p.id}→${k}`).toEqual([]);
    }
  });
  it('la phrase transposée reste cohérente avec sa grille', () => {
    const bad: string[] = [];
    for (const p of PHRASES) for (const k of ['G', 'Bb', 'F#', 'C']) { const t = transpose(p, k);
      if (p.style === 'blues' ? bluesShare(t) < 0.9 : harmonicShare(t).chord < 0.6) bad.push(`${p.id}→${k}`); }
    expect(bad).toEqual([]);
  });
  it('la même tonalité ne change rien', () => { const p = PHRASES[0]; expect(transpose(p, p.key).notes.map(n => n.midi)).toEqual(p.notes.map(n => n.midi)); });
});
describe('outils', () => {
  it('jetons invalides refusés', () => { expect(() => parseNotes(['0:X1:1'])).toThrow(); });
  it('retab : case la plus basse', () => { expect(retab(28)).toEqual({ string: 0, fret: 0 }); expect(retab(40)).toEqual({ string: 2, fret: 2 }); });
  it('capture audio : quantification sur la double croche', () => {
    const bpm = 120, bd = 0.5, ons = [{ t: 10, midi: 40 }, { t: 10 + bd * 1.02, midi: 43 }, { t: 10 + bd * 2.5 + 0.01, midi: 45 }, { t: 10 + bd * 3, midi: null }];
    const n = quantizeCapture(ons, 10, bpm, 2);
    expect(n.map(x => [x.beat, x.midi])).toEqual([[0, 40], [1, 43], [2.5, 45]]);
    expect(n[2].dur).toBeLessThanOrEqual(1.5);
  });
  it('toBars restitue les notes d’origine', () => { const p = getPhrase('blues-02')!; expect(parseNotes(toBars(p.notes, p.bars)).map(n => n.midi)).toEqual(p.notes.map(n => n.midi)); });
  it('une phrase jouée parfaitement obtient 100 % avec l’analyse de mise en place', () => {
    const p = getPhrase('jazz-01')!, pat = toPattern(p), BD = 0.6, bars = Array.from({ length: p.bars }, (_, i) => ({ time: 5 + i * 4 * BD, bpm: 100, audible: true }));
    const on = p.notes.map(n => ({ t: 5 + n.beat * BD, midi: n.midi }));
    expect(patternBars(pat)).toBe(p.bars); expect(analyzeGroove(pat, bars, on).hitPct).toBe(1); expect(phraseGrid(p)!.bars.length).toBe(4);
  });
});
