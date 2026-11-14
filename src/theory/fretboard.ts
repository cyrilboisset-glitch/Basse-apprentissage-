import { pc } from './scales';
export interface Pos { string: number; fret: number; midi: number }

/** `tuning` : MIDI des cordes à vide, du grave (index 0) à l'aigu. */
export function allPositions(tuning: number[], frets: number): Pos[] {
  const out: Pos[] = [];
  tuning.forEach((open, string) => { for (let fret = 0; fret <= frets; fret++) out.push({ string, fret, midi: open + fret }); });
  return out;
}
export const positionsOfPc = (tuning: number[], frets: number, p: number, from = 0, to = frets) =>
  allPositions(tuning, frets).filter(x => pc(x.midi) === pc(p) && x.fret >= from && x.fret <= to);
export const positionsOfMidi = (tuning: number[], frets: number, midi: number) =>
  allPositions(tuning, frets).filter(x => x.midi === midi);

export const ZONES: { id: string; label: string; from: number; to: number }[] = [
  { id: 'z0', label: 'Cases 0-5', from: 0, to: 5 }, { id: 'z1', label: 'Cases 5-9', from: 5, to: 9 },
  { id: 'z2', label: 'Cases 9-12', from: 9, to: 12 }, { id: 'z3', label: 'Cases 12-17', from: 12, to: 17 },
  { id: 'z4', label: 'Tout le manche', from: 0, to: 24 },
];

/** Positions « boîte » d'une gamme : 4 cases de large autour d'une case de départ sur la corde la plus grave. */
export function scalePosition(tuning: number[], rootPc: number, steps: number[], fromFret: number, width = 4) {
  const set = new Set(steps.map(s => pc(rootPc + s)));
  return allPositions(tuning, fromFret + width).filter(p => p.fret >= fromFret && p.fret <= fromFret + width && set.has(pc(p.midi)));
}
