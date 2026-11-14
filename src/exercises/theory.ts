import { QUALITIES } from '../theory/chords';
import { getScale, pc } from '../theory/scales';
import type { Notation } from '../audio/notes';
import { midiName } from '../audio/notes';
import type { Round } from './manche';

export interface Quiz { q: string; choices: string[]; answer: number }
export interface Lesson { id: string; title: string; text: string[]; link?: { href: string; label: string }; build: (rng: () => number, n: Notation) => { quiz: Quiz[]; rounds: Round[] } }
const low = (p: number) => { let m = 28; while (pc(m) !== pc(p)) m++; return m; };
const nm = (m: number, n: Notation) => midiName(m, n).name;
const rnd = (a: number, r: () => number) => Math.floor(r() * a);
const round = (prompt: string, targets: number[]): Round => ({ kind: 'scale', prompt, targets, ordered: true, show: [] });
const SCALE_NAME: Record<string, string> = { major: 'Majeure (ionien)', dorian: 'Dorien', mixolydian: 'Mixolydien', locrian: 'Locrien' };

export const LESSONS: Lesson[] = [
  { id: 'chords', title: 'Construire accords et arpèges',
    text: ['Un accord se construit en empilant des tierces à partir de la fondamentale. Majeur : tierce majeure (4 demi-tons) + quinte juste (7). Mineur : tierce mineure (3) + quinte (7).',
      'Ajoutez la septième mineure (10 demi-tons) : c’est la septième de dominante (accord « 7 »). Un arpège, c’est simplement jouer ces notes l’une après l’autre.',
      'À la basse, l’arpège est votre outil n°1 : fondamentale, tierce, quinte, puis retour.'],
    build: (r, n) => { const rt = rnd(12, r); const R = low(rt);
      return { quiz: [{ q: 'Combien de demi-tons entre la fondamentale et la tierce d’un accord MINEUR ?', choices: ['3', '4', '5'], answer: 0 }, { q: 'Quelle note ajoute-t-on à un accord majeur pour obtenir un accord de 7e de dominante ?', choices: ['Septième majeure', 'Septième mineure', 'Sixte'], answer: 1 }],
        rounds: [round(`Arpège ${nm(R, n)} majeur : fondamentale, tierce, quinte`, [R, R + 4, R + 7]), round(`Arpège ${nm(R, n)} mineur : fondamentale, tierce, quinte`, [R, R + 3, R + 7]), round(`Arpège ${nm(R, n)}7 : fondamentale, tierce, quinte, septième`, [R, R + 4, R + 7, R + 10])] }; } },
  { id: 'scale-chord', title: 'Quelle gamme sur quel accord ?',
    text: ['Chaque accord « appelle » une gamme qui contient ses notes. Accord majeur ou maj7 : gamme majeure (ionien). Accord mineur 7 : dorien. Accord de septième de dominante : mixolydien. Accord m7b5 : locrien.',
      'Règle pratique : jouez des notes de l’accord sur les temps forts, et des notes de la gamme entre les deux.'],
    build: (r, n) => { const rt = rnd(12, r); const R = low(rt); const picks = ['maj7', 'm7', '7', 'm7b5'].map(id => QUALITIES.find(q => q.id === id)!);
      const mk = (q: typeof picks[number]): Quiz => { const names = Object.values(SCALE_NAME); const ans = SCALE_NAME[q.scale]; return { q: `Quelle gamme sur un accord ${nm(R, n)}${q.suffix} ?`, choices: names, answer: names.indexOf(ans) }; };
      const sc = getScale('dorian').steps;
      return { quiz: [mk(picks[1]), mk(picks[2]), mk(picks[3])], rounds: [round(`Gamme dorienne de ${nm(R, n)} (une octave, en montant)`, [...sc.map(s => R + s), R + 12])] }; } },
  { id: 'degrees', title: 'Degrés et grilles courantes',
    text: ['Les degrés numérotent les accords d’une tonalité : I (tonique), IV (sous-dominante), V (dominante). Une grille comme « I – IV – V » se transpose dans toutes les tonalités.',
      'Grilles à connaître : blues 12 mesures (I – IV – I – V – IV – I), II – V – I (jazz), I – VI – II – V, et la boucle pop I – V – vi – IV.'],
    build: (r, n) => { const k = rnd(12, r); const I = low(k), IV = low(k + 5), V = low(k + 7); return { quiz: [{ q: 'Dans une grille de blues, sur quel degré joue-t-on la 5e mesure ?', choices: ['I', 'IV', 'V'], answer: 1 }, { q: 'II – V – I en Do : quel est l’accord du V ?', choices: ['Sol', 'Fa', 'Ré mineur'], answer: 0 }],
      rounds: [round(`Fondamentales de I – IV – V – I en ${nm(I, n)} : ${nm(I, n)}, ${nm(IV, n)}, ${nm(V, n)}, ${nm(I, n)}`, [I, IV, V, I])] }; } },
  { id: 'targets', title: 'Notes cibles et notes de passage',
    text: ['Une note cible est la note sur laquelle vous voulez arriver au prochain accord : souvent la tierce (elle dit « majeur » ou « mineur »). Une note de passage relie deux notes d’accord, sur un temps faible.',
      'Entraînez-vous à enchaîner : fondamentale de l’accord, puis tierce du suivant.'],
    build: (r, n) => { const k = rnd(12, r); const ch = [[0, 4], [7, 4], [9, 3], [5, 4]].map(([o, t]) => [low(k + o), low(k + o) + t]); const seq = ch.flat();
      return { quiz: [{ q: 'Quelle note vaut mieux jouer sur le temps 1 d’un changement d’accord ?', choices: ['Une note de passage', 'Une note de l’accord (fondamentale ou tierce)', 'Une note hors gamme'], answer: 1 }], rounds: [round(`Boucle I – V – vi – IV : fondamentale puis tierce de chaque accord`, seq)] }; } },
  { id: 'approach', title: 'Approches chromatiques et diatoniques',
    text: ['Une approche est une note qui « glisse » vers la cible : un demi-ton dessous ou dessus (chromatique), ou la note voisine de la gamme (diatonique). On la place juste avant la cible, sur un temps faible.',
      'Le dernier temps de la mesure est idéal pour annoncer le prochain accord.'],
    build: (r, n) => { const k = rnd(12, r); const ts = [0, 5, 7].map(o => low(k + o) + 12); return { quiz: [{ q: 'Une approche chromatique par dessous vers un Sol est…', choices: ['Fa', 'Fa#', 'La'], answer: 1 }],
      rounds: [round(`Approche par dessous : ${ts.map(t => `${nm(t - 1, n)} → ${nm(t, n)}`).join(' ; ')}`, ts.flatMap(t => [t - 1, t]))] }; } },
  { id: 'role', title: 'Le rôle de la basse',
    text: ['La basse fait le lien entre l’harmonie (les accords) et le rythme (la batterie). Au temps 1, jouez la fondamentale : tout le groupe s’appuie dessus. Calez votre grosse caisse avec celle du batteur.',
      'Entre les accords, reliez-les : notes de passage, approches. Et laissez des silences : ce que vous ne jouez pas compte autant.'],
    link: { href: '#/impro', label: 'Faire l’exercice « Une seule note » (Impro)' },
    build: () => ({ quiz: [{ q: 'Quelle note joue-t-on en priorité au temps 1 ?', choices: ['La fondamentale', 'La septième', 'Une note de passage'], answer: 0 }, { q: 'La basse relie surtout…', choices: ['La mélodie et la voix', 'Le rythme et l’harmonie', 'La guitare et le clavier'], answer: 1 }], rounds: [] }) },
];
export const getLesson = (id: string) => LESSONS.find(l => l.id === id)!;
