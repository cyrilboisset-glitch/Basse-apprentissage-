const DAY = 86_400_000;
const parse = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const fmt = (t: number) => new Date(t).toISOString().slice(0, 10);
/** Semaine ISO « année-semaine » d'un jour. */
export function isoWeek(iso: string): string {
  const t = new Date(parse(iso)); const d = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - d + 3);
  const y = t.getUTCFullYear(), w = 1 + Math.round(((t.getTime() - Date.UTC(y, 0, 4)) / DAY - 3 + ((new Date(Date.UTC(y, 0, 4)).getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
export interface Streak { days: number; jokersUsed: number; practicedToday: boolean; atRisk: boolean }
/**
 * Série de jours consécutifs. Un joker par semaine ISO : une journée manquée n'interrompt pas la série
 * (mais ne compte pas). Si aujourd'hui n'est pas encore pratiqué, la série reste valable jusqu'à ce soir.
 */
export function computeStreak(practiced: Set<string>, today: string): Streak {
  const practicedToday = practiced.has(today);
  let t = parse(today) - (practicedToday ? 0 : DAY), days = 0; const used = new Set<string>(); let jokers = 0;
  for (let guard = 0; guard < 3650; guard++, t -= DAY) {
    const day = fmt(t);
    if (practiced.has(day)) { days++; continue; }
    const wk = isoWeek(day);
    if (!used.has(wk) && practiced.has(fmt(t - DAY))) { used.add(wk); jokers++; continue; } // joker : seulement si la veille a été pratiquée
    break;
  }
  const jokerLeftThisWeek = !used.has(isoWeek(today));
  return { days, jokersUsed: jokers, practicedToday, atRisk: !practicedToday && days > 0 && !jokerLeftThisWeek };
}
export function weeklyMinutes(items: { date: string; seconds: number }[], weeks = 8, today: string): { week: string; minutes: number }[] {
  const out: { week: string; minutes: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) out.push({ week: isoWeek(fmt(parse(today) - i * 7 * DAY)), minutes: 0 });
  for (const it of items) { const w = isoWeek(it.date.slice(0, 10)); const slot = out.find(o => o.week === w); if (slot) slot.minutes += it.seconds / 60; }
  return out.map(o => ({ ...o, minutes: Math.round(o.minutes) }));
}
