import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getProfileData,
  upsertProfile,
  signOut,
  fetchProfileDirectDB,
  checkSubdomainPermission,
  updateProfileSettings,
  updateSidebarPreference,
  updateCustomCategories,
  processSubscriptionAction,
} from './profile.service';
import {
  createSupabaseServerClient,
  createSupabaseClientForCache,
  createSupabaseServerClientReadOnly,
} from '@/lib/supabase.server';
import { revalidateTag, revalidatePath } from 'next/cache';

// =========================================================================
// MOCKS
// =========================================================================

vi.mock('react', () => ({ cache: vi.fn((fn) => fn) }));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn(
    (fn) =>
      (...args: any[]) =>
        fn(...args),
  ),
}));

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServerClientReadOnly: vi.fn(),
  createSupabaseClientForCache: vi.fn(),
}));

vi.mock('@/actions/revalidate.actions', () => {
  return {
    revalidateUserGalleries: vi.fn().mockResolvedValue(true),
    revalidateProfile: vi
      .fn()
      .mockImplementation(async (username: string, userId: string) => {
        const { revalidateTag, revalidatePath } = await import('next/cache');
        const cleanUsername = username.toLowerCase().trim();

        revalidateTag(`profile-${cleanUsername}`);
        revalidateTag(`profile-data-${cleanUsername}`);
        revalidateTag(`profile-private-${userId}`);
        revalidateTag(`user-profile-data-${userId}`);
        revalidateTag(`profile-galerias-${cleanUsername}`);
        revalidateTag(`user-galerias-${userId}`);

        revalidatePath(`/${cleanUsername}`, 'layout');
        revalidatePath('/dashboard', 'layout');

        return { success: true };
      }),
  };
});

vi.mock('@/core/utils/user-helpers', () => ({
  suggestUsernameFromEmail: vi.fn((email: string) => email.split('@')[0]),
}));

