// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Alterado para 'class' para maior controle em modais premium
  theme: {
    extend: {
      fontFamily: {
        // Unificando: 'sans' agora é o padrão global
        sans: [
          'var(--font-montserrat)',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: ['var(--font-barlow)', 'monospace'],
      },
      colors: {
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
      // Adicione animações para o "X" do input e transições de modo
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out',
      },
      // Padronização de Tracking (Letter Spacing)
      letterSpacing: {
        'luxury-tight': '-0.02em', // Para Títulos H1/H2
        'luxury-normal': '0em', // Para parágrafos
        'luxury-wide': '0.15em', // Para Labels, Botões e Microcopy (Editorial)
        'luxury-widest': '0.25em', // Para Labels, Botões e Microcopy (Editorial)
      },
      borderRadius: {
        'luxury-xl': '2rem', // Para os cards grandes de decisão
        'luxury-lg': '1.5rem', // Para a barra de busca
        luxury: '0.75rem', // Para botões
        'luxury-sm': '0.375rem',
      },
      boxShadow: {
        'luxury-gold': '0 10px 40px -10px rgba(212, 175, 55, 0.3)',
        'luxury-soft': '0 20px 50px -12px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
