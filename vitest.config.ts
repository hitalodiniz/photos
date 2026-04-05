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
    globals: true,
    silent: true,

    // verbose com singleFork mostra describe > it agrupados sem repetir o path.
    // singleFork serializa os arquivos — mais lento, mas output limpo.
    reporter: ['verbose'],

    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/tests/**',
      '**/playwright/**',
      '**/*.e2e.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://uxbakxnl.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-key',
      NEXT_PUBLIC_EMAIL: 'app.suagaleria@gmail.com',
    },

    // Vitest 4: poolOptions removido, opções são top-level dentro de forks: {}
    pool: 'forks',
    forks: {
      isolate: false,
      singleFork: true,
    },

    maxWorkers: 2,
    minWorkers: 1,
    logHeapUsage: true,
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
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
        'src/core/types/**',
        'src/components/ui/**',
      ],
    },
  },
});
