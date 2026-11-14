import { buildSession, type Step } from '../progress/session';
import type { ProgressData } from '../progress/data';

const mem = new Map<string, Step[]>();
const keyOf = (minutes: number, today: string) => `${today}:${minutes}`;
/** Le plan de la journée est mémorisé : l'accueil montre exactement la séance qui sera lancée. */
export function getPlan(minutes: 10 | 20 | 30, d: ProgressData, level: number, unlockAll: boolean): Step[] {
  const k = keyOf(minutes, d.today); const m = mem.get(k); if (m) return m;
  try { const raw = sessionStorage.getItem('plan:' + k); if (raw) { const p = JSON.parse(raw) as Step[]; mem.set(k, p); return p; } } catch { /* stockage indisponible */ }
  const p = buildSession(minutes, d, level, Math.random, unlockAll); mem.set(k, p);
  try { sessionStorage.setItem('plan:' + k, JSON.stringify(p)); } catch { /* facultatif */ }
  return p;
}
export function clearPlan(minutes: number, today: string) { const k = keyOf(minutes, today); mem.delete(k); try { sessionStorage.removeItem('plan:' + k); } catch { /* facultatif */ } }
