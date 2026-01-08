// vitest.setup.ts
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Limpa o DOM após cada teste para evitar poluição entre testes
afterEach(() => {
  cleanup();
});

import { webcrypto } from 'node:crypto';

// Força a injeção mesmo que o JSDOM tente proteger o objeto
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true,
  enumerable: true,
  writable: true,
});

// Às vezes o jose busca especificamente no global (Node antigo)
if (typeof global !== 'undefined' && !global.crypto) {
  (global as any).crypto = webcrypto;
}
// 1. Criamos uma função que gera o objeto de mock sempre limpo e completo
const createMockClient = () => {
  const mock = {
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
    // O "segredo" para o await funcionar em queries encadeadas
    then: vi
      .fn()
      .mockImplementation((resolve) => resolve({ data: [], error: null })),
  };
  return mock;
};

// 2. Instância única para ser usada nos testes
const singletonMock = createMockClient();

// 3. Mock do Supabase Server
vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(() => singletonMock),
  createSupabaseServerClientReadOnly: vi.fn(() => singletonMock),
}));

// 4. Mocks Globais de Infraestrutura
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

// Exportamos a instância única para que você possa usar nos arquivos .test.ts
export { singletonMock as mockSupabaseClient };
