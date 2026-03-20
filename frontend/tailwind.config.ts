import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        navy: {
          950: '#070B12',
          900: '#0F1623',
          800: '#161E2E',
          700: '#1E2A3E',
          600: '#263550',
        },
        accent: {
          blue: '#3B82F6',
          emerald: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
        },
      },
      animation: {
        'fade-slide': 'fadeSlide 0.3s ease forwards',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
        'progress-fill': 'progressFill 0.4s ease',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeSlide: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
