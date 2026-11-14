import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
const base = 'http://localhost:4173/Basse-apprentissage-/';
export default defineConfig({
  testDir: 'e2e', timeout: 120_000, workers: 1, retries: 0, reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: base, viewport: { width: 420, height: 900 }, permissions: ['microphone'], acceptDownloads: true,
    launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${resolve('e2e/.tmp/e1.wav')}`, '--autoplay-policy=no-user-gesture-required'] },
  },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: base, reuseExistingServer: true, timeout: 180_000 },
});
