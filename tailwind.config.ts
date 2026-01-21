import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'media', // 🎯 O 'media' faz o site seguir o sistema operacional automaticamente
  theme: {
    extend: {
      colors: {
        // Luxury Editorial theme
        champagne: '#F3E5AB', // Champagne
        gold: '#D4AF37', // Gold
        'luxury-bg': '#F8F9FA',
        'gold-light': 'rgba(212, 175, 55, 0.15)',
        'error-red': '#B3261E',
        'google-text': '#3C4043',
        // Azul Petróleo - Cor oficial do sistema
        petroleum: '#00212E', // Azul Petróleo Profundo
      },
      fontFamily: {
        // Agora artistic e sans usam Montserrat
        artistic: ['var(--font-montserrat)', 'sans-serif'],
        sans: ['var(--font-montserrat)', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
