import { chordNotes, type Chord } from '../../theory/chords';
import type { GridChord } from '../../theory/grid';
import { pc } from '../../theory/scales';
import type { StyleDef, Voice } from './styles';

export interface PlanEvent { t: number; voice: Voice; midi?: number[]; dur: number; vel: number; chord?: number }

/** Temps (s) d'un pas dans la mesure : le swing retarde la 2ᵉ croche (pas 2 mod 4 de la grille 16) jusqu'à un tiers de croche. */
export function stepTime(style: StyleDef, step: number, barStart: number, beatDur: number, swing: number): number {
  const spb = style.grid / 4;
  let t = barStart + (step / spb) * beatDur;
  if (style.grid === 16 && step % 4 === 2) t += swing * (beatDur / 6);
  return t;
}
/** Quel accord sonne au pas donné (les accords se partagent les temps dans l'ordre). */
export function chordAtStep(chords: GridChord[], step: number, spb: number): number {
  const beat = step / spb; let acc = 0;
  for (let i = 0; i < chords.length; i++) { acc += chords[i].beats; if (beat < acc - 1e-9) return i; }
  return chords.length - 1;
}
export function voicing(c: Chord, kind: 'keys' | 'triad' | 'power'): number[] {
  const root = pc(c.root);
  if (kind === 'power') { const b = 40 + ((root - 4 + 12) % 12); return [b, b + 7, b + 12]; }
  const base = 55 + ((root - 7 + 12) % 12) - (((root - 7 + 12) % 12) > 5 ? 12 : 0); // racine entre Ré3 et Do#4
  const notes = chordNotes(c).map(p => { let m = base + ((p - root + 12) % 12); return m; });
  return notes.sort((a, b) => a - b);
}

export function planBar(style: StyleDef, chords: GridChord[], barStart: number, bpm: number, swing: number): PlanEvent[] {
  const beatDur = 60 / bpm, spb = style.grid / 4, stepDur = beatDur / spb, out: PlanEvent[] = [];
  const T = (s: number) => stepTime(style, s, barStart, beatDur, swing);
  const velOf = (voice: string, s: number) => (voice === 'hat' ? (s % spb === 0 ? 0.55 : 0.32) : voice === 'ghost' ? 0.25 : voice === 'ride' ? (s % spb === 0 ? 0.6 : 0.4) : voice === 'kick' ? 0.9 : 0.8);
  for (const [voice, steps] of Object.entries(style.drums) as [Voice, number[]][])
    for (const s of steps) out.push({ t: T(s), voice: voice === 'ghost' ? 'ghost' : voice, dur: stepDur, vel: velOf(voice, s) });
  const comp = (voice: 'keys' | 'gtr' | 'organ', hits: { s: number; d: number; v?: number }[] | undefined) => {
    for (const hit of hits ?? []) {
      const ci = chordAtStep(chords, hit.s, spb); const c = chords[ci].chord;
      const midi = voice === 'gtr' ? voicing(c, style.gtrVoicing ?? 'triad') : voicing(c, 'keys');
      out.push({ t: T(hit.s), voice, midi, dur: Math.max(stepDur * 0.9, hit.d * stepDur * 0.92), vel: hit.v ?? 0.6, chord: ci });
    }
  };
  comp('keys', style.keys); comp('gtr', style.gtr); comp('organ', style.organ);
  return out.sort((a, b) => a.t - b.t);
}
