// @/core/services/__tests__/galeria.test-setup.ts
// ⚠️ IMPORTANTE: setup-mocks DEVE ser importado PRIMEIRO!
import './setup-mocks';
import { vi } from 'vitest';

// =========================================================================
// DADOS DE MOCK COMPARTILHADOS
// =========================================================================

export const mockUserId = 'user-123';

export const mockProfile = {
  id: mockUserId,
  username: 'hitalo',
  full_name: 'Hitalo S.',
  plan_key: 'PRO',
  is_trial: false,
  use_subdomain: true,
  operating_cities: [],
  profile_picture_url: null,
  background_url: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  settings: {},
  message_templates: {},
};

export const mockGalleryBase = {
  id: 'gal-123',
  title: 'Festa de Teste',
  date: '2026-01-01',
  slug: 'hitalo/2026/01/01/festa-de-teste',
  drive_folder_id: 'folder-123',
  drive_folder_name: 'Festa 2026',
  client_name: 'João Silva',
  is_public: true,
  is_archived: false,
  is_deleted: false,
  show_on_profile: true,
  user_id: mockUserId,
  password: null,
  photo_count: 50,
  cover_image_ids: null,
  cover_image_url: null,
  zip_url_social: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// =========================================================================
// FACTORY DE MOCK SUPABASE
// =========================================================================

/**
 * Cria instâncias frescas de mockSupabase e mockQueryBuilder para cada teste.
 *
 * IMPORTANTE: Como todos os métodos de query do Supabase são encadeáveis
 * (select().eq().single()), o mockQueryBuilder retorna `this` por padrão.
 * Apenas os métodos terminais (single, maybeSingle, order encadeado ao final,
 * etc.) precisam resolver valores — esses são sobrescritos em cada teste.
 */
export const createMockSupabase = () => {
  const mockQueryBuilder: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    // Terminais com resolução padrão segura (sobrescreva nos testes)
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const mockSupabase = {
    from: vi.fn(() => mockQueryBuilder),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      }),
    },
  };

  return { mockSupabase, mockQueryBuilder };
};

// Re-exporta para que os spec files não precisem importar setup-mocks diretamente
export { setupEnvironment, setupGlobalFetch } from './setup-mocks';
