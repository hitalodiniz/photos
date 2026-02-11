import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@photos/core-auth': path.resolve(
        __dirname,
        './packages/@photos/core-auth/src/index.ts',
      ),
    },
  },
  test: {
    globals: true, // Permite usar 'describe', 'it', 'expect' sem importar
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'], // <--- O segredo está aqui
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://uxbakxnl.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-key',
      NEXT_PUBLIC_EMAIL: 'app.suagaleria@gmail.com',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      // 🎯 Expandindo para pegar todas as pastas lógicas do projeto
      include: [
        'src/core/services/**/*.ts',
        'src/features/**/*.ts',
        'src/features/**/*.tsx',
        'src/actions/**/*.ts',
      ],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        'node_modules/**',
        'src/core/types/**', // Geralmente não testamos arquivos de apenas tipos
        'src/components/ui/**', // Opcional: remover se forem apenas componentes visuais (shadcn)
      ],
    },
  },
});
