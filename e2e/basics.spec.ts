import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('navigation par onglets et par adresse directe (hash)', async ({ page }) => {
  await page.goto('./#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible();
  await page.getByRole('link', { name: 'Manche' }).click(); await expect(page.getByRole('heading', { name: 'Manche' })).toBeVisible();
  await page.getByRole('link', { name: 'Pratique' }).click(); await expect(page.getByRole('heading', { name: 'Pratique' })).toBeVisible();
  await page.getByRole('link', { name: /Vocabulaire/ }).click(); await expect(page.getByRole('heading', { name: 'Vocabulaire' })).toBeVisible();
});

test('les réglages sont conservés après rechargement (IndexedDB) et le thème s’applique', async ({ page }) => {
  await page.goto('./#/reglages');
  await page.getByLabel('Thème').selectOption('light'); await page.getByLabel('Notation').selectOption('en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByLabel('Notation')).toHaveValue('en');
});

test('export puis import des données : le journal revient', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: '10 min' }).click(); await page.getByRole('link', { name: /Démarrer la séance/ }).click();
  await page.getByRole('button', { name: "C'est parti" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: "Passer l'étape" }).click();
  await page.locator('textarea').fill('note e2e'); await page.getByRole('button', { name: /Enregistrer dans mon journal/ }).click(); await expect(page.getByText('Enregistré')).toBeVisible();
  await page.goto('./#/reglages');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exporter mes données' }).click()]);
  const path = await dl.path(); const json = JSON.parse(readFileSync(path, 'utf8'));
  expect(json.app).toBe('basslab'); expect(json.journal.some((j: any) => j.text === 'note e2e')).toBe(true);
  await page.evaluate(() => new Promise(r => { const q = indexedDB.deleteDatabase('basslab'); q.onsuccess = q.onerror = q.onblocked = () => r(null); }));
  await page.reload();
  await page.setInputFiles('input[type=file]', path); await expect(page.getByText('Import réussi.')).toBeVisible();
  await page.goto('./#/bord'); await expect(page.getByText('note e2e')).toBeVisible();
});

test('fonctionne hors ligne après un premier chargement (service worker)', async ({ page, context }) => {
  await page.goto('./'); await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(1500);
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole('heading', { name: 'Séance du jour' })).toBeVisible();
  await page.getByRole('link', { name: 'Pratique' }).click(); await page.getByRole('link', { name: /Vocabulaire/ }).click();
  await page.getByRole('tab', { name: 'Jazz (walking)' }).click(); await expect(page.getByText('Walking de base II-V-I')).toBeVisible();
  await context.setOffline(false);
});

test('manifeste PWA installable (icônes 192/512 PNG, mode standalone)', async ({ page, request }) => {
  await page.goto('./'); const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const m = await (await request.get(new URL(href!, page.url()).toString())).json();
  expect(m.display).toBe('standalone'); expect(m.lang).toBe('fr');
  const sizes = m.icons.map((i: any) => `${i.sizes}:${i.type}`); expect(sizes).toContain('192x192:image/png'); expect(sizes).toContain('512x512:image/png');
});

test('connexion USB : sans interface USB, un message clair explique quoi vérifier', async ({ page }) => {
  await page.goto('./#/materiel');
  await page.getByRole('button', { name: 'Connecter', exact: true }).click();
  await expect(page.getByText('Plug Pro introuvable')).toBeVisible(); await expect(page.getByRole('button', { name: 'Chercher à nouveau' })).toBeVisible();
});

test('connexion USB : une interface « USB Audio » est repérée, sélectionnée, et la basse reçue est confirmée', async ({ page }) => {
  await page.addInitScript(() => {
    const md = navigator.mediaDevices; const orig = md.enumerateDevices.bind(md);
    md.enumerateDevices = async () => { const l = await orig(); return [...l.filter(d => d.kind === 'audioinput').slice(0, 1), { deviceId: l.find(d => d.kind === 'audioinput')!.deviceId, kind: 'audioinput', label: 'NUX MIGHTY PLUG PRO USB Audio', groupId: 'x', toJSON() { return {}; } } as MediaDeviceInfo]; };
  });
  await page.goto('./#/materiel'); await page.getByRole('button', { name: 'Connecter', exact: true }).click();
  await expect(page.getByText('NUX MIGHTY PLUG PRO USB Audio').first()).toBeVisible();
  await expect(page.getByText(/Connecté : la basse est reçue/)).toBeVisible({ timeout: 8000 });
});
