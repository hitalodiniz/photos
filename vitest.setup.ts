// vitest.setup.ts
import { vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

import { webcrypto } from 'node:crypto';

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true,
  enumerable: true,
  writable: true,
});

if (typeof global !== 'undefined' && !global.crypto) {
  (global as any).crypto = webcrypto;
}

// Nota: console.* já está suprimido via silent:true no vitest.config.ts.
// O beforeEach abaixo é mantido como fallback para arquivos que restauram mocks
// explicitamente (vi.restoreAllMocks) e precisam do silenciamento de volta.
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const createMockClient = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'mock-user-id', email: 'teste@fotos.com' } },
      error: null,
    }),
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: {} }, error: null }),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  single: vi
    .fn()
    .mockResolvedValue({ data: { studio_id: 'studio_123' }, error: null }),
  insert: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  storage: {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi
      .fn()
      .mockReturnValue({ data: { publicUrl: 'http://foto.com' } }),
  },
  then: vi
    .fn()
    .mockImplementation((resolve) => resolve({ data: [], error: null })),
});

const singletonMock = createMockClient();

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(() => singletonMock),
  createSupabaseServerClientReadOnly: vi.fn(() => singletonMock),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn, _key, _options) => {
    return (...args: any[]) => fn(...args);
  }),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    cache: actual.cache || ((fn: any) => fn),
  };
});

export { singletonMock as mockSupabaseClient };
