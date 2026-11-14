import { zoneMastered } from '../exercises/manche';
import { bestScore, countSessions, noteBpm, noteKey, phrasesValidated, type ProgressData } from './data';

export interface Criterion { label: string; ok: boolean }
export interface Level { n: number; title: string; goal: string; criteria: (d: ProgressData) => Criterion[] }
const z = (d: ProgressData, id: string) => zoneMastered(d.drills, id);
const grooveOk = (d: ProgressData, id: string, bpm: number, pct: number) => d.sessions.some(s => s.module === `groove:${id}` && noteBpm(s) >= bpm && (s.score ?? 0) >= pct);
const drillOk = (d: ProgressData, kind: string, n: number) => d.drills.filter(x => x.kind === kind && x.accuracy >= 0.8).length >= n;

export const LEVELS: Level[] = [
  { n: 1, title: 'Premiers repères', goal: 'Je connais toutes les notes cases 0-5 et je joue des noires régulières.',
    criteria: d => [{ label: 'Zone « Cases 0-5 » validée (90 % sur 3 séances)', ok: z(d, 'z0') }, { label: 'Noires à 70 BPM, 80 % de réussite', ok: grooveOk(d, 'q', 70, 80) }] },
  { n: 2, title: 'Le manche s’ouvre', goal: 'Je connais les notes jusqu’à la 12ᵉ case.',
    criteria: d => [{ label: 'Zone « Cases 5-9 » validée', ok: z(d, 'z1') }, { label: 'Zone « Cases 9-12 » validée', ok: z(d, 'z2') }, { label: 'Croches à 80 BPM, 80 %', ok: grooveOk(d, 'e', 80, 80) }] },
  { n: 3, title: 'Tout le manche', goal: 'Je me repère sur toute l’étendue du manche.',
    criteria: d => [{ label: 'Zone « Cases 12-17 » validée', ok: z(d, 'z3') }, { label: 'Zone « Tout le manche » validée', ok: z(d, 'z4') }, { label: 'Intervalles à l’oreille ≥ 70 %', ok: bestScore(d, 'ear:interval') >= 70 }] },
  { n: 4, title: 'Gammes et arpèges', goal: 'Je joue les gammes et arpèges en positions, sans me tromper.',
    criteria: d => [{ label: '3 séances « Gammes en positions » ≥ 80 %', ok: drillOk(d, 'scale', 3) }, { label: '3 séances « Arpèges en positions » ≥ 80 %', ok: drillOk(d, 'arpeggio', 3) }, { label: 'Accords à l’oreille ≥ 70 %', ok: bestScore(d, 'ear:chord') >= 70 }] },
  { n: 5, title: 'Groove solide', goal: 'Je tiens le tempo, y compris sans clic.',
    criteria: d => [{ label: 'Croches à 90 BPM, 85 %', ok: grooveOk(d, 'e', 90, 85) }, { label: 'Syncopes à 70 BPM, 80 %', ok: grooveOk(d, 'sync', 70, 80) }, { label: 'Doubles croches à 70 BPM, 75 %', ok: grooveOk(d, 's', 70, 75) }] },
  { n: 6, title: 'Improvisation : les bases', goal: 'Je joue sur une grille en restant dans l’accord.',
    criteria: d => [{ label: 'Une seule note ≥ 80 %', ok: bestScore(d, 'impro:root') >= 80 }, { label: 'Ajout progressif ≥ 75 %', ok: bestScore(d, 'impro:add') >= 75 }, { label: 'Notes cibles ≥ 70 %', ok: bestScore(d, 'impro:targets') >= 70 }] },
  { n: 7, title: 'Approches et walking', goal: 'Je joue une walking sur un blues en Fa à 90 BPM.',
    criteria: d => [{ label: 'Approches chromatiques ≥ 70 %', ok: bestScore(d, 'impro:chromatic') >= 70 }, { label: 'Contraintes créatives ≥ 70 %', ok: bestScore(d, 'impro:constraints') >= 70 },
      { label: 'Walking sur un blues en Fa à 90 BPM, ≥ 70 %', ok: d.sessions.some(s => s.module === 'impro:walking' && noteKey(s) === 'F' && noteBpm(s) >= 90 && (s.score ?? 0) >= 70) }] },
  { n: 8, title: 'Improviser vraiment', goal: 'Je dialogue, je varie, j’invente, et j’ai un vocabulaire.',
    criteria: d => [{ label: 'Question / réponse ≥ 70 %', ok: bestScore(d, 'impro:qa') >= 70 }, { label: 'Copie → variation → invention ≥ 70 %', ok: bestScore(d, 'impro:copy') >= 70 },
      { label: 'Impro libre ≥ 70 % (2 séances)', ok: countSessions(d, 'impro:free', 70) >= 2 }, { label: '10 phrases du vocabulaire validées', ok: phrasesValidated(d) >= 10 }] },
];
export interface LevelState { level: Level; done: boolean; criteria: Criterion[] }
export function evaluateLevels(d: ProgressData): { states: LevelState[]; current: number } {
  const states = LEVELS.map(level => { const c = level.criteria(d); return { level, criteria: c, done: c.every(x => x.ok) }; });
  const idx = states.findIndex(s => !s.done);
  return { states, current: idx < 0 ? LEVELS.length + 1 : idx + 1 };
}
/** Prochain objectif concret : le premier critère non rempli du niveau courant. */
export function nextObjective(d: ProgressData): string {
  const { states, current } = evaluateLevels(d); if (current > LEVELS.length) return 'Tous les niveaux sont validés : continuez à monter les tempos !';
  return states[current - 1].criteria.find(c => !c.ok)?.label ?? states[current - 1].level.goal;
}
