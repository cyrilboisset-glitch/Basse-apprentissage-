export interface Ev { beat: number; kind: 'note' | 'ghost'; midi?: number }
export interface GroovePattern { id: string; name: string; hint: string; events: Ev[]; section: 'rythme' | 'technique' }
const grid = (step: number, n = 4): Ev[] => Array.from({ length: Math.round(n / step) }, (_, i) => ({ beat: +(i * step).toFixed(4), kind: 'note' as const }));
const at = (beats: number[], kind: Ev['kind'] = 'note'): Ev[] => beats.map(beat => ({ beat, kind }));

export const RHYTHMS: GroovePattern[] = [
  { id: 'q', name: 'Noires', hint: 'Une note par temps, bien droite.', section: 'rythme', events: grid(1) },
  { id: 'e', name: 'Croches', hint: 'Deux notes par temps.', section: 'rythme', events: grid(0.5) },
  { id: 's', name: 'Doubles croches', hint: 'Quatre notes par temps : alternez les doigts.', section: 'rythme', events: grid(0.25) },
  { id: 't', name: 'Triolets', hint: 'Trois notes par temps : « tri-po-let ».', section: 'rythme', events: grid(1 / 3) },
  { id: 'sync', name: 'Syncopes', hint: 'Temps 1, « et » du 2, temps 3, « et » du 4.', section: 'rythme', events: at([0, 1.5, 2, 3.5]) },
  { id: 'off', name: 'Contretemps', hint: 'Uniquement sur les « et » : le temps est silencieux.', section: 'rythme', events: at([0.5, 1.5, 2.5, 3.5]) },
  { id: 'ghost', name: 'Notes étouffées', hint: 'Notes pleines sur 1 et 3, notes étouffées (main gauche relâchée) sur les croches et doubles entre les deux.', section: 'rythme',
    events: [{ beat: 0, kind: 'note' }, ...at([0.5, 0.75, 1, 1.5], 'ghost'), { beat: 2, kind: 'note' }, ...at([2.5, 2.75, 3, 3.5], 'ghost')] },
  { id: 'funk16', name: 'Groove funk 16es', hint: 'Notes sur 1, « a » du 1, « et » du 2, 4 ; ghosts entre.', section: 'rythme',
    events: [{ beat: 0, kind: 'note' }, { beat: 0.75, kind: 'note' }, { beat: 1.5, kind: 'note' }, { beat: 3, kind: 'note' }, ...at([0.25, 1, 2.25, 2.5, 3.5], 'ghost')] },
];
// Technique : notes à hauteurs imposées (cases 5-8, corde de Mi puis La…) ou régularité pure.
const chrom = (): Ev[] => { const o: Ev[] = []; const strings = [28, 33, 38, 43]; let b = 0;
  for (const s of strings) for (const f of [5, 6, 7, 8]) { o.push({ beat: b, kind: 'note', midi: s + f }); b += 0.5; } return o; }; // 16 croches = 2 mesures
export const TECHNIQUE: GroovePattern[] = [
  { id: 'alt', name: 'Alternance index / majeur', hint: 'Doubles croches sur une corde à vide, en alternant strictement index-majeur.', section: 'technique', events: grid(0.25) },
  { id: 'chrom', name: 'Chromatique 1-2-3-4', hint: 'Cases 5-6-7-8 sur chaque corde (Mi, La, Ré, Sol), un doigt par case, en croches.', section: 'technique', events: chrom() },
  { id: 'open', name: 'Cordes à vide', hint: 'Mi, La, Ré, Sol à vide en croches, régulier et détaché.', section: 'technique',
    events: [28, 33, 38, 43, 43, 38, 33, 28].map((m, i) => ({ beat: i * 0.5, kind: 'note' as const, midi: m })) },
];
export const PATTERNS = [...RHYTHMS, ...TECHNIQUE];
export const getPattern = (id: string) => PATTERNS.find(p => p.id === id)!;
export const patternBars = (p: GroovePattern) => Math.max(1, Math.ceil((Math.max(...p.events.map(e => e.beat)) + 0.01) / 4));

