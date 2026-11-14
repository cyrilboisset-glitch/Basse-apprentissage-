import { QUALITIES } from '../theory/chords';
import { getScale } from '../theory/scales';
import { type Lesson, low, nm, rnd, round, qz, names } from './theory-kit';

const SCALE_NAME: Record<string, string> = { major: 'Majeure (ionien)', dorian: 'Dorien', mixolydian: 'Mixolydien', locrian: 'Locrien' };
const scaleRound = (label: string, R: number, steps: number[], n: 'fr' | 'en') => round(`${label} de ${nm(R, n)} : ${names(steps.map(s => R + s), n)}`, steps.map(s => R + s));

/** Chapitre 1 — Bases, gammes et modes. */
export const BASES: Lesson[] = [
  { id: 'notes', chapter: 1, title: 'Les notes et les altérations',
    text: ['Il y a 7 notes naturelles : Do, Ré, Mi, Fa, Sol, La, Si. Entre elles, 5 notes « altérées » complètent l’octave, soit 12 notes au total. Un dièse (#) monte d’un demi-ton ; un bémol (b) le descend.',
      'Do# et Réb sont la même touche : c’est une enharmonie. Sur le manche, chaque case est un demi-ton : en montant d’une case, vous passez à la note suivante des 12.'],
    build: (r, n) => { const R = low(rnd(12, r)); return { quiz: [
      qz('Combien y a-t-il de notes différentes dans une octave ?', '12', ['7', '8', '10'], r),
      qz('Do dièse est la même note que…', 'Ré bémol', ['Do bémol', 'Ré dièse', 'Si dièse'], r),
      qz('Que fait un bémol ?', 'Il baisse la note d’un demi-ton', ['Il monte la note d’un demi-ton', 'Il monte la note d’un ton', 'Il double sa durée'], r)],
      rounds: [round(`Montez case par case, 5 demi-tons de suite à partir de ${nm(R, n)} : ${names([R, R + 1, R + 2, R + 3, R + 4], n)}`, [R, R + 1, R + 2, R + 3, R + 4])] }; } },
  { id: 'tones', chapter: 1, title: 'Tons et demi-tons',
    text: ['Un demi-ton est la plus petite distance : une case. Un ton fait deux demi-tons : deux cases. Entre Mi et Fa, et entre Si et Do, il n’y a qu’un demi-ton (pas de touche entre les deux).',
      'Toutes les gammes sont des suites de tons et de demi-tons. Savoir les compter, c’est savoir construire n’importe quelle gamme sur n’importe quelle note.'],
    build: (r, n) => { const R = low(rnd(12, r)); return { quiz: [
      qz('Combien de demi-tons y a-t-il dans un ton ?', '2', ['1', '3', '4'], r),
      qz('Entre quelles notes naturelles n’y a-t-il qu’un demi-ton ?', 'Mi et Fa', ['Do et Ré', 'Fa et Sol', 'La et Si'], r),
      qz('Du La au Si, on monte de…', 'un ton', ['un demi-ton', 'deux tons', 'trois demi-tons'], r)],
      rounds: [round(`Un ton, puis un demi-ton, puis un ton, depuis ${nm(R, n)} : ${names([R, R + 2, R + 3, R + 5], n)}`, [R, R + 2, R + 3, R + 5])] }; } },
  { id: 'major', chapter: 1, title: 'La gamme majeure',
    text: ['La gamme majeure suit toujours le même schéma : ton, ton, demi-ton, ton, ton, ton, demi-ton (2-2-1-2-2-2-1 en demi-tons). Do majeur n’a aucune altération : c’est la gamme sans dièse ni bémol.',
      'Les degrés se numérotent de 1 à 7. Les demi-tons tombent entre les degrés 3-4 et 7-8. Sur n’importe quelle fondamentale, ce même schéma donne la gamme majeure correspondante.'],
    build: (r, n) => { const R = low(rnd(12, r)); const st = getScale('major').steps; return { quiz: [
      qz('Quel est le schéma de la gamme majeure ?', 'ton, ton, demi-ton, ton, ton, ton, demi-ton', ['ton, demi-ton, ton, ton, demi-ton, ton, ton', 'demi-ton, ton, ton, ton, demi-ton, ton, ton', 'ton, ton, ton, demi-ton, ton, ton, demi-ton'], r),
      qz('Entre quels degrés la gamme majeure a-t-elle des demi-tons ?', '3-4 et 7-8', ['1-2 et 5-6', '2-3 et 6-7', '4-5 et 7-8'], r),
      qz('Quelles sont les notes de Sol majeur ?', 'Sol La Si Do Ré Mi Fa#', ['Sol La Si Do Ré Mi Fa', 'Sol La Sib Do Ré Mi Fa#', 'Sol La Si Do# Ré Mi Fa#'], r)],
      rounds: [scaleRound('Gamme majeure', R, [...st, 12], n)] }; } },
  { id: 'intervals', chapter: 1, title: 'Les intervalles',
    text: ['Un intervalle est la distance entre deux notes ; on le nomme en comptant les notes, point de départ compris : seconde, tierce, quarte, quinte, sixte, septième, octave.',
      'Qualités : tierce mineure = 3 demi-tons, tierce majeure = 4, quarte juste = 5, quinte juste = 7, septième mineure = 10, septième majeure = 11, octave = 12. Ces repères servent pour construire accords et lignes de basse.'],
    build: (r, n) => { const R = low(rnd(12, r)); return { quiz: [
      qz('Combien de demi-tons dans une quinte juste ?', '7', ['5', '6', '8'], r),
      qz('Combien de demi-tons dans une tierce majeure ?', '4', ['3', '5', '2'], r),
      qz('De Do à Sol, quel intervalle ?', 'Une quinte', ['Une quarte', 'Une tierce', 'Une sixte'], r)],
      rounds: [round(`Fondamentale, tierce majeure, quinte juste, octave depuis ${nm(R, n)} : ${names([R, R + 4, R + 7, R + 12], n)}`, [R, R + 4, R + 7, R + 12])] }; } },
  { id: 'minor', chapter: 1, title: 'La gamme mineure naturelle',
    text: ['La gamme mineure naturelle suit le schéma : ton, demi-ton, ton, ton, demi-ton, ton, ton (2-1-2-2-1-2-2). Sa tierce est mineure (3 demi-tons) : c’est elle qui donne la couleur « triste ».',
      'La relative mineure d’une gamme majeure commence sur son 6e degré et utilise exactement les mêmes notes : La mineur est la relative de Do majeur.'],
    build: (r, n) => { const R = low(rnd(12, r)); const st = getScale('minor').steps; return { quiz: [
      qz('Quelle est la relative mineure de Do majeur ?', 'La mineur', ['Mi mineur', 'Ré mineur', 'Sol mineur'], r),
      qz('Quelle note distingue le plus la gamme mineure de la majeure ?', 'La tierce (3 demi-tons au lieu de 4)', ['La quinte', 'L’octave', 'La seconde'], r),
      qz('Sur quel degré de la gamme majeure commence sa relative mineure ?', 'Le 6e', ['Le 2e', 'Le 3e', 'Le 5e'], r)],
      rounds: [scaleRound('Gamme mineure naturelle', R, [...st, 12], n)] }; } },
  { id: 'fifths', chapter: 1, title: 'Armures et cycle des quintes',
    text: ['Le cycle des quintes classe les tonalités : en montant d’une quinte, on ajoute un dièse. Do (aucune), Sol (1#), Ré (2#), La (3#), Mi (4#)… En montant d’une quarte, on ajoute un bémol : Fa (1b), Sib (2b), Mib (3b).',
      'Les dièses arrivent dans l’ordre Fa Do Sol Ré La Mi Si ; les bémols dans l’ordre inverse. Pour un bassiste, c’est aussi un chemin de fondamentales très courant : les accords s’enchaînent souvent de quinte en quinte.'],
    build: (r, n) => { const R = low(rnd(12, r)); const seq = [R, R + 7, R + 2, R + 9]; return { quiz: [
      qz('Combien de dièses en Ré majeur ?', '2', ['1', '3', '4'], r),
      qz('Combien de bémols en Fa majeur ?', '1', ['2', '0', '3'], r),
      qz('Quelle tonalité majeure a 3 dièses ?', 'La majeur', ['Sol majeur', 'Mi majeur', 'Si majeur'], r)],
      rounds: [round(`Cycle des quintes (montez d’une quinte à chaque fois) : ${names(seq, n)}`, seq)] }; } },
  { id: 'pentatonic', chapter: 1, title: 'Les pentatoniques et le blues',
    text: ['Une gamme pentatonique n’a que 5 notes. Mineure : 1, b3, 4, 5, b7 (0-3-5-7-10 demi-tons). Majeure : 1, 2, 3, 5, 6 (0-2-4-7-9). Sans demi-ton, elle sonne bien sur presque tout : c’est la gamme de l’improvisation.',
      'La gamme blues ajoute à la pentatonique mineure la « blue note » : la quinte bémol (b5, 6 demi-tons). On la joue en passant, sans s’y arrêter.'],
    build: (r, n) => { const R = low(rnd(12, r)); return { quiz: [
      qz('Combien de notes dans une gamme pentatonique ?', '5', ['4', '6', '7'], r),
      qz('Quelle est la « blue note » de la gamme blues ?', 'La quinte bémol', ['La seconde majeure', 'La sixte mineure', 'La septième majeure'], r),
      qz('Pentatonique mineure de La : quelles notes ?', 'La Do Ré Mi Sol', ['La Si Do# Mi Fa#', 'La Do Ré Mi Fa', 'La Si Do Mi Sol'], r)],
      rounds: [scaleRound('Pentatonique mineure', R, [0, 3, 5, 7, 10, 12], n), scaleRound('Gamme blues', R, [0, 3, 5, 6, 7, 10, 12], n)] }; } },
  { id: 'modes', chapter: 1, title: 'Les modes',
    text: ['Un mode, c’est la gamme majeure jouée à partir d’un autre degré : ionien (1), dorien (2), phrygien (3), lydien (4), mixolydien (5), éolien (6) et locrien (7). Mêmes notes, autre « point de repos », autre couleur.',
      'Repères : dorien = mineur avec sixte majeure (funk, jazz) ; mixolydien = majeur avec septième mineure (blues, rock) ; éolien = mineur naturel ; lydien = majeur avec quarte augmentée.'],
    build: (r, n) => { const R = low(rnd(12, r)); return { quiz: [
      qz('Sur quel degré de la gamme majeure commence le mode dorien ?', 'Le 2e', ['Le 3e', 'Le 5e', 'Le 6e'], r),
      qz('Quel mode est une gamme majeure avec la septième mineure ?', 'Mixolydien', ['Lydien', 'Dorien', 'Phrygien'], r),
      qz('Quel mode correspond à la gamme mineure naturelle ?', 'Éolien', ['Dorien', 'Locrien', 'Ionien'], r)],
      rounds: [scaleRound('Mode dorien', R, [0, 2, 3, 5, 7, 9, 10, 12], n), scaleRound('Mode mixolydien', R, [0, 2, 4, 5, 7, 9, 10, 12], n)] }; } },
  { id: 'scale-chord', chapter: 1, title: 'Quelle gamme sur quel accord ?',
    text: ['Chaque accord « appelle » une gamme qui contient ses notes. Accord majeur ou maj7 : gamme majeure (ionien). Accord mineur 7 : dorien. Accord de septième de dominante : mixolydien. Accord m7b5 : locrien.',
      'Règle pratique : jouez des notes de l’accord sur les temps forts, et des notes de la gamme entre les deux.'],
    build: (r, n) => { const rt = rnd(12, r); const R = low(rt); const picks = ['maj7', 'm7', '7', 'm7b5'].map(id => QUALITIES.find(q => q.id === id)!);
      const mk = (q: typeof picks[number]) => { const nms = Object.values(SCALE_NAME); const ans = SCALE_NAME[q.scale]; return { q: `Quelle gamme sur un accord ${nm(R, n)}${q.suffix} ?`, choices: nms, answer: nms.indexOf(ans) }; };
      const sc = getScale('dorian').steps;
      return { quiz: [mk(picks[1]), mk(picks[2]), mk(picks[3])], rounds: [round(`Gamme dorienne de ${nm(R, n)} (une octave, en montant)`, [...sc.map(s => R + s), R + 12])] }; } },
];
