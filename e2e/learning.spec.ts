import { test, expect } from '@playwright/test';

test('quiz visuel : 12 questions, résumé, la carte de chaleur se remplit', async ({ page }) => {
  await page.goto('./#/manche'); await page.getByText('Quiz visuel').click(); await page.getByRole('button', { name: /Commencer/ }).click();
  for (let i = 0; i < 12; i++) { await expect(page.getByRole('heading', { name: 'Quelle est cette note ?' })).toBeVisible(); await page.getByRole('button', { name: 'Do', exact: true }).click(); await page.waitForTimeout(800); }
  await expect(page.getByRole('status')).toContainText('%'); await page.getByRole('button', { name: 'Terminer' }).click();
  await page.getByRole('tab', { name: 'Carte' }).click(); await expect(page.getByText(/ratée \(([1-9]\d*)\)|maîtrisée \(([1-9]\d*)\)/).first()).toBeVisible();
});

test('séance du jour de 10 minutes : plan, étapes, passage, journal', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: '10 min' }).click(); await page.getByRole('link', { name: /Démarrer la séance/ }).click();
  await expect(page.getByRole('heading', { name: /Séance du jour — \d+ min/ })).toBeVisible(); await expect(page.getByText(/Échauffement/)).toBeVisible();
  await page.getByRole('button', { name: "C'est parti" }).click(); await expect(page.getByText('Étape 1/3')).toBeVisible();
  await page.getByRole('button', { name: "Passer l'étape" }).click(); await expect(page.getByText('Étape 2/3')).toBeVisible();
});

