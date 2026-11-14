import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__writes = []; const ls: Record<string, any[]> = {};
    const ch = { startNotifications: async () => {}, writeValueWithoutResponse: async (v: Uint8Array) => { (window as any).__writes.push(Array.from(v)); }, addEventListener: (t: string, l: any) => { (ls[t] ||= []).push(l); }, removeEventListener: () => {} };
    (window as any).__notify = (b: number[]) => (ls.characteristicvaluechanged || []).forEach(l => l({ target: { value: new DataView(new Uint8Array(b).buffer) } }));
    const dev = { name: 'NUX MIGHTY PLUG PRO', addEventListener: () => {}, removeEventListener: () => {}, gatt: { connected: false, connect: async () => ({ getPrimaryService: async () => ({ getCharacteristic: async () => ch }) }), disconnect() {} } };
    Object.defineProperty(navigator, 'bluetooth', { value: { requestDevice: async () => dev }, configurable: true });
  });
});

test('Plug Pro : connexion, preset, volume, accordeur Plug Pro alimenté par notifications', async ({ page }) => {
  await page.goto('./#/materiel'); await page.getByRole('button', { name: 'Connecter le Plug Pro' }).click(); await expect(page.getByText('connecté (NUX MIGHTY PLUG PRO)')).toBeVisible();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.getByLabel('Volume du Plug Pro').evaluate((el: HTMLInputElement) => { el.value = '50'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect.poll(() => page.evaluate(() => (window as any).__writes)).toEqual([[128, 128, 192, 2], [128, 128, 176, 73, 64]]);
  await page.getByRole('button', { name: 'Accordeur', exact: true }).click(); await page.getByRole('tab', { name: 'Plug Pro' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__writes.some((w: number[]) => w[2] === 240))).toBe(true); // l'écran est abonné quand l'accordeur est activé
  await page.evaluate(() => { const n = (window as any).__notify; n([128, 128, 176, 11, 1]); n([128, 128, 176, 12, 7]); n([128, 128, 176, 72, 38]); });
  await expect(page.getByRole('dialog')).toContainText('Mi'); await expect(page.getByRole('dialog')).toContainText('-12.0 cents');
});

test('Plug Pro : sans Web Bluetooth, la section est désactivée sans erreur', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'bluetooth', { value: undefined, configurable: true }); });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('./#/materiel'); await expect(page.getByText(/Web Bluetooth indisponible/).first()).toBeVisible(); expect(errors).toEqual([]);
});
