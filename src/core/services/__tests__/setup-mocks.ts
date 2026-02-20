// @/core/services/__tests__/setup-mocks.ts
import { vi } from 'vitest';

/**
 * ⚠️ IMPORTANTE: Este arquivo DEVE ser importado PRIMEIRO em cada teste,
 * ANTES de qualquer outro import que use web-push, supabase, next, etc.
 *
 * Ordem correta em cada spec:
 * 1. import './setup-mocks'   ← PRIMEIRO, sempre
 * 2. import { describe, ... } from 'vitest'
 * 3. import { funcao } from '../arquivo.service'
 */

// =========================================================================
// MOCKS DE MÓDULOS EXTERNOS (executados em tempo de hoisting pelo Vitest)
// =========================================================================

// 1. web-push — deve vir antes de qualquer import que carregue web-push-admin
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
}));

// 2. Wrappers internos de notificação
vi.mock('@/lib/web-push-admin', () => ({
  sendPushNotification: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/services/notification.service', () => ({
  createInternalNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// 3. Next.js — cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  // unstable_cache passa os args diretamente para a fn, simulando sem cache
  unstable_cache: vi.fn(
    (fn: (...args: any[]) => any) =>
      (...args: any[]) =>
        fn(...args),
  ),
}));

// 4. Next.js — navigation (redirect lança erro igual ao Next real)
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const err = new Error('NEXT_REDIRECT');
    (err as any).digest = `NEXT_REDIRECT;replace;${url};303;`;
    throw err;
  }),
}));

// 5. Next.js — headers (cookies e headers server-side)
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      set: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    }),
  ),
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((key: string) => (key === 'host' ? 'localhost:3000' : null)),
    }),
  ),
}));

// 6. Supabase — todos os clientes são mockados; implementações são fornecidas
//    em cada teste via vi.mocked(...).mockResolvedValue(mockSupabase)
vi.mock('@/lib/supabase.server');

// 7. Google Auth — evita chamadas reais ao OAuth
vi.mock('@/lib/google-auth');

// 8. JWT (jose) — SignJWT retorna token fixo; permite spy de .sign nos testes
vi.mock('jose', () => ({
  SignJWT: class MockSignJWT {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_payload: unknown) {}
    setProtectedHeader(_header: unknown) {
      return this;
    }
    sign(_key: unknown): Promise<string> {
      return Promise.resolve('mock-jwt-token');
    }
  },
}));

// 9. Auth context — mockado globalmente; cada teste sobrescreve com mockResolvedValue
vi.mock('../auth-context.service');

// 10. Google Drive service — evita chamadas reais à API do Drive
vi.mock('../google-drive.service', () => ({
  getFolderPhotos: vi.fn(),
}));

// 11. Helpers de limite/revalidação — mockados para isolar o serviço testado
//     CRÍTICO: sem este mock, checkGalleryLimit faz queries reais ao Supabase
vi.mock('@/core/utils/galeria-limit.helper', () => ({
  checkGalleryLimit: vi.fn(),
  checkReactivationLimit: vi.fn(),
}));

vi.mock('@/core/utils/galeria-revalidation.helper', () => ({
  revalidateGalleryCache: vi.fn(),
  getGalleryRevalidationData: vi.fn(),
}));

// 12. galeria.actions — syncUserGalleriesAction é chamado após restaurar/desarquivar
vi.mock('@/actions/galeria.actions', () => ({
  syncUserGalleriesAction: vi.fn().mockResolvedValue({ success: true }),
}));

// =========================================================================
// VARIÁVEIS DE AMBIENTE
// =========================================================================

export const setupEnvironment = () => {
  vi.stubEnv('JWT_GALLERY_SECRET', '12345678901234567890123456789012');
  vi.stubEnv('NEXT_PUBLIC_MAIN_DOMAIN', 'suagaleria.com');
  vi.stubEnv(
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'BNoPwC8Q3ks4WK7x5xXk9Z0vX_L8wVwFxP7Rq8c9wK3L',
  );
  vi.stubEnv(
    'VAPID_PRIVATE_KEY',
    'xYzAbC123dEfGhI456jKlMnO789pQrStU012vWxYz345',
  );
  vi.stubEnv('NEXT_PUBLIC_EMAIL', 'contact@suagaleria.com');
};

// Executa imediatamente ao importar o arquivo
setupEnvironment();

// =========================================================================
// GLOBALS
// =========================================================================

export const setupGlobalFetch = () => {
  vi.stubGlobal('fetch', vi.fn());
};

setupGlobalFetch();
