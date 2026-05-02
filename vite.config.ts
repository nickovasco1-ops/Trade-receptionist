import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Sentry source-map upload — runs automatically on every build when auth token is present.
    // Set SENTRY_AUTH_TOKEN in Railway build env to activate. Org/project are not secrets.
    const sentryPlugin = env.SENTRY_AUTH_TOKEN
      ? sentryVitePlugin({
          org:       'trade-receptionist',
          project:   'javascript-react',
          authToken: env.SENTRY_AUTH_TOKEN,
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          release:   { setCommits: { auto: true } },
        })
      : null;

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api/, ''),
          },
        },
      },
      plugins: [react(), tailwindcss(), ...(sentryPlugin ? [sentryPlugin] : [])],
      // No server-side secrets in `define` — Gemini API is no longer called from the
      // browser (AudioPlayer uses a pre-rendered static WAV file).
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
      },
      build: {
        // Hidden source maps: uploaded to Sentry, never served to browser
        sourcemap: 'hidden',
        chunkSizeWarningLimit: 600,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
              'vendor-icons':    ['lucide-react'],
              'vendor-sentry':   ['@sentry/react'],
              'vendor-supabase': ['@supabase/supabase-js'],
            },
          },
        },
      },
    };
});
