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
      colors: {
        // Luxury Editorial Photography Official Palette
        champagne: {
          DEFAULT: '#F3E5AB',
          hover: '#E5D69A',
        },
        gold: {
          // DEFAULT: '#D4AF37',
          DEFAULT: '#F3E5AB',
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
        'editorial-ink': 'rgba(0, 33, 46, 0.9)', // Azul Petróleo para textos
        'editorial-gray': 'rgba(0, 33, 46, 0.9)', // Azul Petróleo Profundo (Opacidade Suave)
      },
      letterSpacing: {
        'luxury': '0.1em', // tracking-widest editorial
      },
      borderRadius: {
        'luxury': '0.75rem', // Arredondamento padrão
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;