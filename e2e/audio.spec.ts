import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('accordeur : un Mi grave (41,20 Hz) est reconnu à moins de 2 cents', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: 'Accordeur' }).click();
  const dlg = page.getByRole('dialog', { name: 'Accordeur' });
  await expect(dlg).toContainText('Mi1', { timeout: 10_000 }); await expect(dlg).toContainText(/41\.[12]\d Hz/);
  const m = /([+-]?\d+\.\d) cents/.exec(await dlg.innerText())!; expect(Math.abs(Number(m[1]))).toBeLessThan(2);
});

test('accordeur : la fermeture libère réellement le micro (pistes terminées)', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any; w.__streams = []; const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async c => { const s = await orig(c); w.__streams.push(s); return s; };
  });
  await page.goto('./'); await page.getByRole('button', { name: 'Accordeur' }).click(); await expect(page.getByRole('dialog')).toContainText('cents', { timeout: 10_000 });
  const live = () => page.evaluate(() => (window as any).__streams.flatMap((s: MediaStream) => s.getTracks()).filter((t: MediaStreamTrack) => t.readyState === 'live').length);
  expect(await live()).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Fermer' }).click(); await expect.poll(live).toBe(0);
});

test('l’accordeur ouvert pendant un exercice ne coupe pas le micro de l’exercice (comptage des utilisateurs)', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any; w.__streams = []; const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async c => { const s = await orig(c); w.__streams.push(s); return s; };
  });
  const live = () => page.evaluate(() => (window as any).__streams.flatMap((s: MediaStream) => s.getTracks()).filter((t: MediaStreamTrack) => t.readyState === 'live').length);
  await page.goto('./#/manche'); await page.getByText('Chasse aux notes').click(); await page.getByRole('button', { name: /Commencer/ }).click();
  await expect.poll(live).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Accordeur' }).click(); await expect(page.getByRole('dialog')).toContainText('cents', { timeout: 10_000 });
  await page.getByRole('button', { name: 'Fermer' }).click(); await page.waitForTimeout(500);
  expect(await live()).toBeGreaterThan(0); // l'exercice écoute toujours
  await page.getByRole('button', { name: 'Quitter' }).click(); await expect.poll(live).toBe(0);
});

test('Jam : les mesures avancent, l’enregistrement est sauvegardé et exportable en WAV non saturé', async ({ page }) => {
  await page.goto('./#/jam'); await page.locator('label:has-text("Enregistrer") select').selectOption('mix');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  const bars = new Set<string>();
  for (let i = 0; i < 24; i++) { await page.waitForTimeout(250); const m = (await page.locator('[aria-live=polite]').first().innerText()).match(/mesure (\d+)/); if (m) bars.add(m[1]); }
  expect(bars.size).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Arrêter' }).click(); await expect(page.getByText('Enregistrement sauvegardé')).toBeVisible({ timeout: 10_000 });
  await page.goto('./#/enregistrements'); await expect(page.getByText(/basse \+ accompagnement/)).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exporter WAV' }).click()]);
  const buf = readFileSync(await dl.path()); expect(buf.slice(0, 4).toString()).toBe('RIFF'); expect(buf.slice(8, 12).toString()).toBe('WAVE');
  let peak = 0; for (let i = 44; i < buf.length - 1; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
  expect(peak).toBeGreaterThan(500); expect(peak).toBeLessThan(32000);
});

test('import audio : ralenti sans changer la hauteur et boucle A-B', async ({ page }) => {
  await page.goto('./#/fichier'); await page.setInputFiles('input[type=file]', 'e2e/.tmp/e1.wav'); await page.waitForSelector('canvas');
  await page.getByRole('button', { name: '50%' }).click();
  await expect.poll(() => page.evaluate(() => { const a = document.querySelector('audio')!; return [a.playbackRate, a.preservesPitch]; })).toEqual([0.5, true]);
  await page.getByRole('button', { name: 'A ici' }).click(); await page.getByRole('button', { name: 'B ici' }).click();
  await expect(page.getByText(/A : 0:00 · B : 0:00/)).toBeVisible();
});

test('groove : un exercice complet se termine par un bilan (clic qui disparaît)', async ({ page }) => {
  await page.goto('./#/groove'); await page.getByRole('button', { name: 'Croches', exact: true }).click(); await page.getByRole('button', { name: /Continuer sans calibration/ }).click();
  await page.locator('input[type=range]').evaluate((el: HTMLInputElement) => { el.value = '200'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('select').nth(0).selectOption('4'); await page.locator('select').nth(1).selectOption('2');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await expect(page.getByText('Conseil du prof')).toBeVisible({ timeout: 40_000 });
});

test('improvisation : Question/réponse alterne écoute et réponse puis donne un bilan', async ({ page }) => {
  await page.goto('./#/impro'); await page.getByText('Question / réponse').click(); await page.getByRole('button', { name: /Continuer sans calibration/ }).click();
  await page.locator('input[type=range]').evaluate((el: HTMLInputElement) => { el.value = '140'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await expect(page.getByText('Écoutez', { exact: true })).toBeVisible({ timeout: 10_000 }); await expect(page.getByText('À vous de répondre !')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Conseil du prof')).toBeVisible({ timeout: 70_000 });
});
