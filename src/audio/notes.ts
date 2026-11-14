export type Notation = 'fr' | 'en';
const NAMES: Record<Notation, string[]> = {
  en: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  fr: ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
};

/** Numéro MIDI (flottant) d'une fréquence. */
export const freqToMidi = (f: number, refA = 440) => 69 + 12 * Math.log2(f / refA);
export const midiToFreq = (m: number, refA = 440) => refA * Math.pow(2, (m - 69) / 12);

export interface NoteInfo { midi: number; name: string; octave: number; cents: number }

export function describeFreq(f: number, refA = 440, notation: Notation = 'fr'): NoteInfo {
  const m = freqToMidi(f, refA);
  const midi = Math.round(m);
  return { midi, ...midiName(midi, notation), cents: (m - midi) * 100 };
}
export function midiName(midi: number, notation: Notation = 'fr') {
  return { name: NAMES[notation][((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1 };
}

export interface Tuning { id: string; label: string; midi: number[] } // du grave à l'aigu
export const TUNINGS: Tuning[] = [
  { id: 'standard4', label: '4 cordes standard (Mi La Ré Sol)', midi: [28, 33, 38, 43] },
  { id: 'standard5', label: '5 cordes (Si Mi La Ré Sol)', midi: [23, 28, 33, 38, 43] },
  { id: 'dropD', label: 'Drop D', midi: [26, 33, 38, 43] },
  { id: 'halfDown', label: 'Un demi-ton plus bas', midi: [27, 32, 37, 42] },
];
let CUSTOM: number[] = [28, 33, 38, 43];
/** Accordage personnalisé (du grave à l'aigu), tenu à jour depuis les réglages. */
export const setCustomTuning = (m: number[]) => { if (m.length >= 4 && m.length <= 6) CUSTOM = [...m]; };
export const allTunings = (): Tuning[] => [...TUNINGS, { id: 'custom', label: 'Personnalisé', midi: CUSTOM }];
export const getTuning = (id: string): Tuning => allTunings().find(t => t.id === id) ?? TUNINGS[0];
