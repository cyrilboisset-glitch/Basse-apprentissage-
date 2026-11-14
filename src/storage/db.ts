import Dexie, { type Table } from 'dexie';
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from './settings';

export interface KV { key: string; value: unknown }
export interface PracticeSession { id?: number; date: string; module: string; seconds: number; score?: number; note?: string }

class BassLabDB extends Dexie {
  kv!: Table<KV, string>;
  sessions!: Table<PracticeSession, number>;
  constructor(name = 'basslab') {
    super(name);
    this.version(1).stores({ kv: 'key', sessions: '++id, date, module' });
  }
}

export const db = new BassLabDB();

export async function loadSettings(): Promise<Settings> {
  const row = await db.kv.get('settings');
  return mergeSettings(row?.value as Partial<Settings> | undefined);
}
export async function saveSettings(s: Settings): Promise<void> {
  await db.kv.put({ key: 'settings', value: s });
}

export async function exportAll(): Promise<string> {
  return JSON.stringify({
    app: 'basslab', version: 1, exportedAt: new Date().toISOString(),
    kv: await db.kv.toArray(), sessions: await db.sessions.toArray(),
  });
}
export async function importAll(json: string): Promise<void> {
  const d = JSON.parse(json);
  if (d?.app !== 'basslab' || !Array.isArray(d.kv) || !Array.isArray(d.sessions)) {
    throw new Error('Fichier de sauvegarde invalide');
  }
  await db.transaction('rw', db.kv, db.sessions, async () => {
    await db.kv.clear(); await db.sessions.clear();
    await db.kv.bulkPut(d.kv); await db.sessions.bulkAdd(d.sessions.map(({ id, ...r }: PracticeSession) => r));
  });
}

export async function requestPersistence(): Promise<void> {
  try { await navigator.storage?.persist?.(); } catch { /* ignoré */ }
}
export { DEFAULT_SETTINGS };
