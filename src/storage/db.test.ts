import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { db, loadSettings, saveSettings, exportAll, importAll } from './db';
import { DEFAULT_SETTINGS } from './settings';

describe('stockage', () => {
  it('renvoie les réglages par défaut puis persiste les changements', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    await saveSettings({ ...DEFAULT_SETTINGS, notation: 'en', refA: 442 });
    expect((await loadSettings()).refA).toBe(442);
  });
  it('exporte puis réimporte toutes les données', async () => {
    await db.sessions.add({ date: '2026-11-14', module: 'manche', seconds: 600 });
    const json = await exportAll();
    await db.sessions.clear(); await db.kv.clear();
    await importAll(json);
    expect(await db.sessions.count()).toBe(1);
    expect((await loadSettings()).notation).toBe('en');
  });
  it('refuse un fichier invalide', async () => {
    await expect(importAll('{"x":1}')).rejects.toThrow();
  });
});
