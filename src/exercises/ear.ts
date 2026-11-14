import { INTERVAL_LABELS_FR, pc } from '../theory/scales';
import { QUALITIES, type ChordQuality } from '../theory/chords';
import { pickWeighted } from '../storage/srs';
import type { SrsItem } from '../storage/db';

type Rng = () => number;
export interface Choice { id: string; label: string }

// --- Intervalles -----------------------------------------------------------------
export const INTERVAL_LEVELS: number[][] = [[12, 7, 5], [12, 7, 5, 4, 3], [12, 7, 5, 4, 3, 2, 9, 10, 11, 6, 8, 1]];
export const intervalChoices = (level: number): Choice[] => [...INTERVAL_LEVELS[Math.min(level, 2)]].sort((a, b) => a - b).map(s => ({ id: String(s), label: INTERVAL_LABELS_FR[s][0].toUpperCase() + INTERVAL_LABELS_FR[s].slice(1) }));
export interface IntervalQ { root: number; semis: number; dir: 'up' | 'down' | 'harm'; answer: string; srsId: string }
export function makeInterval(level: number, srs: Map<string, SrsItem>, rng: Rng = Math.random): IntervalQ {
  const semis = pickWeighted(INTERVAL_LEVELS[Math.min(level, 2)], x => `ear:int:${x}`, srs, rng);
  const dir = (['up', 'down', 'harm'] as const)[Math.floor(rng() * 3)];
  const root = 36 + Math.floor(rng() * 12) + (dir === 'down' ? 12 : 0); // 36-47 (+12 si descendant)
  return { root, semis, dir, answer: String(semis), srsId: `ear:int:${semis}` };
}
export const intervalNotes = (q: IntervalQ) => (q.dir === 'down' ? [q.root, q.root - q.semis] : [q.root, q.root + q.semis]);

// --- Accords ---------------------------------------------------------------------
export const CHORD_LEVELS: string[][] = [['maj', 'm', '7'], ['maj', 'm', '7', 'maj7', 'm7'], ['maj', 'm', '7', 'maj7', 'm7', 'm7b5', 'dim7']];
const CHORD_NAMES: Record<string, string> = { maj: 'Majeur', m: 'Mineur', '7': 'Septième de dominante', maj7: 'Majeur 7', m7: 'Mineur 7', m7b5: 'Demi-diminué', dim7: 'Diminué' };
export const chordChoices = (level: number): Choice[] => CHORD_LEVELS[Math.min(level, 2)].map(id => ({ id, label: CHORD_NAMES[id] }));
export interface ChordQ { root: number; quality: ChordQuality; answer: string; srsId: string; notes: number[] }
export function makeChord(level: number, srs: Map<string, SrsItem>, rng: Rng = Math.random): ChordQ {
  const id = pickWeighted(CHORD_LEVELS[Math.min(level, 2)], x => `ear:chord:${x}`, srs, rng);
  const quality = QUALITIES.find(q => q.id === id)!; const root = 48 + Math.floor(rng() * 12);
  return { root, quality, answer: id, srsId: `ear:chord:${id}`, notes: quality.steps.map(s => root + s) };
}

// --- Degrés ----------------------------------------------------------------------
export const DEGREES = [{ id: 'I', semis: 0, minor: false }, { id: 'ii', semis: 2, minor: true }, { id: 'iii', semis: 4, minor: true }, { id: 'IV', semis: 5, minor: false }, { id: 'V', semis: 7, minor: false }, { id: 'vi', semis: 9, minor: true }];
export const DEGREE_LEVELS: string[][] = [['I', 'IV', 'V'], ['I', 'IV', 'V', 'vi'], ['I', 'ii', 'iii', 'IV', 'V', 'vi']];
export interface DegreeQ { key: number; chords: string[]; ask: number; answer: string; srsId: string }
export function makeDegrees(level: number, srs: Map<string, SrsItem>, rng: Rng = Math.random): DegreeQ {
  const pool = DEGREE_LEVELS[Math.min(level, 2)];
  const chords = Array.from({ length: 4 }, (_, i) => (i === 0 ? 'I' : pool[Math.floor(rng() * pool.length)]));
  const ask = 1 + Math.floor(rng() * 3);
  const cand = chords.map((c, i) => ({ c, i })).filter(x => x.i >= 1);
  const pick = pickWeighted(cand, x => `ear:deg:${x.c}`, srs, rng);
  return { key: Math.floor(rng() * 12), chords, ask: pick.i ?? ask, answer: chords[pick.i], srsId: `ear:deg:${chords[pick.i]}` };
}
/** Notes MIDI de l'accord de degré `id` dans la tonalité `key` (fondamentale grave + tierce, quinte). */
export function degreeChord(id: string, key: number): number[] {
  const d = DEGREES.find(x => x.id === id)!; const root = 48 + pc(key + d.semis);
  return [root, root + (d.minor ? 3 : 4), root + 7];
}

// --- Relevé de ligne -------------------------------------------------------------
const MAJ = [0, 2, 4, 5, 7, 9, 11], MINP = [0, 3, 5, 7, 10];
export interface LineQ { notes: number[]; srsId: string; length: number }
export function makeLine(level: number, srs: Map<string, SrsItem>, rng: Rng = Math.random): LineQ {
  const length = 3 + Math.min(level, 2); const scale = level === 0 ? MINP : MAJ;
  const key = 28 + Math.floor(rng() * 12); // E1 .. D#2
  const pool = scale.flatMap(s => [key + s, key + s + 12]).filter(m => m >= 28 && m <= 52);
  const notes = [key]; let prev = key;
  while (notes.length < length) { const c = pool.filter(m => m !== prev && Math.abs(m - prev) <= 7); const n = c[Math.floor(rng() * c.length)]; notes.push(n); prev = n; }
  void srs; return { notes, srsId: `ear:line:${length}`, length };
}
