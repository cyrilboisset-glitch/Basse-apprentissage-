import { zoneMastered } from '../exercises/manche';
import { ZONES } from '../theory/fretboard';
import { bestScore, countSessions, noteBpm, noteSd, phrasesValidated, practiceDays, type ProgressData } from './data';
import { evaluateLevels } from './levels';
import { computeStreak } from './streak';

export interface Badge { id: string; name: string; how: string; earned: (d: ProgressData) => boolean }
/** Badges sobres, liés à de vrais progrès (jamais à la simple ouverture de l'appli). */
export const BADGES: Badge[] = [
  { id: 'zone1', name: 'Première zone', how: 'Valider les cases 0-5 (90 % sur 3 séances)', earned: d => zoneMastered(d.drills, 'z0') },
  { id: 'manche', name: 'Manche complet', how: 'Valider toutes les zones du manche', earned: d => ZONES.every(z => zoneMastered(d.drills, z.id)) },
  { id: 'metronome', name: 'Horloge', how: 'Réussir un exercice de groove à 100 BPM ou plus (≥ 90 %)', earned: d => d.sessions.some(s => s.module.startsWith('groove:') && noteBpm(s) >= 100 && (s.score ?? 0) >= 90) },
  { id: 'regulier', name: 'Régulier', how: 'Un exercice de groove avec un écart-type < 15 ms', earned: d => d.sessions.some(s => s.module.startsWith('groove:') && noteSd(s) < 15 && (s.score ?? 0) >= 80) },
  { id: 'walking', name: 'Premier walking', how: 'Walking bass ≥ 80 %', earned: d => bestScore(d, 'impro:walking') >= 80 },
  { id: 'impro', name: 'Improvisateur', how: '3 improvisations libres ≥ 70 %', earned: d => countSessions(d, 'impro:free', 70) >= 3 },
  { id: 'vocab', name: 'Vocabulaire', how: '10 phrases validées', earned: d => phrasesValidated(d) >= 10 },
  { id: 'oreille', name: 'Oreille fine', how: '3 séances d’oreille ≥ 90 %', earned: d => d.sessions.filter(s => s.module.startsWith('ear:') && (s.score ?? 0) >= 90).length >= 3 },
  { id: 'niveau4', name: 'Niveau 4', how: 'Valider les niveaux 1 à 4', earned: d => evaluateLevels(d).current > 4 },
  { id: 'niveau8', name: 'Niveau 8', how: 'Valider les 8 niveaux', earned: d => evaluateLevels(d).current > 8 },
  { id: 'serie7', name: '7 jours', how: 'Série de 7 jours', earned: d => computeStreak(practiceDays(d), d.today).days >= 7 },
  { id: 'serie30', name: '30 jours', how: 'Série de 30 jours', earned: d => computeStreak(practiceDays(d), d.today).days >= 30 },
];
export const earnedBadges = (d: ProgressData) => BADGES.filter(b => b.earned(d));
