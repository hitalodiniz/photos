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
        sans: ['var(--font-montserrat)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-barlow)', 'ui-monospace', 'SFMono-Regular'],
      },
      colors: {
        // Luxury Editorial Photography Official Palette
        champagne: {
          DEFAULT: '#F3E5AB',
          hover: '#E5D69A',
        },
        gold: {
          DEFAULT: '#D4AF37',
          //DEFAULT: '#F3E5AB',
          light: 'rgba(243,229,171,0.15)',
          glow: 'rgba(243,229,171,0.3)',
          // light: 'rgba(212, 175, 55, 0.15)',
          // glow: 'rgba(212, 175, 55, 0.3)',
        },
        petroleum: {
          DEFAULT: '#00212E',
          light: '#002D3F', // Para hovers sutis em fundos escuros
          dark: '#001822',
        },

        'luxury-bg': '#F8F9FA', // Fundo claro para o dashboard
      },
      // Padronização de Tracking (Letter Spacing)
      letterSpacing: {
        'luxury-tight': '-0.02em', // Para Títulos H1/H2
        'luxury-normal': '0em', // Para parágrafos
        'luxury-wide': '0.15em', // Para Labels, Botões e Microcopy (Editorial)
        'luxury-widest': '0.25em', // Para Labels, Botões e Microcopy (Editorial)
      },
      borderRadius: {
        luxury: '0.75rem',
        'luxury-sm': '0.375rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
