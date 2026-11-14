import { type Lesson, low, nm, rnd, round, qz, names } from './theory-kit';
import { rhy } from './rhythm';

/** Chapitre 4 — Jeu de basse et styles. */
export const BASSE: Lesson[] = [
  { id: 'role', chapter: 4, title: 'Le rôle de la basse',
    text: ['La basse fait le lien entre l’harmonie (les accords) et le rythme (la batterie). Au temps 1, jouez la fondamentale : tout le groupe s’appuie dessus. Calez votre grosse caisse avec celle du batteur.',
      'Entre les accords, reliez-les : notes de passage, approches. Et laissez des silences : ce que vous ne jouez pas compte autant.'],
    link: { href: '#/impro', label: 'Faire l’exercice « Une seule note » (Impro)' },
    build: () => ({ quiz: [{ q: 'Quelle note joue-t-on en priorité au temps 1 ?', choices: ['La fondamentale', 'La septième', 'Une note de passage'], answer: 0 }, { q: 'La basse relie surtout…', choices: ['La mélodie et la voix', 'Le rythme et l’harmonie', 'La guitare et le clavier'], answer: 1 }], rounds: [] }) },
  { id: 'root-fifth', chapter: 4, title: 'Fondamentale, quinte, octave',
    text: ['Trois notes suffisent pour accompagner : la fondamentale, la quinte (7 demi-tons au-dessus) et l’octave (12). Alterner fondamentale et quinte donne un pas régulier, solide, utilisé en pop, en country, en reggae.',
      'L’octave ajoute de l’énergie : c’est le moteur du disco et du funk. Dans les deux cas, la fondamentale reste au temps 1, et vous changez de note quand l’accord change.'],
    build: (r, n) => { const k = rnd(12, r); const A = low(k), B = low(k + 5); const seq = [A, A + 7, A, A + 12, B, B + 7, B, B + 12]; return { quiz: [
      qz('De combien de demi-tons la quinte est-elle au-dessus de la fondamentale ?', '7', ['5', '4', '12'], r),
      qz('Quelle note joue-t-on au temps 1 quand l’accord change ?', 'La fondamentale du nouvel accord', ['La quinte de l’ancien accord', 'N’importe quelle note', 'Un silence'], r),
      qz('Quel jeu donne le plus d’énergie, typique du disco ?', 'Les octaves', ['Les notes tenues', 'Les glissandos', 'Les accords'], r)],
      rounds: [round(`Fondamentale – quinte – fondamentale – octave sur I puis sur IV : ${names(seq, n)}`, seq)] }; } },
  { id: 'targets', chapter: 4, title: 'Notes cibles et notes de passage',
    text: ['Une note cible est la note sur laquelle vous voulez arriver au prochain accord : souvent la tierce (elle dit « majeur » ou « mineur »). Une note de passage relie deux notes d’accord, sur un temps faible.',
      'Entraînez-vous à enchaîner : fondamentale de l’accord, puis tierce du suivant.'],
    build: (r, n) => { const k = rnd(12, r); const ch = [[0, 4], [7, 4], [9, 3], [5, 4]].map(([o, t]) => [low(k + o), low(k + o) + t]); const seq = ch.flat();
      return { quiz: [{ q: 'Quelle note vaut mieux jouer sur le temps 1 d’un changement d’accord ?', choices: ['Une note de passage', 'Une note de l’accord (fondamentale ou tierce)', 'Une note hors gamme'], answer: 1 }], rounds: [round(`Boucle I – V – vi – IV : fondamentale puis tierce de chaque accord`, seq)] }; } },
  { id: 'approach', chapter: 4, title: 'Approches chromatiques et diatoniques',
    text: ['Une approche est une note qui « glisse » vers la cible : un demi-ton dessous ou dessus (chromatique), ou la note voisine de la gamme (diatonique). On la place juste avant la cible, sur un temps faible.',
      'Le dernier temps de la mesure est idéal pour annoncer le prochain accord.'],
    build: (r, n) => { const k = rnd(12, r); const ts = [0, 5, 7].map(o => low(k + o) + 12); return { quiz: [{ q: 'Une approche chromatique par dessous vers un Sol est…', choices: ['Fa', 'Fa#', 'La'], answer: 1 }],
      rounds: [round(`Approche par dessous : ${ts.map(t => `${nm(t - 1, n)} → ${nm(t, n)}`).join(' ; ')}`, ts.flatMap(t => [t - 1, t]))] }; } },
  { id: 'walking', chapter: 4, title: 'Le walking bass',
    text: ['Le walking bass joue quatre noires par mesure, sans interruption, comme si la basse « marchait ». Au temps 1 : une note de l’accord (souvent la fondamentale). Aux temps 2 et 3 : notes de l’accord ou de la gamme. Au temps 4 : une note d’approche vers la fondamentale suivante.',
      'La ligne doit avancer par petits pas plutôt que par grands sauts, et changer de direction de temps en temps. Écoutez le swing : les noires sont régulières, c’est le piano et la batterie qui le font respirer.'],
    build: (r, n) => { const k = rnd(12, r); const R = low(k); const seq = [R, R + 4, R + 7, R + 6, R + 5, R + 9, R + 12, R + 11]; return { quiz: [
      qz('Combien de notes par mesure dans un walking bass ?', 'Quatre', ['Deux', 'Huit', 'Une'], r),
      qz('Que joue-t-on au temps 4 ?', 'Une note d’approche vers l’accord suivant', ['Un silence', 'La quinte', 'Un accord'], r),
      qz('Que joue-t-on au temps 1 ?', 'Une note de l’accord, souvent la fondamentale', ['Une note hors gamme', 'Un glissando', 'La même note qu’au temps 4'], r)],
      rounds: [round(`Walking sur I puis IV (deux mesures de quatre noires) : ${names(seq, n)}`, seq)] }; } },
  { id: 'boogie', chapter: 4, title: 'Le blues à la basse : le boogie',
    text: ['Le boogie est le motif de basse du blues : 1, 3, 5, 6, b7, 6, 5, 3 (0-4-7-9-10-9-7-4 demi-tons). On le joue en croches régulières, avec un léger swing, sur chaque accord de la grille.',
      'En changeant de fondamentale (I, IV, V), le même motif suit la grille sans effort. Gardez la main gauche détendue : la répétition fait le groove, pas la complexité.'],
    build: (r, n) => { const k = rnd(12, r); const R = low(k); const seq = [0, 4, 7, 9, 10, 9, 7, 4].map(o => R + o); return { quiz: [
      qz('Quelles notes forment le motif boogie ?', 'Fondamentale, tierce, quinte, sixte, septième mineure, puis retour', ['Fondamentale, seconde, quarte, quinte, sixte', 'Seulement la fondamentale et l’octave', 'Les douze notes de la gamme chromatique'], r),
      qz('Comment joue-t-on le boogie ?', 'En croches régulières, avec un léger swing', ['En blanches', 'En doubles croches rapides', 'Sans rythme précis'], r),
      qz('Que change-t-on pour suivre la grille ?', 'La fondamentale, pas le motif', ['Le motif entier', 'Le tempo', 'La corde à vide'], r)],
      rounds: [round(`Motif boogie sur ${nm(R, n)} : ${names(seq, n)}`, seq)] }; } },
  { id: 'styles', chapter: 4, title: 'Funk, rock, reggae, soul',
    text: ['Chaque style a sa grammaire. Rock : croches régulières, solides. Funk : doubles croches, syncopes, et surtout le « one » (le temps 1 très appuyé). Reggae : beaucoup d’espace, l’accent sur le temps 3 (le « one drop »). Soul / Motown : lignes chantantes en croches, octaves, approches.',
      'Écoutez beaucoup avant de jouer : le style se reconnaît surtout à ce qu’on ne joue pas. Changez de style en changeant le rythme, pas forcément les notes.'],
    build: (r) => ({ quiz: [
      qz('Où tombe l’accent principal dans le reggae ?', 'Sur le temps 3 (« one drop »)', ['Sur le temps 1', 'Sur tous les « et »', 'Sur le temps 4'], r),
      qz('Que joue la basse en rock ?', 'Des croches régulières', ['Des notes très longues', 'Des triolets', 'Uniquement des silences'], r),
      qz('Que veut dire « le one » en funk ?', 'Le temps 1, très appuyé', ['Une seule note par mesure', 'Le premier morceau du concert', 'Le tempo le plus lent'], r)], rounds: [],
      rhythms: [rhy('Reggae : one drop', 4, [-2, 1.5, 0.5], { bpm: 75, hint: 'Rien sur le temps 1, la note tombe sur le temps 3, puis sur le « et » du 4.' }), rhy('Rock : croches', 4, Array(8).fill(0.5), { bpm: 100 }), rhy('Funk : syncopes', 4, [0.75, 0.75, 1, 0.5, 1], { bpm: 85, hint: 'Notes sur 1, le « a » du 1, le « et » du 2, le « et » du 3 et le 4.' })] }) },
  { id: 'drums', chapter: 4, title: 'Dialoguer avec la batterie',
    text: ['La basse et la grosse caisse jouent ensemble : quand le batteur frappe la grosse caisse, la basse place sa note au même instant. C’est ce « verrouillage » qui rend le groupe solide.',
      'La caisse claire marque les temps 2 et 4 : sur ces temps, laissez de l’espace ou jouez court. Écoutez le batteur avant de jouer : vous suivez sa grosse caisse, il suit vos notes graves.'],
    build: (r) => ({ quiz: [
      qz('Avec quel instrument la basse doit-elle se caler en priorité ?', 'La grosse caisse', ['La guitare solo', 'Le chant', 'Les cymbales'], r),
      qz('Sur quels temps tombe la caisse claire en 4/4 ?', '2 et 4', ['1 et 3', '1 seulement', 'Sur tous les temps'], r),
      qz('Que fait la basse sur les temps de la caisse claire ?', 'Elle laisse de l’espace ou joue court', ['Elle joue le plus fort possible', 'Elle change de tonalité', 'Elle s’arrête de jouer'], r)], rounds: [],
      rhythms: [rhy('Caler sur la grosse caisse (rock)', 4, [2, 0.5, 1.5], { bpm: 90, hint: 'Notes sur le temps 1, le temps 3 et le « et » du 3, comme la grosse caisse.' })] }) },
];
