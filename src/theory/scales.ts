export interface ScaleDef { id: string; name: string; steps: number[] }
export const SCALES: ScaleDef[] = [
  { id: 'major', name: 'Majeure (ionien)', steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'dorian', name: 'Dorien', steps: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', name: 'Phrygien', steps: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', name: 'Lydien', steps: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', name: 'Mixolydien', steps: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'minor', name: 'Mineure naturelle (éolien)', steps: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'locrian', name: 'Locrien', steps: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'majorPent', name: 'Pentatonique majeure', steps: [0, 2, 4, 7, 9] },
  { id: 'minorPent', name: 'Pentatonique mineure', steps: [0, 3, 5, 7, 10] },
  { id: 'blues', name: 'Blues', steps: [0, 3, 5, 6, 7, 10] },
  { id: 'melodicMinor', name: 'Mineure mélodique', steps: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'harmonicMinor', name: 'Mineure harmonique', steps: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'chromatic', name: 'Chromatique', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];
export const getScale = (id: string) => SCALES.find(s => s.id === id) ?? SCALES[0];

export const INTERVAL_NAMES = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
export const INTERVAL_LABELS_FR = ['unisson', 'seconde mineure', 'seconde majeure', 'tierce mineure', 'tierce majeure', 'quarte', 'triton', 'quinte', 'sixte mineure', 'sixte majeure', 'septième mineure', 'septième majeure', 'octave'];

export const pc = (n: number) => ((n % 12) + 12) % 12;
export const scaleNotes = (rootPc: number, id: string) => getScale(id).steps.map(s => pc(rootPc + s));
