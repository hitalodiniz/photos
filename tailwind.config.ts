import style from 'styled-jsx/style';
import type { Config } from 'tailwindcss';

const config: Config = {
  // Lista TODOS os caminhos onde as classes Tailwind são usadas
  content: [
    // Varre as pastas pages/components/app na raiz
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    // Varre a pasta src inteira (onde estão os arquivos admin e galeria)
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Exemplo de cores customizadas
      colors: {
        'brand-primary': '#104F55',
        'brand-secondary': '#FFD700',
      },
      // Exemplo de fonte customizada (se não usar o globals.css para Barlow)
      // fontFamily: {
      //   barlow: ['Barlow', 'sans-serif'],
      // },
    },
  },
  plugins: [],
};

export default config;
