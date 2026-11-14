import { pc } from '../theory/scales';
import { midiName, type Notation } from '../audio/notes';
import type { Round } from './manche';
import type { RhythmSpec } from './rhythm';

export type Rng = () => number;
export interface Quiz { q: string; choices: string[]; answer: number }
export interface Built { quiz: Quiz[]; rounds: Round[]; rhythms?: RhythmSpec[] }
export interface Lesson {
  id: string; chapter: 1 | 2 | 3 | 4; title: string; text: string[];
  link?: { href: string; label: string };
  build: (rng: Rng, n: Notation) => Built;
}
export const CHAPTERS: { n: 1 | 2 | 3 | 4; title: string; sub: string }[] = [
  { n: 1, title: 'Bases, gammes et modes', sub: 'Notes, intervalles, gammes, cycle des quintes, modes' },
  { n: 2, title: 'Harmonie : accords et grilles', sub: 'Accords, degrés, fonctions, cadences, blues' },
  { n: 3, title: 'Rythme et solfège rythmique', sub: 'Pulsation, figures, point, syncope, triolets, tablature' },
  { n: 4, title: 'Jeu de basse et styles', sub: 'Rôle, walking, boogie, funk, rock, reggae, batterie' },
];

/** Plus basse note de la basse (≥ Mi grave) de cette classe de hauteur. */
export const low = (p: number) => { let m = 28; while (pc(m) !== pc(p)) m++; return m; };
export const nm = (m: number, n: Notation) => midiName(m, n).name;
export const rnd = (a: number, r: Rng) => Math.floor(r() * a);
export const round = (prompt: string, targets: number[], detail?: string): Round => ({ kind: 'scale', prompt, targets, ordered: true, show: [], detail });
/** Question à choix : la bonne réponse est mélangée parmi les mauvaises. */
export function qz(q: string, good: string, bad: string[], r: Rng): Quiz {
  const c = [good, ...bad];
  for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
  return { q, choices: c, answer: c.indexOf(good) };
}
export const names = (ms: number[], n: Notation) => ms.map(m => nm(m, n)).join(' – ');
