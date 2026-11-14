import { test, expect } from '@playwright/test';

test('aucune donnée ne quitte l’appareil : toutes les requêtes restent sur l’origine de l’appli', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin; const outside: string[] = []; const all: string[] = [];
  page.on('request', r => { const u = r.url(); all.push(u); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) outside.push(`${r.method()} ${u}`); });
  const routes = ['#/', '#/manche', '#/pratique', '#/impro', '#/groove', '#/jam', '#/vocabulaire', '#/oreille', '#/theorie', '#/outils', '#/materiel', '#/reglages', '#/bord', '#/placement', '#/fichier', '#/enregistrements', '#/seance'];
  for (const r of routes) { await page.goto('./' + r); await page.waitForTimeout(250); }
  await page.goto('./#/jam'); await page.getByRole('button', { name: 'Démarrer' }).click(); await page.waitForTimeout(1500); await page.getByRole('button', { name: 'Arrêter' }).click();
  await page.goto('./#/reglages'); await page.getByRole('button', { name: 'Exporter mes données' }).click();
  expect(all.length).toBeGreaterThanOrEqual(3); // page unique : document, script, style… tout est chargé une fois
  expect(outside).toEqual([]);
});
