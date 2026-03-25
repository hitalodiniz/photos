import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // 🚀 CORREÇÃO DE FONTE:
        // Adicionamos fallback explícito para Sans-Serif.
        // Se a Montserrat falhar, ele NUNCA cairá na Times (serifada).
        sans: [
          'var(--font-montserrat)',
          'Inter', // Fallback premium intermediário
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        // Barlow é excelente para números e dados técnicos (mono-ish)
        mono: [
          'var(--font-barlow)',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      colors: {
        // 🚀 MELHORIA DE PERFORMANCE:
        // Usando o formato de função para <alpha-value> garante que
        // classes como bg-champagne/50 funcionem perfeitamente.
        champagne: {
          DEFAULT: 'rgb(var(--color-champagne) / <alpha-value>)',
          hover: 'rgb(var(--color-champagne-hover) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--color-gold) / <alpha-value>)',
          light: 'rgb(var(--color-gold) / 0.15)',
          glow: 'rgb(var(--color-gold) / 0.3)',
        },
        petroleum: {
          DEFAULT: 'rgb(var(--color-petroleum) / <alpha-value>)',
          light: 'rgb(var(--color-petroleum-light) / <alpha-value>)',
          dark: 'rgb(var(--color-petroleum-dark) / <alpha-value>)',
          surface: 'rgb(var(--color-petroleum) / 0.9)',
        },
        'luxury-bg': 'rgb(var(--color-luxury-bg) / <alpha-value>)',
        'surface-dark': 'rgb(var(--color-surface-dark) / <alpha-value>)',
        'surface-mixed': 'rgb(var(--color-surface-mixed) / <alpha-value>)',
        'status-success': 'rgb(var(--color-status-success) / <alpha-value>)',
      },
      letterSpacing: {
        'luxury-tight': '-0.02em', // H1, H2
        'luxury-normal': '0em', // Body
        'luxury-wide': '0.12em', // Labels (mais legível que 0.15)
        'luxury-widest': '0.22em', // Editorial (mais equilibrado que 0.25)
      },
      borderRadius: {
        'luxury-xl': '2rem',
        'luxury-lg': '1.25rem',
        luxury: '0.5rem', // 8px é o padrão ouro para botões premium
        'luxury-sm': '0.375rem',
      },
      boxShadow: {
        'luxury-gold': '0 10px 40px -10px rgba(212, 175, 55, 0.25)',
        'luxury-soft': '0 20px 50px -12px rgba(5, 38, 51, 0.08)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [typography],
};

export default config;
