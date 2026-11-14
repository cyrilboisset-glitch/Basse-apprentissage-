export type Voice = 'kick' | 'snare' | 'ghost' | 'hat' | 'hatOpen' | 'ride' | 'rim' | 'tamb' | 'keys' | 'gtr' | 'organ';
export interface Hit { s: number; d: number; v?: number }
export interface StyleDef {
  id: string; name: string; bpm: number; swing: number; grid: 16 | 12; bpmRange: [number, number];
  drums: Partial<Record<Exclude<Voice, 'keys' | 'gtr' | 'organ'>, number[]>>;
  keys?: Hit[]; gtr?: Hit[]; organ?: Hit[];
  gtrVoicing?: 'power' | 'triad'; defaultGrid: string; defaultKey: string;
}
const range = (n: number, step = 1, from = 0) => Array.from({ length: Math.floor((n - from) / step) }, (_, i) => from + i * step);
const h = (steps: number[], d = 1, v = 0.8): Hit[] => steps.map(s => ({ s, d, v }));

export const STYLES: StyleDef[] = [
  { id: 'blues-shuffle', name: 'Blues shuffle', bpm: 100, swing: 0, grid: 12, bpmRange: [70, 150], defaultGrid: 'blues12', defaultKey: 'A',
    drums: { kick: [0, 6], snare: [3, 9], hat: [0, 2, 3, 5, 6, 8, 9, 11] }, organ: [{ s: 0, d: 12, v: 0.5 }], gtr: h([0, 2, 3, 5, 6, 8, 9, 11], 1, 0.55), gtrVoicing: 'power' },
  { id: 'blues-slow', name: 'Blues lent (12/8)', bpm: 58, swing: 0, grid: 12, bpmRange: [40, 80], defaultGrid: 'blues12', defaultKey: 'E',
    drums: { kick: [0, 6], snare: [3, 9], hat: [0, 3, 6, 9], ghost: [] }, organ: [{ s: 0, d: 12, v: 0.55 }], keys: h(range(12), 2, 0.35) },
  { id: 'funk', name: 'Funk', bpm: 98, swing: 0, grid: 16, bpmRange: [80, 120], defaultGrid: 'funk-i7-IV7', defaultKey: 'E',
    drums: { kick: [0, 3, 10], snare: [4, 12], ghost: [7, 9, 15], hat: range(16) }, keys: h([2, 7, 10, 14], 1, 0.7), gtr: h([0, 3, 4, 7, 8, 11, 12, 15], 1, 0.45), gtrVoicing: 'triad' },
  { id: 'rock', name: 'Rock', bpm: 120, swing: 0, grid: 16, bpmRange: [90, 170], defaultGrid: 'rock-I-bVII-IV', defaultKey: 'E',
    drums: { kick: [0, 8, 10], snare: [4, 12], hat: range(16, 2) }, gtr: h(range(16, 2), 2, 0.7), gtrVoicing: 'power' },
  { id: 'pop', name: 'Pop', bpm: 110, swing: 0, grid: 16, bpmRange: [80, 140], defaultGrid: 'I-V-vi-IV', defaultKey: 'C',
    drums: { kick: [0, 8, 10], snare: [4, 12], hat: range(16, 2) }, keys: [{ s: 0, d: 8, v: 0.55 }, { s: 8, d: 8, v: 0.55 }], gtr: h(range(16, 4, 2), 2, 0.4), gtrVoicing: 'triad' },
  { id: 'reggae', name: 'Reggae', bpm: 76, swing: 0, grid: 16, bpmRange: [60, 100], defaultGrid: 'reggae', defaultKey: 'G',
    drums: { kick: [8], rim: [8], hat: range(16, 2) }, keys: h([2, 6, 10, 14], 1, 0.7), gtr: h([2, 6, 10, 14], 1, 0.5), gtrVoicing: 'triad' },
  { id: 'bossa', name: 'Bossa nova', bpm: 124, swing: 0, grid: 16, bpmRange: [90, 160], defaultGrid: 'bossa', defaultKey: 'C',
    drums: { kick: [0, 6, 8, 14], rim: [0, 6, 12], hat: range(16, 2) }, keys: [{ s: 0, d: 5, v: 0.6 }, { s: 6, d: 3, v: 0.5 }, { s: 10, d: 5, v: 0.6 }] },
  { id: 'jazz', name: 'Jazz swing', bpm: 132, swing: 0.66, grid: 16, bpmRange: [80, 220], defaultGrid: 'ii-V-I', defaultKey: 'F',
    drums: { ride: [0, 4, 6, 8, 12, 14], hat: [4, 12], kick: [0, 8], ghost: [10] }, keys: [{ s: 0, d: 3, v: 0.5 }, { s: 6, d: 3, v: 0.5 }, { s: 10, d: 2, v: 0.45 }] },
  { id: 'soul', name: 'Soul / Motown', bpm: 104, swing: 0.2, grid: 16, bpmRange: [70, 130], defaultGrid: 'soul', defaultKey: 'C',
    drums: { kick: [0, 8, 10], snare: [4, 12], tamb: range(16, 2), hat: [0, 4, 8, 12] }, keys: h(range(16, 2), 2, 0.55), gtr: h([2, 6, 10, 14], 1, 0.4), gtrVoicing: 'triad' },
];
export const getStyle = (id: string) => STYLES.find(s => s.id === id) ?? STYLES[0];
