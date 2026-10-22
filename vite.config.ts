import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as {
  version: string;
};
// GitHub Pages serves the app below /<repository>/; local builds and tests use the root.
const base = process.env.BASE_PATH ?? '/';
function commit() {
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

// `--mode https` serves dev/preview with a self-signed certificate so the camera works in the LAN.
export default defineConfig(({ mode }) => ({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit()),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  // Without caching headers, iOS Safari may keep serving an old index.html over plain HTTP.
  preview: { headers: { 'Cache-Control': 'no-cache' } },
  plugins: [
    react(),
    mode === 'https' && basicSsl({ name: 'trackyourself' }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'TrackYourself',
        short_name: 'TrackYourself',
        description: 'Ernährung, Aktivität und Gewicht. Lokal und offline.',
        lang: 'de',
        theme_color: '#164e45',
        background_color: '#f5f7f3',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/{unit,component}/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      skipFull: false,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
      thresholds: {
        lines: 80,
        'src/domain/**': {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  },
}));
