import { noteRole } from '../theory/chords';
import { parseGrid, progressionToGrid, noteNameForKey, type Grid } from '../theory/grid';
import { parseRoot } from '../theory/chords';
import { pc } from '../theory/scales';
import type { Ev, GroovePattern } from './groove';

export interface RawPhrase { id: string; name: string; bpm: number; key: string; grid: string; swing: number; tip: string; bars: string[]; style?: string }
export interface PNote { beat: number; string: number; fret: number; midi: number; dur: number }
export interface Phrase { id: string; name: string; style: string; bpm: number; key: string; grid: string; swing: number; tip: string; bars: number; notes: PNote[]; user?: boolean }

const OPEN: Record<string, number> = { B: 23, E: 28, A: 33, D: 38, G: 43 };
const STRINGS4 = [28, 33, 38, 43];
export const STYLE_LABELS: Record<string, string> = { blues: 'Blues', funk: 'Funk', rock: 'Rock', pop: 'Pop', reggae: 'Reggae', soul: 'Soul / Motown', jazz: 'Jazz (walking)', latin: 'Latin', perso: 'Mes phrases' };
export const STYLE_ORDER = ['blues', 'funk', 'rock', 'pop', 'reggae', 'soul', 'jazz', 'latin'];

const mods = import.meta.glob('../data/phrases/*.json', { eager: true }) as Record<string, { default: { style: string; phrases: RawPhrase[] } }>;

export function parseNotes(bars: string[]): PNote[] {
  const out: PNote[] = [];
  bars.forEach((bar, i) => bar.trim().split(/\s+/).filter(Boolean).forEach(tok => {
    const m = /^(\d*\.?\d+):([BEADG])(\d+):(\d*\.?\d+)$/.exec(tok);
    if (!m) throw new Error(`Jeton invalide « ${tok} »`);
    out.push({ beat: i * 4 + parseFloat(m[1]), string: ['E', 'A', 'D', 'G'].indexOf(m[2]), fret: Number(m[3]), midi: OPEN[m[2]] + Number(m[3]), dur: parseFloat(m[4]) });
  }));
  return out;
}
export function fromRaw(r: RawPhrase, style: string, user = false): Phrase {
  const notes = parseNotes(r.bars);
  return { id: r.id, name: r.name, style: r.style ?? style, bpm: r.bpm, key: r.key, grid: r.grid, swing: r.swing ?? 0, tip: r.tip ?? '', bars: r.bars.length, notes, user };
}
export const PHRASES: Phrase[] = Object.values(mods).flatMap(m => m.default.phrases.map(p => fromRaw(p, m.default.style)))
  .sort((a, b) => STYLE_ORDER.indexOf(a.style) - STYLE_ORDER.indexOf(b.style) || a.id.localeCompare(b.id));
export const getPhrase = (id: string) => PHRASES.find(p => p.id === id);

/** Case la plus basse (≤ 12) sur les cordes de Mi, La, Ré, Sol. */
export function retab(midi: number): { string: number; fret: number } {
  let best: { string: number; fret: number } | null = null;
  for (const max of [12, 15, 19]) {
    STRINGS4.forEach((o, s) => { const f = midi - o; if (f >= 0 && f <= max && (!best || f < best.fret)) best = { string: s, fret: f }; });
    if (best) break;
  }
  if (!best) { const s = midi < 28 ? 0 : 3; best = { string: s, fret: midi - STRINGS4[s] }; } // hors tessiture : on garde une case hors 0-12
  return best;
}
const keyPc = (k: string) => parseRoot(k)!.pc;

/** Transpose dans une autre tonalité en gardant la tessiture de la basse (Mi grave → ~Sol aigu). */
export function transpose(p: Phrase, toKey: string): Phrase {
  let shift = pc(keyPc(toKey) - keyPc(p.key));
  const mids = p.notes.map(n => n.midi), lo = Math.min(...mids) + shift, hi = Math.max(...mids) + shift;
  if (hi > 55 && lo - 12 >= 28) shift -= 12;
  const notes = p.notes.map(n => { const midi = n.midi + shift, t = retab(midi); return { ...n, midi, ...t }; });
  return { ...p, key: toKey, notes };
}
export const keyName = (k: string, notation: 'fr' | 'en' = 'en') => (notation === 'en' ? k : (k.replace('C', 'Do').replace('D', 'Ré').replace('E', 'Mi').replace('F', 'Fa').replace('G', 'Sol').replace('A', 'La').replace('B', 'Si')));

