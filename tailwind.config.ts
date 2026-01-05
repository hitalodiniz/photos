import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 🎯 Definindo como HEX para permitir modificadores de opacidade (ex: gold/50)
        champagne: {
          DEFAULT: '#FFF9F0',
          dark: '#F3E5AB',
        },
        gold: {
          DEFAULT: '#D4AF37',
          // Para cores com transparência fixa, o RGBA funciona bem aqui
          light: 'rgba(212, 175, 55, 0.15)',
        },
        // Cores secundárias podem manter a referência à variável se não usar /opacidade
        'error-red': '#B3261E',
        'google-text': '#3C4043',
      },
      fontFamily: {
        artistic: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