describe('Profile Service', () => {
  const mockUserId = 'user-123';
  const mockUsername = 'hitalo';
  const mockProfile = {
    id: mockUserId,
    username: mockUsername,
    full_name: 'Hitalo Costa',
    plan_key: 'PRO',
    use_subdomain: true,
    profile_picture_url: 'https://cdn.com/avatar.jpg',
    sidebar_collapsed: false,
  };

  const createMockSupabase = () => {
    let callChain: string[] = [];

    const builder: any = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
    };

    // Track das chamadas
    builder.select.mockImplementation(() => {
      callChain.push('select');
      return builder;
    });

    builder.update.mockImplementation(() => {
      callChain.push('update');
      return builder;
    });

    builder.insert.mockImplementation(() => {
      callChain.push('insert');
      return builder;
    });

    // ✅ .eq() baseado no histórico de chamadas
    builder.eq.mockImplementation(() => {
      callChain.push('eq');

      // Se tem 'update' no histórico: retorna Promise + .select()
      if (callChain.includes('update')) {
        const chainWithSelect = {
          select: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: mockProfile, error: null }),
          }),
        };
        return Object.assign(
          Promise.resolve({ data: mockProfile, error: null }),
          chainWithSelect,
        );
      }

      // Caso contrário: continua builder
      return builder;
    });

    builder.single.mockResolvedValue({ data: mockProfile, error: null });
    builder.maybeSingle.mockResolvedValue({ data: mockProfile, error: null });

    const client = {
      from: vi.fn().mockImplementation(() => {
        callChain = []; // Reset chain em cada .from()
        return builder;
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId, email: 'hitalo@test.com' } },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://cdn.com/img.png' },
        }),
      },
    };
    return { client, builder };
  };

  let mockSupabase: any;
  let mockBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { client, builder } = createMockSupabase();
    mockSupabase = client;
    mockBuilder = builder;

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase);
    vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
      mockSupabase,
    );
    vi.mocked(createSupabaseClientForCache).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =================================================================
  // LEITURA
  // =================================================================

  describe('fetchProfileDirectDB', () => {
    it('deve retornar perfil quando encontrado', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const result = await fetchProfileDirectDB(mockUsername);

      expect(result).toEqual(mockProfile);
    });

    it('deve retornar null quando não existe', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await fetchProfileDirectDB('naoexiste');

      expect(result).toBeNull();
    });
  });

  describe('getProfileData', () => {
    it('deve retornar dados do perfil autenticado', async () => {
      const result = await getProfileData();

      expect(result).toEqual({
        success: true,
        user_id: mockUserId,
        profile: mockProfile,
        email: 'hitalo@test.com',
        suggestedUsername: 'hitalo',
      });
    });

    it('deve retornar erro quando não autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await getProfileData();

      expect(result).toEqual({
        success: false,
        error: 'Usuário não autenticado.',
      });
    });
  });

  describe('checkSubdomainPermission', () => {
    it('deve retornar true quando use_subdomain é true', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: { use_subdomain: true },
        error: null,
      });

      const result = await checkSubdomainPermission(mockUsername);

      expect(result).toBe(true);
    });

    it('deve retornar false quando use_subdomain é false', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: { use_subdomain: false },
        error: null,
      });

      const result = await checkSubdomainPermission(mockUsername);

      expect(result).toBe(false);
    });
  });

  // =================================================================
  // MUTAÇÃO - upsertProfile
  // =================================================================

  describe('upsertProfile', () => {
    it('deve retornar erro quando não autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const formData = new FormData();
      const result = await upsertProfile(formData);

      expect(result).toEqual({
        success: false,
        error: 'Sessão expirada.',
      });
    });

    it('deve retornar erro quando campos obrigatórios faltam', async () => {
      const formData = new FormData();
      formData.append('username', '');
      formData.append('full_name', '');

      const result = await upsertProfile(formData, mockSupabase);

      expect(result).toEqual({
        success: false,
        error: 'Nome e Username são obrigatórios.',
      });
    });

    it('deve ativar trial PRO para novo usuário', async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const formData = new FormData();
      formData.append('username', 'novousuario');
      formData.append('full_name', 'Novo Usuário');

      const result = await upsertProfile(formData, mockSupabase);

      expect(result.success).toBe(true);
      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_key: 'PRO',
          is_trial: true,
        }),
      );
    });

    it('deve chamar revalidateProfile após sucesso', async () => {
      const { revalidateProfile } =
        await import('@/actions/revalidate.actions');

      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');

      await upsertProfile(formData, mockSupabase);

      expect(revalidateProfile).toHaveBeenCalledWith(mockUsername, mockUserId);
    });

    it('deve validar revalidações completas', async () => {
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');

      await upsertProfile(formData, mockSupabase);

      expect(revalidateTag).toHaveBeenCalledWith(`profile-${mockUsername}`);
      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-private-${mockUserId}`,
      );
      expect(revalidatePath).toHaveBeenCalledWith(`/${mockUsername}`, 'layout');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard', 'layout');
    });
  });

  // =================================================================
  // MUTAÇÃO - updateProfileSettings
  // =================================================================

  describe('updateProfileSettings', () => {
    const mockSettings = { download_enabled: true, theme: 'dark' as const };
    const mockTemplates = {
      download_message: 'Obrigado!',
      contact_message: 'Contato!',
    };

    it('deve retornar erro quando não autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await updateProfileSettings({
        settings: mockSettings,
        message_templates: mockTemplates,
      });

      expect(result).toEqual({
        success: false,
        error: 'Sessão expirada.',
      });
    });

    it('deve atualizar settings com sucesso', async () => {
      const result = await updateProfileSettings({
        settings: mockSettings,
        message_templates: mockTemplates,
      });

      expect(result.success).toBe(true);
    });

    it('deve chamar revalidateProfile', async () => {
      const { revalidateProfile } =
        await import('@/actions/revalidate.actions');

      await updateProfileSettings({
        settings: mockSettings,
        message_templates: mockTemplates,
      });

      expect(revalidateProfile).toHaveBeenCalledWith(mockUsername, mockUserId);
    });
  });

  // =================================================================
  // MUTAÇÃO - updateSidebarPreference
  // =================================================================

  describe('updateSidebarPreference', () => {
    it('deve atualizar preferência', async () => {
      const result = await updateSidebarPreference(true);

      expect(result.success).toBe(true);
      expect(mockBuilder.update).toHaveBeenCalledWith({
        sidebar_collapsed: true,
      });
    });

    it('deve chamar revalidateProfile', async () => {
      const { revalidateProfile } =
        await import('@/actions/revalidate.actions');

      await updateSidebarPreference(true);

      expect(revalidateProfile).toHaveBeenCalledWith(mockUsername, mockUserId);
    });
  });

  // =================================================================
  // MUTAÇÃO - updateCustomCategories
  // =================================================================

  describe('updateCustomCategories', () => {
    it('deve atualizar categorias', async () => {
      const mockCategories = ['Casamento', 'Ensaio'];
      const result = await updateCustomCategories(mockCategories);

      expect(result.success).toBe(true);
    });

    it('deve chamar revalidateProfile', async () => {
      const { revalidateProfile } =
        await import('@/actions/revalidate.actions');

      await updateCustomCategories(['Casamento']);

      expect(revalidateProfile).toHaveBeenCalledWith(mockUsername, mockUserId);
    });
  });

  // =================================================================
  // MUTAÇÃO - processSubscriptionAction
  // =================================================================

  describe('processSubscriptionAction', () => {
    it('deve processar mudança de plano', async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { username: mockUsername },
          error: null,
        })
        .mockResolvedValueOnce({ data: mockProfile, error: null });

      const result = await processSubscriptionAction(mockUserId, 'PRO');

      expect(result.success).toBe(true);
      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_key: 'PRO',
          is_trial: false,
        }),
      );
    });

    it('deve chamar revalidateProfile', async () => {
      const { revalidateProfile } =
        await import('@/actions/revalidate.actions');

      mockBuilder.single
        .mockResolvedValueOnce({
          data: { username: mockUsername },
          error: null,
        })
        .mockResolvedValueOnce({ data: mockProfile, error: null });

      await processSubscriptionAction(mockUserId, 'PRO');

      expect(revalidateProfile).toHaveBeenCalledWith(mockUsername, mockUserId);
    });
  });

  // =================================================================
  // OUTROS
  // =================================================================

  describe('signOut', () => {
    it('deve chamar auth.signOut', async () => {
      await signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
