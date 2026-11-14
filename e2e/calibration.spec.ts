import { test, expect } from '@playwright/test';

test('la calibration de latence est requise avant un exercice de rythme, puis la saisie manuelle la valide', async ({ page }) => {
  await page.goto('./#/groove'); await page.getByRole('button', { name: 'Noires', exact: true }).click();
  await expect(page.getByText('Calibration de latence requise')).toBeVisible(); await expect(page.getByRole('button', { name: 'Démarrer' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Calibrer maintenant' }).click(); await expect(page.getByRole('heading', { name: 'Matériel' })).toBeVisible();
  await page.getByLabel('USB (ms)').fill('35'); await page.getByLabel('USB (ms)').blur();
  await page.goto('./#/groove'); await page.getByRole('button', { name: 'Noires', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Démarrer' })).toBeVisible(); await expect(page.getByText('Calibration de latence requise')).toHaveCount(0);
});

test('la calibration est propre à chaque mode : le mode Bluetooth redemande une calibration', async ({ page }) => {
  await page.goto('./#/materiel'); await page.getByLabel('USB (ms)').fill('35'); await page.getByLabel('USB (ms)').blur();
  await page.getByText("Réglages avancés de l'entrée").click(); await page.locator('label', { hasText: /^Mode/ }).locator('select').selectOption('bluetooth');
  await page.goto('./#/groove'); await page.getByRole('button', { name: 'Noires', exact: true }).click(); await expect(page.getByText('Calibration de latence requise')).toBeVisible();
});

test('une calibration automatique sans notes jouées ne valide rien', async ({ page }) => {
  await page.goto('./#/materiel'); await page.getByRole('button', { name: /^Calibrer/ }).click(); await expect(page.getByText(/Mesure impossible/)).toBeVisible({ timeout: 30_000 });
  await page.goto('./#/groove'); await page.getByRole('button', { name: 'Noires', exact: true }).click(); await expect(page.getByText('Calibration de latence requise')).toBeVisible();
});

test('un réglage modifié aussitôt après l’ouverture n’est pas écrasé par le chargement (course au démarrage)', async ({ browser }) => {
  for (let i = 0; i < 8; i++) {
    const ctx = await browser.newContext(); const p = await ctx.newPage();
    await p.goto('./#/reglages'); await p.getByLabel('Thème').selectOption(i % 2 ? 'dark' : 'light'); await p.reload();
    await expect(p.locator('html')).toHaveAttribute('data-theme', i % 2 ? 'dark' : 'light'); await ctx.close();
  }
});
