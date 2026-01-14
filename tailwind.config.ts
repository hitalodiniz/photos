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
        champagne: {
          DEFAULT: '#FFF9F0',
          dark: '#F3E5AB',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: 'rgba(212, 175, 55, 0.15)',
        },
        'error-red': '#B3261E',
        'google-text': '#3C4043',
      },
      fontFamily: {
        // Agora artistic e sans usam Montserrat
        artistic: ['var(--font-montserrat)', 'sans-serif'],
        sans: ['var(--font-montserrat)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
