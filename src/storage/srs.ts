import { db, type SrsItem } from './db';

export const DAY = 86_400_000;
const INTERVALS_DAYS = [0, 1, 2, 4, 8, 16]; // boîtes de Leitner

export const emptyItem = (id: string): SrsItem => ({ id, box: 0, due: 0, ok: 0, miss: 0, last: 0 });

export function updateItem(it: SrsItem, ok: boolean, now = Date.now()): SrsItem {
  const box = ok ? Math.min(it.box + 1, INTERVALS_DAYS.length - 1) : 0;
  return { ...it, box, ok: it.ok + (ok ? 1 : 0), miss: it.miss + (ok ? 0 : 1), last: now, due: now + INTERVALS_DAYS[box] * DAY };
}
/** Poids de tirage : jamais vu > raté récemment > en retard > pas encore dû. */
export function weight(it: SrsItem | undefined, now = Date.now()): number {
  if (!it || it.last === 0) return 2;
  const overdueDays = Math.max(0, (now - it.due) / DAY);
  const base = it.box <= 1 ? 3 : 1;
  return it.due <= now ? base + overdueDays : 0.2;
}
export function pickWeighted<T>(cands: T[], idOf: (t: T) => string, srs: Map<string, SrsItem>, rng = Math.random, now = Date.now()): T {
  const w = cands.map(c => weight(srs.get(idOf(c)), now));
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cands.length; i++) { r -= w[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1];
}
export async function loadSrs(): Promise<Map<string, SrsItem>> {
  return new Map((await db.srs.toArray()).map(i => [i.id, i]));
}
export async function recordSrs(id: string, ok: boolean, now = Date.now()) {
  const it = (await db.srs.get(id)) ?? emptyItem(id);
  await db.srs.put(updateItem(it, ok, now));
}
