import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './types.ts',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Figtree', 'sans-serif'],
        body:    ['Figtree', 'sans-serif'],
        display: ['Barlow Condensed', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        void: '#020D18',
        navy: {
          DEFAULT: '#051426',
          mid:     '#0A2340',
          high:    '#0F3060',
        },
        orange: {
          DEFAULT: '#FF6B2B',
          glow:    '#FF8C55',
          soft:    '#ffb59a',
        },
        accent: {
          DEFAULT: '#99cbff',
          glow:    '#60A5FA',
        },
        offwhite: '#F0F4F8',
        // Legacy aliases — keep so components that haven't been updated don't break
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          500: '#FF6B2B',
          600: '#FF6B2B',
          900: '#7c2d12',
        },
        tradeBlue: {
          50:  '#f0f7ff',
          900: '#051426',
          950: '#020D18',
        },
      },
      borderRadius: {
        card:   '16px',
        btn:    '14px',
        button: '14px',
        badge:  '999px',
      },
      transitionTimingFunction: {
        mechanical: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
        precision:  'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        standard:   'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      boxShadow: {
        'orange-glow':    '0 0 24px rgba(255,107,43,0.35), 0 4px 16px rgba(255,107,43,0.20)',
        'orange-glow-lg': '0 0 40px rgba(255,107,43,0.50), 0 8px 24px rgba(255,107,43,0.30)',
        'blue-glow':      '0 0 20px rgba(153,203,255,0.25), 0 4px 12px rgba(153,203,255,0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
