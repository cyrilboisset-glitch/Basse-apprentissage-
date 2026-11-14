import { pc } from './scales';

export interface ChordQuality { id: string; suffix: string; steps: number[]; scale: string; avoid: number[] }
// `avoid` : intervalles (depuis la fondamentale) à éviter en tenue sur cet accord.
export const QUALITIES: ChordQuality[] = [
  { id: 'maj', suffix: '', steps: [0, 4, 7], scale: 'major', avoid: [5] },
  { id: 'm', suffix: 'm', steps: [0, 3, 7], scale: 'dorian', avoid: [8] },
  { id: '7', suffix: '7', steps: [0, 4, 7, 10], scale: 'mixolydian', avoid: [5] },
  { id: 'maj7', suffix: 'maj7', steps: [0, 4, 7, 11], scale: 'major', avoid: [5] },
  { id: 'm7', suffix: 'm7', steps: [0, 3, 7, 10], scale: 'dorian', avoid: [8] },
  { id: 'm7b5', suffix: 'm7b5', steps: [0, 3, 6, 10], scale: 'locrian', avoid: [1] },
  { id: 'dim7', suffix: 'dim7', steps: [0, 3, 6, 9], scale: 'chromatic', avoid: [] },
  { id: 'dim', suffix: 'dim', steps: [0, 3, 6], scale: 'locrian', avoid: [1] },
  { id: 'sus4', suffix: 'sus4', steps: [0, 5, 7], scale: 'mixolydian', avoid: [] },
  { id: '6', suffix: '6', steps: [0, 4, 7, 9], scale: 'major', avoid: [5] },
  { id: 'm6', suffix: 'm6', steps: [0, 3, 7, 9], scale: 'dorian', avoid: [8] },
  { id: 'aug', suffix: 'aug', steps: [0, 4, 8], scale: 'major', avoid: [] },
];
const SUFFIX_ALIASES: Record<string, string> = { 'min': 'm', '-': 'm', 'M7': 'maj7', 'Δ': 'maj7', 'ø': 'm7b5', '°': 'dim', '°7': 'dim7', 'mi7': 'm7', 'min7': 'm7', 'dom7': '7' };

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FR: Record<string, string> = { Do: 'C', Ré: 'D', Re: 'D', Mi: 'E', Fa: 'F', Sol: 'G', La: 'A', Si: 'B' };

export function parseRoot(s: string): { pc: number; rest: string } | null {
  let name = s, letter: string | undefined;
  for (const fr of Object.keys(FR).sort((a, b) => b.length - a.length)) if (s.startsWith(fr)) { letter = FR[fr]; name = s.slice(fr.length); break; }
  if (!letter) { if (!/^[A-G]/.test(s)) return null; letter = s[0]; name = s.slice(1); }
  let p = LETTERS[letter];
  if (name[0] === '#') { p++; name = name.slice(1); } else if (name[0] === 'b') { p--; name = name.slice(1); }
  return { pc: pc(p), rest: name };
}

export interface Chord { symbol: string; root: number; quality: ChordQuality; bass: number }
export function parseChord(symbol: string): Chord | null {
  const [main, slash] = symbol.trim().split('/');
  const r = parseRoot(main); if (!r) return null;
  const suffix = SUFFIX_ALIASES[r.rest] ?? r.rest;
  const q = QUALITIES.find(x => x.suffix === suffix); if (!q) return null;
  let bass = r.pc;
  if (slash) { const b = parseRoot(slash); if (b) bass = b.pc; }
  return { symbol: symbol.trim(), root: r.pc, quality: q, bass };
}
export const chordNotes = (c: Chord) => c.quality.steps.map(s => pc(c.root + s));

export type NoteRole = 'root' | 'third' | 'fifth' | 'seventh' | 'extension' | 'avoid' | 'passing';
/** Fonction d'une note (classe de hauteur) par rapport à l'accord en cours. */
export function noteRole(note: number, c: Chord): NoteRole {
  const i = pc(note - c.root);
  const { steps } = c.quality;
  if (i === 0) return 'root';
  if (steps.includes(i)) {
    if (i === 3 || i === 4 || (i === 5 && c.quality.id === 'sus4')) return 'third';
    if (i === 6 || i === 7 || i === 8) return 'fifth';
    return 'seventh'; // 9 (dim7/6), 10, 11
  }
  if (c.quality.avoid.includes(i)) return 'avoid';
  const scale = c.quality.scale === 'chromatic' ? [] : scaleSteps(c.quality.scale);
  return scale.includes(i) ? 'extension' : 'passing';
}
import { getScale } from './scales';
const scaleSteps = (id: string) => getScale(id).steps;

export const isChordTone = (note: number, c: Chord) => c.quality.steps.includes(pc(note - c.root));

export const ARPEGGIOS = QUALITIES.filter(q => ['maj', 'm', '7', 'maj7', 'm7', 'm7b5', 'dim7', 'sus4', '6'].includes(q.id));
