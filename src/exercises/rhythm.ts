import type { Ev, GroovePattern } from './groove';

/** Un rythme à lire puis à jouer : durées en temps (négatif = silence). */
export interface RhythmSpec { name: string; bpb: number; bpm: number; durs: number[]; bars: number; compound?: boolean; hint?: string }
export const rhy = (name: string, bpb: number, durs: number[], opts: { bpm?: number; bars?: number; compound?: boolean; hint?: string } = {}): RhythmSpec =>
  ({ name, bpb, durs, bpm: opts.bpm ?? 70, bars: opts.bars ?? 4, compound: opts.compound, hint: opts.hint });

const EPS = 1e-6;
export interface Slot { start: number; dur: number; rest: boolean }
/** Positions (en temps) de chaque note et silence de la mesure. */
export function slots(spec: RhythmSpec): Slot[] {
  const out: Slot[] = []; let t = 0;
  for (const d of spec.durs) { out.push({ start: t, dur: Math.abs(d), rest: d < 0 }); t += Math.abs(d); }
  return out;
}
export const totalBeats = (spec: RhythmSpec) => spec.durs.reduce((a, d) => a + Math.abs(d), 0);
/** Un rythme est valide quand ses durées remplissent exactement la mesure. */
export const isFull = (spec: RhythmSpec) => Math.abs(totalBeats(spec) - spec.bpb) < EPS;
export const onsets = (spec: RhythmSpec) => slots(spec).filter(s => !s.rest).map(s => +s.start.toFixed(4));

/** Syllabe de comptage d'une position : 1, e, +, a (subdivisions en 4) ou 1, la, li (triolets). */
export function countSyllable(pos: number): string {
  const n = Math.floor(pos + EPS) + 1, f = pos - Math.floor(pos + EPS);
  const near = (x: number) => Math.abs(f - x) < 1e-3;
  if (near(0)) return String(n);
  if (near(0.5)) return '+';
  if (near(0.25)) return 'e';
  if (near(0.75)) return 'a';
  if (near(1 / 3)) return 'la';
  if (near(2 / 3)) return 'li';
  return '';
}
const NAMES: [number, string, string][] = [[4, 'ronde', 'pause'], [3, 'blanche pointée', 'silence de 3 temps'], [2, 'blanche', 'demi-pause'], [1.5, 'noire pointée', 'soupir pointé'], [1, 'noire', 'soupir'],
  [0.75, 'croche pointée', 'demi-soupir pointé'], [0.5, 'croche', 'demi-soupir'], [0.25, 'double croche', 'quart de soupir']];
const NAMES_COMPOUND: [number, string, string][] = [[2, 'blanche pointée', 'silence de 2 pulsations'], [1, 'noire pointée', 'soupir pointé'], [2 / 3, 'noire', 'soupir'], [1 / 3, 'croche', 'demi-soupir']];
export function durName(d: number, rest: boolean, compound = false): string {
  const t = compound ? NAMES_COMPOUND : NAMES; const hit = t.find(([v]) => Math.abs(v - d) < 1e-3);
  if (hit) return rest ? hit[2] : hit[1];
  if (Math.abs(d - 1 / 3) < 1e-3) return rest ? 'silence de triolet' : 'croche de triolet';
  if (Math.abs(d - 2 / 3) < 1e-3) return rest ? 'silence' : 'croche swing';
  return rest ? 'silence' : 'note';
}
/** Pour l'analyse de mise en place (mêmes outils que le module Groove). */
export function toPattern(spec: RhythmSpec): GroovePattern {
  const events: Ev[] = onsets(spec).map(beat => ({ beat, kind: 'note' as const }));
  return { id: 'lesson-' + spec.name, name: spec.name, hint: spec.hint ?? '', events, section: 'rythme' };
}
