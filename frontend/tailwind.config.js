/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0B1320',
        'bg-deep': '#070C16',
        surface: '#1E2A3A',
        'surface-2': '#243446',
        'surface-3': '#2E4053',
        border: 'rgba(255, 255, 255, 0.06)',
        'border-strong': 'rgba(255, 255, 255, 0.12)',
        primary: {
          DEFAULT: '#14B8A6',
          soft: '#5EEAD4',
          dim: '#0F766E',
        },
        accent: {
          DEFAULT: '#F59E0B',
          soft: '#FCD34D',
        },
        ink: {
          DEFAULT: '#E2E8F0',
          muted: '#94A3B8',
          faint: '#64748B',
        },
        success: '#34D399',
        warn: '#FBBF24',
        danger: '#F87171',
        physics: '#4FD1C5',
        chemistry: '#A3E635',
        biology: '#34D399',
        mathematics: '#FBBF24',
        informatics: '#A78BFA',
        engineering: '#FB923C',
        astronomy: '#818CF8',
        ecology: '#2DD4BF',
        interdisciplinary: '#F472B6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        ticker: '0.18em',
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(20, 184, 166, 0.30), 0 12px 40px -12px rgba(20, 184, 166, 0.45)',
        soft: '0 1px 0 0 rgba(255, 255, 255, 0.04) inset, 0 12px 40px -24px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#E2E8F0',
          },
        },
      },
    },
  },
  plugins: [],
};
