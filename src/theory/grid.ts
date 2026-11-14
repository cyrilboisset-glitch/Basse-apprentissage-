import { parseChord, parseRoot, type Chord } from './chords';
import { pc } from './scales';

export interface GridChord { chord: Chord; beats: number }
export interface Grid { bars: GridChord[][]; beatsPerBar: number }

/** « Am7 | D7 | Gmaj7 Em7 | Gmaj7 » : accords séparés par espace dans une mesure = partage des temps. */
export function parseGrid(text: string, beatsPerBar = 4): Grid | null {
  const bars: GridChord[][] = [];
  for (const raw of text.split(/[|\n]/)) {
    const syms = raw.trim().split(/\s+/).filter(Boolean);
    if (!syms.length) continue;
    const chords: GridChord[] = [];
    for (const s of syms) {
      const sym = s === '%' && bars.length ? bars[bars.length - 1][0].chord.symbol : s;
      const c = parseChord(sym); if (!c) return null;
      chords.push({ chord: c, beats: beatsPerBar / syms.length });
    }
    bars.push(chords);
  }
  return bars.length ? { bars, beatsPerBar } : null;
}

const DEG: Record<string, number> = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
/** « ii V7 Imaj7 » dans la tonalité `keyPc` → symboles d'accords. */
export function romanToChord(roman: string, keyPc: number): string | null {
  const m = /^(b|#)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)$/.exec(roman);
  if (!m) return null;
  const upper = m[2] === m[2].toUpperCase();
  let root = DEG[m[2].toUpperCase()] + (m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0);
  root = pc(root + keyPc);
  let suf = m[3].replace('ø', 'm7b5').replace('°', 'dim');
  if (!upper && !suf.startsWith('m') && !suf.startsWith('dim')) suf = 'm' + suf; // minuscule = mineur (vi7 → m7)
  if (upper && suf === 'M7') suf = 'maj7';
  return NOTE_SHARP[root] + suf;
}
const NOTE_SHARP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const noteNameForKey = (p: number) => NOTE_SHARP[pc(p)];

export function progressionToGrid(romans: string, key: string, beatsPerBar = 4): Grid | null {
  const k = parseRoot(key); if (!k) return null;
  const parts = romans.split('|').map(bar => bar.trim().split(/\s+/).map(r => romanToChord(r, k.pc)));
  if (parts.some(p => p.some(x => x === null))) return null;
  return parseGrid(parts.map(p => p.join(' ')).join(' | '), beatsPerBar);
}

export interface GridPreset { id: string; name: string; romans: string; style?: string }
export const GRID_PRESETS: GridPreset[] = [
  { id: 'blues12', name: 'Blues 12 mesures', romans: 'I7 | IV7 | I7 | I7 | IV7 | IV7 | I7 | I7 | V7 | IV7 | I7 | V7', style: 'blues' },
  { id: 'blues12q', name: 'Blues 12 mesures (quick change)', romans: 'I7 | IV7 | I7 | I7 | IV7 | IV7 | I7 | I7 | V7 | IV7 | I7 | I7', style: 'blues' },
  { id: 'I-IV-V', name: 'I – IV – V', romans: 'I | IV | V | I' },
  { id: 'ii-V-I', name: 'II – V – I (majeur)', romans: 'ii7 | V7 | Imaj7 | Imaj7', style: 'jazz' },
  { id: 'I-vi-ii-V', name: 'I – VI – II – V', romans: 'Imaj7 | vi7 | ii7 | V7', style: 'jazz' },
  { id: 'I-V-vi-IV', name: 'Boucle pop I – V – vi – IV', romans: 'I | V | vi | IV', style: 'pop' },
  { id: 'vi-IV-I-V', name: 'vi – IV – I – V', romans: 'vi | IV | I | V', style: 'pop' },
  { id: 'funk-i7-IV7', name: 'Funk i7 – IV7', romans: 'i7 | i7 | IV7 | IV7', style: 'funk' },
  { id: 'rock-I-bVII-IV', name: 'Rock I – bVII – IV', romans: 'I | bVII | IV | I', style: 'rock' },
  { id: 'soul', name: 'Soul I – vi – IV – V', romans: 'I | vi | IV | V', style: 'soul' },
  { id: 'reggae', name: 'Reggae I – IV', romans: 'I | IV | I | V', style: 'reggae' },
  { id: 'bossa', name: 'Bossa ii – V – I – vi', romans: 'ii7 | V7 | Imaj7 | vi7', style: 'bossa' },
  { id: 'minor-i-iv-v', name: 'Mineur i – iv – V', romans: 'i7 | iv7 | V7 | i7', style: 'blues' },
];
