import { test, expect } from '@playwright/test';

/** Test d'endurance (fuites) : `SOAK=1 SOAK_SECONDS=120 npm run e2e -- soak`. Désactivé par défaut (long). */
test.skip(!process.env.SOAK, 'SOAK=1 pour lancer');
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=e2e/.tmp/e1.wav', '--autoplay-policy=no-user-gesture-required', '--js-flags=--expose-gc'] } });

test('Jam en boucle + micro actif : mémoire JS et nœuds audio se stabilisent', async ({ page }) => {
  const secs = Number(process.env.SOAK_SECONDS ?? 120); test.setTimeout((secs + 60) * 1000);
  const cdp = await page.context().newCDPSession(page); let live = 0; const ids = new Set<string>();
  cdp.on('WebAudio.audioNodeCreated', (e: any) => { ids.add(e.node.nodeId); live++; }); cdp.on('WebAudio.audioNodeWillBeDestroyed', (e: any) => { if (ids.delete(e.nodeId)) live--; });
  await cdp.send('WebAudio.enable');
  await page.goto('./#/materiel'); await page.getByLabel('Note commande').check(); // garde l'entrée audio (worklet) active
  await page.goto('./#/jam'); await page.locator('input[type=range]').first().evaluate((el: HTMLInputElement) => { el.value = '150'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('label:has-text("Nombre de tours") select').selectOption('0'); await page.getByRole('button', { name: 'Démarrer' }).click();
  const samples: { t: number; heapMB: number; nodes: number; dom: number }[] = [];
  const sample = async (t: number) => {
    await page.evaluate(() => (window as any).gc()); await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(300);
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x: any) => [x.name, x.value]));
    samples.push({ t, heapMB: +(m.JSHeapUsedSize / 1e6).toFixed(2), nodes: live, dom: m.Nodes });
  };
  await cdp.send('Performance.enable'); const step = Math.max(10, Math.floor(secs / 8));
  for (let t = 0; t <= secs; t += step) { if (t) await page.waitForTimeout(step * 1000); await sample(t); }
  console.log('t(s)  tas JS (Mo)  nœuds audio vivants  nœuds DOM'); samples.forEach(s => console.log(`${String(s.t).padStart(4)}  ${String(s.heapMB).padStart(10)}  ${String(s.nodes).padStart(19)}  ${String(s.dom).padStart(9)}`));
  // Les nœuds audio en vol varient d'une mesure à l'autre : on compare les moyennes des deux moitiés (après échauffement).
  const body = samples.slice(1), h = Math.floor(body.length / 2), mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const first = body.slice(0, h), second = body.slice(-h);
  expect(mean(second.map(x => x.heapMB)) - mean(first.map(x => x.heapMB)), 'croissance du tas JS (Mo)').toBeLessThan(1);
  expect(mean(second.map(x => x.nodes)) - mean(first.map(x => x.nodes)), 'croissance des nœuds audio vivants').toBeLessThan(40);
  expect(second.at(-1)!.dom - first[0].dom, 'croissance du DOM').toBeLessThan(20);
});
