import { type Lesson, round, qz } from './theory-kit';
import { rhy } from './rhythm';

/** Chapitre 3 — Rythme et solfège rythmique. Les durées sont en temps (négatif = silence). */
export const RYTHME: Lesson[] = [
  { id: 'pulse', chapter: 3, title: 'Pulsation, tempo et mesure',
    text: ['La pulsation est le battement régulier de la musique, celui que votre pied suit. Le tempo, en BPM, dit combien de pulsations par minute : à 60 BPM, une pulsation dure exactement une seconde.',
      'La mesure regroupe les pulsations. En 4/4, il y en a 4 par mesure (quatre noires) et la première est la plus forte. En 3/4 (la valse), il y en a 3. Le chiffre du bas indique l’unité : 4 = la noire.'],
    build: (r) => ({ quiz: [
      qz('Que signifie 4/4 ?', 'Quatre noires par mesure', ['Quatre mesures par minute', 'Quatre croches par mesure', 'Quatre notes par seconde'], r),
      qz('Que mesure le tempo en BPM ?', 'Le nombre de pulsations par minute', ['La durée d’un morceau', 'La hauteur des notes', 'Le nombre de mesures'], r),
      qz('À 60 BPM, combien de temps dure une noire ?', 'Une seconde', ['Une demi-seconde', 'Deux secondes', 'Un dixième de seconde'], r)], rounds: [],
      rhythms: [rhy('Quatre noires', 4, [1, 1, 1, 1], { bpm: 70, hint: 'Une note par temps, bien droite.' }), rhy('Valse à 3/4', 3, [1, 1, 1], { bpm: 80, hint: 'Trois temps par mesure : le premier est le plus appuyé.' })] }) },
  { id: 'values', chapter: 3, title: 'Les figures de notes et les silences',
    text: ['Chaque note a une durée : la ronde dure 4 temps, la blanche 2, la noire 1, la croche un demi-temps, la double croche un quart de temps. Chaque figure vaut deux fois la suivante.',
      'Les silences ont les mêmes durées que les notes : la pause (4 temps), la demi-pause (2), le soupir (1), le demi-soupir (½), le quart de soupir (¼). Un silence se compte aussi, et se joue : on ne bouge pas, mais on reste dans le temps.'],
    build: (r) => ({ quiz: [
      qz('Combien de croches dans une noire ?', '2', ['1', '3', '4'], r),
      qz('Quelle est la durée d’une blanche ?', '2 temps', ['1 temps', '4 temps', 'Un demi-temps'], r),
      qz('Quel silence dure un temps ?', 'Le soupir', ['La demi-pause', 'La pause', 'Le demi-soupir'], r)], rounds: [],
      rhythms: [rhy('Blanche, noire, noire', 4, [2, 1, 1], { bpm: 70 }), rhy('Noire, soupir, noire, noire', 4, [1, -1, 1, 1], { bpm: 70, hint: 'Ne jouez rien au deuxième temps, mais comptez-le.' })] }) },
  { id: 'dots', chapter: 3, title: 'Le point et la liaison',
    text: ['Un point placé après une note ajoute la moitié de sa valeur : une noire pointée dure 1 temps + ½ = 1,5 temps ; une blanche pointée dure 3 temps. Le rythme « noire pointée + croche » est partout.',
      'La liaison relie deux notes de même hauteur : on joue la première et on la prolonge de la durée de la seconde, sans la rejouer. Elle permet de faire durer une note par-dessus la barre de mesure.'],
    build: (r) => ({ quiz: [
      qz('Combien de temps dure une noire pointée ?', '1,5 temps', ['2 temps', '1 temps', '3 temps'], r),
      qz('Combien de temps dure une blanche pointée ?', '3 temps', ['2,5 temps', '4 temps', '2 temps'], r),
      qz('Que fait une liaison entre deux notes de même hauteur ?', 'Elle additionne leurs durées sans rejouer la seconde', ['Elle les joue plus fort', 'Elle les joue plus vite', 'Elle change leur hauteur'], r)], rounds: [],
      rhythms: [rhy('Noire pointée + croche (×2)', 4, [1.5, 0.5, 1.5, 0.5], { bpm: 70, hint: 'La croche tombe sur le « et » du temps 2 et du temps 4.' }), rhy('Blanche pointée + noire', 4, [3, 1], { bpm: 70 })] }) },
  { id: 'subdiv', chapter: 3, title: 'Croches et doubles croches : savoir compter',
    text: ['Pour jouer juste, on compte à voix haute. Les croches se comptent « 1 et 2 et 3 et 4 et » : le chiffre tombe sur le temps, le « et » entre deux temps (le contretemps).',
      'Les doubles croches se comptent « 1 e et a, 2 e et a… » : quatre notes par temps. Compter la subdivision, même quand on ne joue pas, garde le tempo régulier : c’est la base de la mise en place.'],
    build: (r) => ({ quiz: [
      qz('Comment compte-t-on les croches ?', '1 et 2 et 3 et 4 et', ['1 e et a 2 e et a', '1 2 3 4 5 6 7 8', '1 la li 2 la li'], r),
      qz('Combien de doubles croches par temps ?', '4', ['2', '3', '8'], r),
      qz('Combien de doubles croches dans une croche ?', '2', ['1', '3', '4'], r)], rounds: [],
      rhythms: [rhy('Croches', 4, [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], { bpm: 70, hint: 'Comptez « 1 et 2 et 3 et 4 et ».' }), rhy('Doubles croches', 4, Array(16).fill(0.25), { bpm: 60, hint: 'Comptez « 1 e et a, 2 e et a… ».' })] }) },
  { id: 'sync', chapter: 3, title: 'La syncope et le contretemps',
    text: ['Le contretemps place la note sur la partie faible du temps (le « et ») et laisse le temps lui-même en silence. La syncope fait entendre un accent sur une partie faible, souvent parce qu’une note commence sur le « et » et dure jusqu’au temps suivant.',
      'Syncopes et contretemps donnent leur élan au funk, au reggae, à la salsa. Le piège : ralentir ou se précipiter. Gardez la pulsation dans la tête, et placez la note juste après le clic ou le pied.'],
    build: (r) => ({ quiz: [
      qz('Sur quelle partie du temps tombe un contretemps ?', 'Sur le « et » (partie faible)', ['Sur le temps lui-même', 'Sur la mesure suivante', 'Sur la double croche d’avant'], r),
      qz('Que fait entendre une syncope ?', 'Un accent sur une partie faible', ['Un silence de 4 temps', 'Une note plus aiguë', 'Un changement de tempo'], r),
      qz('Dans un contretemps de croches, que joue-t-on sur le temps ?', 'Rien : un silence', ['Une note forte', 'Une double croche', 'Un accord'], r)], rounds: [],
      rhythms: [rhy('Syncope', 4, [0.5, 1, 1, 1, 0.5], { bpm: 70, hint: 'Les notes tombent sur le « et » : 1, 1 et, 2 et, 3 et, 4 et.' }), rhy('Contretemps', 4, [-0.5, 0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5], { bpm: 65, hint: 'Jouez uniquement sur les « et ».' })] }) },
  { id: 'triplets', chapter: 3, title: 'Les triolets et le swing',
    text: ['Un triolet de croches place trois notes égales dans un temps (au lieu de deux croches). On les compte « 1 la li, 2 la li, 3 la li, 4 la li ». Douze triolets font une mesure à 4/4.',
      'Le swing (ou shuffle) joue les croches en « longue-brève » : la première vaut deux tiers de temps, la seconde un tiers. C’est un triolet dont on saute la note du milieu. Il fait danser le blues, le jazz et le shuffle.'],
    build: (r) => ({ quiz: [
      qz('Combien de notes dans un triolet de croches par temps ?', '3', ['2', '4', '6'], r),
      qz('Comment compte-t-on les triolets ?', '1 la li, 2 la li…', ['1 et 2 et…', '1 e et a…', '1 2 3 1 2 3'], r),
      qz('Quelles notes du triolet joue-t-on dans un shuffle ?', 'La première et la troisième', ['La première et la deuxième', 'Seulement la deuxième', 'Les trois'], r)], rounds: [],
      rhythms: [rhy('Triolets de croches', 4, Array(12).fill(1 / 3), { bpm: 60, hint: 'Trois notes égales par temps : « 1 la li ».' }), rhy('Shuffle', 4, [2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3], { bpm: 80, hint: 'Longue-brève : sautez la note du milieu de chaque triolet.' })] }) },
  { id: 'compound', chapter: 3, title: 'Mesures composées : 6/8 et 12/8',
    text: ['Dans une mesure composée, la pulsation se divise en trois, pas en deux. À 6/8, il y a deux pulsations (deux noires pointées), chacune contenant trois croches : « 1 la li 2 la li ». À 12/8, quatre pulsations ternaires : le blues lent.',
      'À 4/4 on sent « un-deux-trois-quatre » ; à 6/8 on sent « UN-deux-trois, QUATRE-cinq-six » avec deux appuis. Le chiffre du haut compte les croches, celui du bas dit que la croche est l’unité (8).'],
    build: (r) => ({ quiz: [
      qz('Combien de pulsations dans une mesure à 6/8 ?', '2', ['6', '3', '4'], r),
      qz('Par quoi se divise la pulsation d’une mesure composée ?', 'Par trois', ['Par deux', 'Par quatre', 'Par cinq'], r),
      qz('À quel type de mesure le blues lent est-il souvent écrit ?', '12/8', ['2/4', '5/4', '3/2'], r)], rounds: [],
      rhythms: [rhy('6/8 : six croches', 2, Array(6).fill(1 / 3), { bpm: 55, compound: true, hint: 'Deux pulsations, trois croches chacune.' }), rhy('6/8 : noire, croche, noire, croche', 2, [2 / 3, 1 / 3, 2 / 3, 1 / 3], { bpm: 55, compound: true })] }) },
  { id: 'tab', chapter: 3, title: 'Lire une tablature',
    text: ['La tablature dessine les quatre cordes de la basse : la ligne du haut est la corde la plus aiguë (Sol), celle du bas la plus grave (Mi). Un chiffre indique la case à jouer ; 0 veut dire corde à vide.',
      'Les notes se lisent de gauche à droite ; ce qui est aligné verticalement se joue ensemble. La tablature donne la position mais pas la durée : on la complète par le solfège rythmique, ou en écoutant.'],
    build: (r) => {
      // La à vide, La case 3, Mi case 3, Mi case 5 : La1, Do2, Sol1, La1 (notes MIDI 33, 36, 31, 33)
      const tab = ['G|-----------|', 'D|-----------|', 'A|-0--3------|', 'E|------3--5-|'].join('\n');
      return { quiz: [
        qz('Quelle ligne de la tablature représente la corde la plus grave ?', 'La ligne du bas (Mi)', ['La ligne du haut (Sol)', 'La deuxième (Ré)', 'La troisième (La)'], r),
        qz('Que signifie un 0 dans la tablature ?', 'Corde à vide', ['Case 10', 'Silence', 'Corde étouffée'], r),
        qz('Que signifie un 3 sur la ligne du La ?', 'Case 3 de la corde de La (Do)', ['La troisième corde', 'Trois notes de suite', 'Le troisième temps'], r)],
        rounds: [round('Jouez cette tablature de gauche à droite : La à vide, La case 3, Mi case 3, Mi case 5.', [33, 36, 31, 33], tab)] };
    } },
];
