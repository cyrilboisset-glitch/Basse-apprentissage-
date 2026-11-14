import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/Basse-apprentissage-/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'BassLab', short_name: 'BassLab', lang: 'fr',
        description: "Apprendre l'improvisation à la basse",
        theme_color: '#111418', background_color: '#111418',
        display: 'standalone', start_url: '.', scope: '.',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json,wav}'] },
    }),
  ],
  test: { environment: 'node' },
});