export function phraseGrid(p: Phrase): Grid | null { return progressionToGrid(p.grid, p.key) ?? parseGrid(p.grid); }
export function toPattern(p: Phrase): GroovePattern {
  const events: Ev[] = p.notes.map(n => ({ beat: n.beat, kind: 'note', midi: n.midi }));
  return { id: p.id, name: p.name, hint: p.tip, events, section: 'technique' };
}
export const toBars = (notes: PNote[], bars: number): string[] => Array.from({ length: bars }, (_, i) => notes.filter(n => n.beat >= i * 4 && n.beat < (i + 1) * 4)
  .map(n => `${+(n.beat - i * 4).toFixed(3)}:${['E', 'A', 'D', 'G'][n.string]}${n.fret}:${+n.dur.toFixed(3)}`).join(' '));

export interface CapturedNote { t: number; midi: number | null }
/** Capture audio → phrase : quantifie les attaques sur la double croche, durée = jusqu'à la note suivante. */
export function quantizeCapture(ons: CapturedNote[], startT: number, bpm: number, bars: number, step = 0.25): PNote[] {
  const bd = 60 / bpm, total = bars * 4; const raw: { beat: number; midi: number }[] = [];
  for (const o of ons) { if (o.midi === null) continue; const b = Math.round(((o.t - startT) / bd) / step) * step; if (b < 0 || b >= total) continue; if (raw.length && raw[raw.length - 1].beat === b) continue; raw.push({ beat: b, midi: o.midi }); }
  return raw.map((n, i) => { const nxt = i + 1 < raw.length ? raw[i + 1].beat : total; const bar = Math.floor(n.beat / 4); const dur = Math.min(nxt, (bar + 1) * 4) - n.beat; return { beat: n.beat, midi: n.midi, ...retab(n.midi), dur: Math.max(step, dur * 0.9) }; });
}

export function validate(p: Phrase): string[] {
  const errs: string[] = []; const g = phraseGrid(p);
  if (!g) return ['grille invalide'];
  if (g.bars.length !== p.bars) errs.push(`grille de ${g.bars.length} mesure(s) mais ${p.bars} mesure(s) de notes`);
  p.notes.forEach(n => { if (n.fret > 12 || n.fret < 0) errs.push(`case ${n.fret} hors 0-12`); if (n.beat % 4 + n.dur > 4.0001) errs.push(`note qui déborde de la mesure (${n.beat})`); });
  return errs;
}
export function harmonicShare(p: Phrase): { chord: number; passing: number; avoidStrong: number } {
  const g = phraseGrid(p)!; let c = 0, ps = 0, av = 0;
  for (const n of p.notes) { const bar = Math.floor(n.beat / 4), role = noteRole(pc(n.midi), g.bars[bar][0].chord);
    if (['root', 'third', 'fifth', 'seventh'].includes(role)) c++; else if (role === 'passing') ps++; else if (role === 'avoid' && Number.isInteger(n.beat) && n.dur >= 1) av++; }
  return { chord: c / p.notes.length, passing: ps / p.notes.length, avoidStrong: av };
}
/** Part des notes appartenant à l'accord ∪ gamme blues + tierce majeure + sixte de la tonalité (idiome du blues et du rock). */
export function bluesShare(p: Phrase): number {
  const k = keyPc(p.key), blues = [0, 3, 4, 5, 6, 7, 9, 10].map(x => pc(k + x)), g = phraseGrid(p)!;
  return p.notes.filter(n => blues.includes(pc(n.midi)) || ['root', 'third', 'fifth', 'seventh'].includes(noteRole(pc(n.midi), g.bars[Math.floor(n.beat / 4)][0].chord))).length / p.notes.length;
}
void noteNameForKey;
