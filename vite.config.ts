import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Sentry source-map upload only runs when auth token is present (CI / Railway)
    const sentryPlugin = env.SENTRY_AUTH_TOKEN
      ? sentryVitePlugin({
          org:       env.SENTRY_ORG,
          project:   env.SENTRY_PROJECT,
          authToken: env.SENTRY_AUTH_TOKEN,
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
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
      define: {
        'process.env.API_KEY':        JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
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
              'vendor-react':  ['react', 'react-dom'],
              'vendor-icons':  ['lucide-react'],
              'vendor-genai':  ['@google/genai'],
              'vendor-sentry': ['@sentry/react'],
            },
          },
        },
      },
    };
});
