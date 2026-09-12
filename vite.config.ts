import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/lsd/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        id: '/lsd/',
        name: 'LSD — Lausanne Shift Driver',
        short_name: 'LSD',
        description: 'A smoother trip through every shift.',
        lang: 'it',
        start_url: '/lsd/',
        scope: '/lsd/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#282A36',
        theme_color: '#282A36',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
