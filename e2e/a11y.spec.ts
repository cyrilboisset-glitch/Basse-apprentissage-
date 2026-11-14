import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const routes = ['#/', '#/manche', '#/pratique', '#/impro', '#/groove', '#/jam', '#/vocabulaire', '#/oreille', '#/theorie', '#/outils', '#/materiel', '#/diagnostic', '#/reglages', '#/bord', '#/placement', '#/fichier', '#/enregistrements', '#/seance'];
for (const theme of ['dark', 'light'] as const) test(`accessibilité (axe, WCAG 2.1 AA) : aucun défaut en thème ${theme}`, async ({ page }) => {
  await page.goto('./#/reglages'); await page.getByLabel('Thème').selectOption(theme);
  const bad: string[] = [];
  for (const r of routes) {
    await page.goto('./' + r); await page.waitForTimeout(400); await page.evaluate(axe);
    const res = await page.evaluate(() => (window as any).axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }));
    for (const v of res.violations) bad.push(`${r} ${v.id} (${v.impact}): ${v.nodes[0].html.slice(0, 80)}`);
  }
  expect(bad).toEqual([]);
});