export interface BarT { time: number; bpm: number; audible: boolean }
export interface Onset { t: number; midi: number | null; level?: number }
export interface Dev { bar: number; beat: number; devMs: number; kind: Ev['kind']; wrongPitch?: boolean }
export interface GrooveResult {
  devs: Dev[]; missed: number; extra: number; wrongPitch: number; meanMs: number; sdMs: number; hitPct: number; tightPct: number;
  perBar: { bar: number; meanMs: number; audible: boolean }[]; driftBpm: number | null; altAsymMs: number | null;
  verdict: { bias: 'avance' | 'retard' | 'centré'; regularity: 'très régulier' | 'régulier' | 'irrégulier' }; advice: string[]; success: number;
}
export const HIT_MS = 50, TIGHT_MS = 25;

/** Les événements du motif sont répétés à chaque mesure ; pour les motifs de plusieurs mesures, `barsPerCycle` mesures forment un cycle. */
export function analyzeGroove(p: GroovePattern, bars: BarT[], played: Onset[], opts: { latencyS?: number; ignoreGhosts?: boolean; beatsPerBar?: number } = {}): GrooveResult {
  const lat = opts.latencyS ?? 0, bpb = opts.beatsPerBar ?? 4, cycle = patternBars(p);
  const ons = played.map(o => ({ ...o, t: o.t - lat })).sort((a, b) => a.t - b.t); const used = new Set<number>();
  const sorted = [...p.events].sort((a, b) => a.beat - b.beat);
  const spacing = (e: Ev, cycleBeats: number) => { const bs = sorted.map(x => x.beat); const i = bs.indexOf(e.beat); const prev = i > 0 ? bs[i] - bs[i - 1] : bs[0] + cycleBeats - bs[bs.length - 1]; const next = i < bs.length - 1 ? bs[i + 1] - bs[i] : bs[0] + cycleBeats - bs[i]; return Math.min(prev, next, 1); };
  const devs: Dev[] = []; let missed = 0, wrongPitch = 0;
  bars.forEach((bar, bi) => {
    const bd = 60 / bar.bpm, within = bi % cycle;
    for (const e of p.events) {
      if (Math.floor(e.beat / bpb) !== within) continue;
      if (e.kind === 'ghost' && opts.ignoreGhosts) continue;
      const tExp = bar.time + (e.beat - within * bpb) * bd, win = Math.max(0.03, 0.45 * spacing(e, cycle * bpb) * bd);
      let best = -1, bd2 = Infinity;
      ons.forEach((o, k) => { if (used.has(k)) return; const d = Math.abs(o.t - tExp); if (d < win && d < bd2) { bd2 = d; best = k; } });
      if (best < 0) { missed++; continue; }
      used.add(best); const o = ons[best];
      const wp = e.kind === 'note' && e.midi !== undefined && o.midi !== null && o.midi !== e.midi;
      if (wp) wrongPitch++;
      devs.push({ bar: bi, beat: e.beat, devMs: (o.t - tExp) * 1000, kind: e.kind, wrongPitch: wp });
    }
  });
  const end = bars.length ? bars[bars.length - 1].time + 60 / bars[bars.length - 1].bpm * bpb : 0;
  const extra = ons.filter((o, k) => !used.has(k) && o.t >= (bars[0]?.time ?? 0) - 0.1 && o.t < end).length;
  const good = devs.filter(d => !d.wrongPitch), ms = good.map(d => d.devMs);
  const mean = ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 0;
  const sd = ms.length ? Math.sqrt(ms.reduce((a, b) => a + (b - mean) ** 2, 0) / ms.length) : 0;
  const total = p.events.filter(e => !(opts.ignoreGhosts && e.kind === 'ghost')).length * Math.floor(bars.length / cycle) || 1;
  const hits = good.filter(d => Math.abs(d.devMs - 0) <= HIT_MS).length;
  const perBar = bars.map((b, i) => { const d = good.filter(x => x.bar === i); return { bar: i, meanMs: d.length ? d.reduce((a, x) => a + x.devMs, 0) / d.length : NaN, audible: b.audible }; });

  // Dérive : pente des écarts moyens sur les mesures sans clic (ms par mesure) → BPM effectif.
  let driftBpm: number | null = null;
  const sil = perBar.filter(b => !b.audible && !Number.isNaN(b.meanMs));
  if (sil.length >= 3) {
    const xs = sil.map(b => b.bar), ys = sil.map(b => b.meanMs), mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / (xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1);
    const barMs = (60 / bars[0].bpm) * bpb * 1000; driftBpm = bars[0].bpm * (barMs / (barMs + slope)) - bars[0].bpm;
  }
  // Alternance : écart de durée entre intervalles pairs et impairs.
  let altAsymMs: number | null = null;
  if (p.id === 'alt' && ons.length > 8) {
    const ioi = ons.slice(1).map((o, i) => (o.t - ons[i].t) * 1000), ev = ioi.filter((_, i) => i % 2 === 0), od = ioi.filter((_, i) => i % 2 === 1);
    altAsymMs = ev.reduce((a, b) => a + b, 0) / ev.length - od.reduce((a, b) => a + b, 0) / od.length;
  }
  const verdict = { bias: mean > 15 ? 'retard' as const : mean < -15 ? 'avance' as const : 'centré' as const, regularity: sd < 20 ? 'très régulier' as const : sd < 35 ? 'régulier' as const : 'irrégulier' as const };
  const success = hits / total;
  const r: GrooveResult = { devs, missed, extra, wrongPitch, meanMs: mean, sdMs: sd, hitPct: success, tightPct: good.filter(d => Math.abs(d.devMs) <= TIGHT_MS).length / total, perBar, driftBpm, altAsymMs, verdict, advice: [], success };
  r.advice = grooveAdvice(p, r); return r;
}

