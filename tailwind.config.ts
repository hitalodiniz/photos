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
        //Vinculando as classes do Tailwind às variáveis do globals.css
        champagne: {
          DEFAULT: 'var(--color-champagne)',
          dark: 'var(--color-champagne-dark)',
        },
        gold: {
          DEFAULT: 'var(--color-gold)',
          light: 'var(--color-gold-light)',
        },
        'error-red': 'var(--color-error-red)',
        'google-text': 'var(--color-text-google)',
      },
      fontFamily: {
        // Adicionando suporte para a fonte artística Playfair
        artistic: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
