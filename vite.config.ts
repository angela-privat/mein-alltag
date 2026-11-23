/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Die App liegt später unter https://angela-privat.github.io/mein-alltag/
// Darum ist alles auf den Unterordner /mein-alltag/ begrenzt
// (damit „Fit mit Herz“ unter /fit-mit-herz/ nie berührt wird).
const BASIS = '/mein-alltag/';

export default defineConfig({
  base: BASIS,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      scope: BASIS,
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        id: BASIS,
        name: 'Mein Alltag',
        short_name: 'Mein Alltag',
        description: 'Aufgaben, Einkauf, Haushalt, Essen, Finanzen und Notizen – alles an einem Ort, nur auf deinem Handy.',
        lang: 'de',
        dir: 'ltr',
        start_url: BASIS,
        scope: BASIS,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF6F0',
        theme_color: '#5B7F6A',
        categories: ['productivity', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: BASIS + 'index.html',
        cleanupOutdatedCaches: true
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}']
  }
});