export function grooveAdvice(p: GroovePattern, r: GrooveResult): string[] {
  const a: string[] = [];
  if (r.devs.length < 4) return ["Presque aucune note détectée : vérifiez l'entrée audio (Matériel) et jouez plus franchement."];
  if (r.wrongPitch > 0) a.push(`${r.wrongPitch} note(s) à la mauvaise hauteur : ralentissez et vérifiez chaque case avant d'accélérer.`);
  if (r.verdict.bias === 'retard') a.push(`Vous jouez en retard d'environ ${Math.round(r.meanMs)} ms. Essayez de jouer « sur le dessus » du clic, sans attendre de l'entendre. Si ce retard est constant, recalibrez la latence.`);
  if (r.verdict.bias === 'avance') a.push(`Vous êtes en avance d'environ ${Math.round(-r.meanMs)} ms : détendez-vous et laissez le clic arriver avant de jouer.`);
  if (r.verdict.regularity === 'irrégulier') a.push(`Régularité à travailler (écart-type ${Math.round(r.sdMs)} ms) : baissez le tempo de 10 BPM et visez 5 mesures parfaites d'affilée.`);
  if (r.driftBpm !== null && Math.abs(r.driftBpm) >= 1.5) a.push(`Sans clic, vous ${r.driftBpm < 0 ? 'ralentissez' : 'accélérez'} d'environ ${Math.abs(r.driftBpm).toFixed(1)} BPM sur la durée. Gardez le tempo en tapant du pied.`);
  if (r.altAsymMs !== null && Math.abs(r.altAsymMs) > 12) a.push(`Alternance déséquilibrée : un des deux doigts est ${Math.round(Math.abs(r.altAsymMs))} ms plus lent que l'autre. Travaillez à vide, doigt par doigt, au métronome lent.`);
  if (r.missed > r.devs.length * 0.3) a.push('Beaucoup de notes manquantes : choisissez un tempo plus lent pour jouer toutes les notes.');
  if (p.id === 'ghost' && r.missed > 0) a.push('Les notes étouffées très douces peuvent ne pas être détectées : jouez-les un peu plus fort, ou utilisez l\'auto-évaluation.');
  if (!a.length) a.push(r.success >= 0.9 ? 'Excellent : +5 BPM au prochain essai.' : 'Bonne base : cherchez la régularité avant la vitesse.');
  return a.slice(0, 3);
}
export const nextTempo = (bpm: number, success: number, max = 220) => (success >= 0.9 ? Math.min(max, bpm + 5) : bpm);
