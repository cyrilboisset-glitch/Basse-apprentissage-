import { describe, it, expect } from 'vitest';
import { analyzeGroove, getPattern, nextTempo, patternBars, PATTERNS, type BarT, type Onset } from './groove';

const BPM = 100, BD = 60 / BPM;
const mkBars = (n: number, audible = (_: number) => true): BarT[] => Array.from({ length: n }, (_, i) => ({ time: 2 + i * 4 * BD, bpm: BPM, audible: audible(i) }));
function play(id: string, bars: BarT[], devMs: (i: number) => number = () => 0, skip = (_: number) => false): Onset[] {
  const p = getPattern(id), cyc = patternBars(p), out: Onset[] = []; let k = 0;
  bars.forEach((b, bi) => p.events.forEach(e => { if (Math.floor(e.beat / 4) !== bi % cyc) return; if (skip(k)) { k++; return; } out.push({ t: b.time + (e.beat - (bi % cyc) * 4) * BD + devMs(k) / 1000, midi: e.kind === 'ghost' ? null : (e.midi ?? 40) }); k++; }));
  return out;
}
describe('motifs', () => {
  it('tous les motifs ont des événements valides', () => {
    for (const p of PATTERNS) { expect(p.events.length, p.id).toBeGreaterThan(1); for (const e of p.events) { expect(e.beat).toBeGreaterThanOrEqual(0); expect(e.beat).toBeLessThan(patternBars(p) * 4); } }
  });
  it('le chromatique couvre 4 cordes × 4 cases sur 2 mesures', () => { const p = getPattern('chrom'); expect(p.events.length).toBe(16); expect(patternBars(p)).toBe(2); expect(p.events[0].midi).toBe(33); });
});
describe('analyse de mise en place', () => {
  it('joueur parfait : 100 %, écart nul, très régulier', () => {
    for (const id of ['q', 'e', 's', 't', 'sync', 'off']) { const bars = mkBars(8), r = analyzeGroove(getPattern(id), bars, play(id, bars)); expect(r.hitPct, id).toBe(1); expect(Math.abs(r.meanMs)).toBeLessThan(1); expect(r.verdict.regularity).toBe('très régulier'); expect(r.missed + r.extra).toBe(0); }
  });
  it('joueur en retard de 40 ms : diagnostic « retard » et mesure fidèle', () => {
    const bars = mkBars(8), r = analyzeGroove(getPattern('e'), bars, play('e', bars, () => 40));
    expect(r.verdict.bias).toBe('retard'); expect(r.meanMs).toBeCloseTo(40, 0); expect(r.advice.join(' ')).toMatch(/en retard/);
  });
  it('la latence calibrée est compensée', () => {
    const bars = mkBars(8), r = analyzeGroove(getPattern('q'), bars, play('q', bars, () => 120), { latencyS: 0.12 });
    expect(Math.abs(r.meanMs)).toBeLessThan(1); expect(r.hitPct).toBe(1);
  });
  it('joueur irrégulier : écart-type élevé et conseil de ralentir', () => {
    let s = 5; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 140;
    const bars = mkBars(8), r = analyzeGroove(getPattern('e'), bars, play('e', bars, rnd));
    expect(r.verdict.regularity).toBe('irrégulier'); expect(r.advice.join(' ')).toMatch(/Régularité/);
  });
  it('notes manquantes comptées', () => {
    const bars = mkBars(4), r = analyzeGroove(getPattern('q'), bars, play('q', bars, () => 0, k => k % 4 === 3));
    expect(r.missed).toBe(4); expect(r.hitPct).toBeCloseTo(0.75, 2);
  });
  it('notes en trop comptées', () => {
    const bars = mkBars(4), on = play('q', bars); on.push({ t: bars[1].time + 0.5 * BD, midi: 40 });
    expect(analyzeGroove(getPattern('q'), bars, on).extra).toBe(1);
  });
  it('notes étouffées : détectées sans hauteur, ou ignorées à la demande', () => {
    const bars = mkBars(4), on = play('ghost', bars); const r = analyzeGroove(getPattern('ghost'), bars, on);
    expect(r.hitPct).toBe(1); expect(r.devs.filter(d => d.kind === 'ghost').length).toBe(32);
    const only = on.filter(o => o.midi !== null), r2 = analyzeGroove(getPattern('ghost'), bars, only, { ignoreGhosts: true });
    expect(r2.hitPct).toBe(1);
  });
  it('chromatique : mauvaise hauteur détectée', () => {
    const bars = mkBars(4), on = play('chrom', bars); on[3].midi = 99;
    const r = analyzeGroove(getPattern('chrom'), bars, on); expect(r.wrongPitch).toBe(1); expect(r.advice.join(' ')).toMatch(/mauvaise hauteur/);
  });
});
describe('clic qui disparaît : dérive', () => {
  it('ralentir de 6 ms par mesure sans clic est détecté', () => {
    const bars = mkBars(16, i => i % 2 === 0 || i < 2);
    const r = analyzeGroove(getPattern('q'), bars, play('q', bars, k => Math.floor(k / 4) * 6));
    expect(r.driftBpm).not.toBeNull(); expect(r.driftBpm!).toBeLessThan(0); expect(r.driftBpm!).toBeGreaterThan(-1.5);
  });
  it('tempo parfaitement tenu : dérive ≈ 0', () => {
    const bars = mkBars(16, i => i % 2 === 0), r = analyzeGroove(getPattern('q'), bars, play('q', bars));
    expect(Math.abs(r.driftBpm ?? 0)).toBeLessThan(0.3);
  });
  it('accélération marquée : message « accélérez »', () => {
    const bars = mkBars(8, i => i < 2), r = analyzeGroove(getPattern('q'), bars, play('q', bars, k => -(Math.floor(k / 4) - 1) * 40));
    expect(r.driftBpm!).toBeGreaterThan(1.5); expect(r.advice.join(' ')).toMatch(/accélérez/);
  });
});
describe('alternance et progression du tempo', () => {
  it('doigt plus lent détecté', () => {
    const bars = mkBars(8), p = getPattern('alt'); const on: Onset[] = []; let t = bars[0].time;
    for (let i = 0; i < 64; i++) { on.push({ t, midi: 28 }); t += BD / 4 + (i % 2 === 0 ? 0.012 : -0.012); }
    const r = analyzeGroove(p, bars, on); expect(Math.abs(r.altAsymMs!)).toBeGreaterThan(20); expect(r.advice.join(' ')).toMatch(/Alternance/);
  });
  it('+5 BPM à partir de 90 %', () => { expect(nextTempo(80, 0.95)).toBe(85); expect(nextTempo(80, 0.89)).toBe(80); expect(nextTempo(218, 1)).toBe(220); });
});
