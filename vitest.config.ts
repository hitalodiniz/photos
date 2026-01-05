import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Permite usar 'describe', 'it', 'expect' sem importar
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'], // <--- O segredo está aqui
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    env: {
      SUPANEXT_PUBLIC_BASE_URL: 'https://uxbakxnl.supabase.co',
      SUPABASE_ANON_KEY: 'fake-key',
    },
  },
});
