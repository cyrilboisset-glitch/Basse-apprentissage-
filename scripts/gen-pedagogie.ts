/** Génère docs/pedagogie.md à partir des niveaux, exercices et leçons du code (source unique). Usage : npm run docs */
import { writeFileSync } from 'node:fs';
import { LEVELS } from '../src/progress/levels';
import { EXERCISES } from '../src/exercises/impro';
import { LESSONS, CHAPTERS } from '../src/exercises/theory';
import { RHYTHMS, TECHNIQUE } from '../src/exercises/groove';
import { DRILL_LABEL } from '../src/exercises/manche';
import { ZONES } from '../src/theory/fretboard';
import { PHRASES, STYLE_LABELS, STYLE_ORDER } from '../src/exercises/vocab';
import { STYLES } from '../src/audio/backing/styles';
import { BADGES } from '../src/progress/badges';

const empty = { drills: [], sessions: [], srs: [], today: '2026-01-01' };
const L: string[] = [];
L.push('# Pédagogie — le parcours complet, niveau par niveau', '', '> Ce fichier est **généré** à partir du code (`npm run docs`) : il ne peut pas diverger de l\'appli.', '',
  '## Principes', '',
  '- **Courtes séances (10, 20 ou 30 min)**, une seule chose à la fois, toujours terminées par un exercice **joué** et corrigé.',
  '- **Rien ne se débloque par hasard** : une zone du manche s\'ouvre à 90 % de réussite en moyenne sur 3 séances ; un tempo monte de 5 BPM à 90 % de réussite.',
  '- **Répétition espacée** : les notes, intervalles, accords, gammes, phrases ratés reviennent plus souvent (boîtes de Leitner : 0/1/2/4/8/16 jours).',
  '- **Le rythme avant les notes** : tous les exercices mesurent l\'écart en millisecondes à la grille, après compensation de la latence calibrée.',
  '- **Le retour est concret** : un conseil de prof par exercice (« laissez respirer », « vous êtes en retard de 40 ms »…), jamais un simple score.', '',
  '## La séance du jour', '',
  '| Durée | Contenu |', '|---|---|',
  '| 10 min | Échauffement (1) · Manche (3) · Improvisation (4) |', '| 20 min | Échauffement (2) · Manche (5) · Vocabulaire (4) · Improvisation (7) · Groove (3) |',
  '| 30 min | Échauffement (2) · Manche (5) · Théorie (3) · Vocabulaire (4) · Groove (5) · Improvisation (10) · Oreille (3) |', '',
  'Le type d\'exercice du manche est celui où vous êtes le plus faible dans la zone ouverte ; la phrase proposée est celle dont la révision est la plus urgente ; l\'exercice d\'impro dépend du niveau.', '',
  '## Les 8 niveaux', '');
for (const l of LEVELS) { L.push(`### Niveau ${l.n} — ${l.title}`, '', `**Objectif :** ${l.goal}`, '', '**Pour valider le niveau :**', ...l.criteria(empty).map(c => `- ${c.label}`), ''); }
L.push('Le niveau courant est le premier niveau dont tous les critères ne sont pas remplis. Le **test de positionnement** (10 min) débloque les zones déjà maîtrisées et conseille un niveau de départ (1 à 6 au plus) ; il peut être refait à tout moment.', '',
  '## Module « Connaître le manche »', '', 'Zones : ' + ZONES.map(z => z.label).join(' → ') + '.', '', ...Object.values(DRILL_LABEL).map(x => `- ${x}`), '',
  'Validation par **hauteur** détectée (l\'audio ne distingue pas la corde) ; carte de chaleur : ✓ maîtrisée (≥ 90 % et < 3 s), ⏱ lente, ✗ ratée (< 70 %).', '',
  '## Module « Théorie appliquée »', '', ...CHAPTERS.flatMap(c => [`### ${c.n}. ${c.title}`, ...LESSONS.filter(l => l.chapter === c.n).map(l => `- **${l.title}** — ${l.text.join(' ').split(/\s+/).length} mots, quiz + exercice joué`), '']), '',
  '## Module « Improvisation » (le cœur)', '', ...EXERCISES.map(e => `${e.n}. **${e.name}** — ${e.summary} (${STYLES.find(s => s.id === e.style)!.name}, ${e.bpm} BPM, ${e.laps} tour(s))`), '',
  'Après chaque exercice : % de notes dans l\'accord, justesse rythmique, notes cibles réussies, notes « à éviter », et jusqu\'à trois conseils.', '',
  '## Module « Groove et mise en place »', '', '**Rythmes :** ' + RHYTHMS.map(r => r.name).join(' · '), '', '**Technique :** ' + TECHNIQUE.map(r => r.name).join(' · '), '',
  'Clic qui disparaît (1 mesure sur 2, 4 ou 8) avec mesure de la dérive du tempo ; +5 BPM à 90 %.', '',
  `## Vocabulaire — ${PHRASES.length} phrases originales`, '', ...STYLE_ORDER.map(s => `- ${STYLE_LABELS[s]} : ${PHRASES.filter(p => p.style === s).length} phrases`), '',
  'Toutes composées pour l\'appli (aucune transcription de morceau existant), transposables dans les 12 tonalités, ajout de vos propres phrases en tablature ou par capture audio.', '',
  `## Jam — ${STYLES.length} styles`, '', STYLES.map(s => s.name).join(' · '), '',
  '## Badges (liés à de vrais progrès)', '', ...BADGES.map(b => `- **${b.name}** — ${b.how}`), '',
  '## Semaine type conseillée', '', '| Jour | Séance |', '|---|---|', '| Lun, Mer, Ven | 20 min : manche + vocabulaire + impro |', '| Mar, Jeu | 10 min : échauffement + groove (tempo) |', '| Sam | 30 min : séance complète + enregistrement d\'un Jam |', '| Dim | Repos ou écoute : enregistrements, oreille |', '');
writeFileSync('docs/pedagogie.md', L.join('\n'));
console.log('docs/pedagogie.md écrit');