test('théorie : lecture, quiz, exercice joué', async ({ page }) => {
  await page.goto('./#/theorie'); await page.getByText('2. Harmonie').click(); await page.getByText('Construire accords et arpèges').click(); await page.getByRole('button', { name: /J'ai lu/ }).click();
  await expect(page.getByText('Question 1 / 2')).toBeVisible(); await page.getByRole('button', { name: '3', exact: true }).click(); await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByRole('button', { name: 'Septième mineure' }).click(); await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.getByText(/Exercice 1 \/ 3/)).toBeVisible();
});

test('théorie : parcours en 4 chapitres, leçon de rythme avec bandeau de figures', async ({ page }) => {
  await page.goto('./#/theorie'); await expect(page.getByText('PROCHAINE LEÇON')).toBeVisible(); await expect(page.getByText('0 / 33')).toBeVisible();
  for (const t of ['1. Bases', '2. Harmonie', '3. Rythme', '4. Jeu de basse']) await expect(page.getByText(t)).toBeVisible();
  await page.getByText('3. Rythme').click(); await page.getByText('Les figures de notes et les silences').click();
  await page.getByRole('button', { name: /J'ai lu/ }).click(); await expect(page.getByText(/Question 1 \//)).toBeVisible();
});

test('oreille : une question d’intervalle reçoit une correction', async ({ page }) => {
  await page.goto('./#/oreille'); await page.getByText('Intervalles').first().click(); await page.getByRole('button', { name: /Commencer/ }).click();
  await expect(page.getByText('Question 1 / 10')).toBeVisible(); await page.getByRole('button', { name: 'Quinte', exact: true }).click(); await expect(page.getByRole('status')).toContainText(/Juste|Non/);
});

test('vocabulaire : 64 phrases, tablature, transposition affichée dans la grille', async ({ page }) => {
  await page.goto('./#/vocabulaire'); await expect(page.getByText(/64 phrases originales/)).toBeVisible();
  await page.getByRole('tab', { name: 'Jazz (walking)' }).click(); await page.getByText('Walking de base II-V-I').click();
  await expect(page.getByRole('img', { name: 'Tablature' })).toBeVisible(); await page.getByLabel('Tonalité').selectOption('G');
  await expect(page.getByText('Grille : Lam7 | Ré7 | Solmaj7 | Solmaj7')).toBeVisible();
});

test('test de positionnement : le repérage visuel conduit à l’étape rythme', async ({ page }) => {
  await page.goto('./#/placement'); await page.getByRole('button', { name: 'Commencer' }).click();
  for (let i = 0; i < 8; i++) { await expect(page.getByText(`Repérage ${i + 1} / 8`)).toBeVisible(); await page.getByRole('button', { name: 'Do', exact: true }).click(); }
  await expect(page.getByRole('heading', { name: 'Rythme' })).toBeVisible();
  await page.getByRole('button', { name: /Passer/ }).click(); await expect(page.getByText('Théorie 1 / 4')).toBeVisible();
});

test('5 cordes : l’accordeur guidé propose Si Mi La Ré Sol et le manche s’adapte sans erreur', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('./#/reglages'); await page.locator('label', { hasText: /^Cordes/ }).locator('select').selectOption('5'); await expect(page.locator('label', { hasText: /^Accordage/ }).locator('select')).toHaveValue('standard5');
  await page.goto('./#/manche'); await page.getByRole('tab', { name: 'Explorer' }).click(); await expect(page.getByRole('img', { name: 'Manche de basse' })).toBeVisible();
  await page.getByRole('tab', { name: 'Exercices' }).click(); await page.getByText('Quiz visuel').click(); await page.getByRole('button', { name: /Commencer/ }).click(); await expect(page.getByRole('heading', { name: 'Quelle est cette note ?' })).toBeVisible();
  await page.getByRole('button', { name: 'Quitter' }).click();
  await page.getByRole('button', { name: 'Accordeur' }).click(); await page.getByLabel('Mode guidé corde par corde').check();
  await expect(page.getByRole('dialog').getByRole('button', { name: /^(Si|Mi|La|Ré|Sol)\d$/ })).toHaveCount(5); expect(errors).toEqual([]);
});

test('accordage personnalisé : Drop D (Ré1 La1 Ré2 Sol2) utilisé par l’accordeur guidé', async ({ page }) => {
  await page.goto('./#/reglages'); await page.locator('label', { hasText: /^Accordage/ }).locator('select').selectOption('custom'); await page.getByLabel('Corde 1').selectOption({ label: 'Ré1' });
  await page.getByRole('button', { name: 'Accordeur' }).click(); await page.getByLabel('Mode guidé corde par corde').check();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Ré1' })).toBeVisible(); await expect(page.getByRole('dialog').getByRole('button', { name: 'Mi1' })).toHaveCount(0);
});

test('boîte à rythmes : modèle, édition d’un pas, lecture et arrêt sans erreur', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('./#/outils'); await expect(page.getByRole('heading', { name: 'Boîte à rythmes' })).toBeVisible();
  const kick1 = page.getByRole('button', { name: 'Grosse caisse pas 1', exact: true }); await expect(kick1).toHaveAttribute('aria-pressed', 'true');
  await kick1.click(); await expect(kick1).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Jouer' }).click(); await page.waitForTimeout(1500); await page.getByRole('button', { name: 'Arrêter' }).last().click(); expect(errors).toEqual([]);
});

test('gammes en positions : certaines manches demandent de relier deux positions', async ({ page }) => {
  await page.goto('./#/reglages'); await page.locator('label', { hasText: /^Tout débloquer/ }).locator('input').check();
  await page.goto('./#/manche'); await page.getByText('Gammes en positions').click();
  let seen = false;
  for (let i = 0; i < 6 && !seen; i++) { await page.getByRole('button', { name: /Commencer/ }).click(); for (let k = 0; k < 8; k++) { const t = await page.locator('h1').last().innerText(); if (/reliez/.test(t)) { seen = true; break; } await page.getByRole('button', { name: 'Passer' }).click(); await page.waitForTimeout(900); } if (!seen) { await page.getByRole('button', { name: 'Quitter' }).click().catch(() => {}); } }
  expect(seen).toBe(true);
});
