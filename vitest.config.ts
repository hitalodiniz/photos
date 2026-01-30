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
      reporter: ['text', 'json', 'html'], // 'text' mostra no terminal, 'html' cria um site
      include: ['src/core/services/**/*.ts'], // Foca nos seus services
      exclude: ['**/*.spec.ts', 'node_modules/**'],
    },
  },
});
