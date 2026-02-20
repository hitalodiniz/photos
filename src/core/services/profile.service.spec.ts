import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getProfileData,
  upsertProfile,
  signOut,
  fetchProfileDirectDB,
  checkSubdomainPermission,
  getAvatarUrl,
  updateProfileSettings,
  updateSidebarPreference,
  updateCustomCategories,
  getProfileByUsername,
  processSubscriptionAction,
  updatePushSubscriptionAction,
  fetchProfileRaw,
  getPublicProfile,
  getProfileMetadataInfo,
} from './profile.service';
import {
  createSupabaseServerClient,
  createSupabaseClientForCache,
  createSupabaseServerClientReadOnly,
} from '@/lib/supabase.server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { revalidateUserGalleries } from '@/actions/revalidate.actions';

// =========================================================================
// MOCKS DE INFRAESTRUTURA
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

// ✅ CORREÇÃO: Mock que executa a lógica real de revalidação
vi.mock('@/actions/revalidate.actions', () => {
  return {
    revalidateUserGalleries: vi.fn().mockResolvedValue(true),
    revalidateProfile: vi
      .fn()
      .mockImplementation(async (username: string, userId: string) => {
        // Importa as funções reais de next/cache
        const { revalidateTag, revalidatePath } = await import('next/cache');

        const cleanUsername = username.toLowerCase().trim();

        // Chama as funções mockadas diretamente
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

describe('Profile Service - Cobertura Total 100%', () => {
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
    const builder: any = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
    };

    builder.select.mockReturnValue(builder);
    builder.update.mockReturnValue(builder);
    builder.insert.mockReturnValue(builder);

    // ✅ CORREÇÃO: .eq() precisa suportar múltiplos cenários
    builder.eq.mockImplementation(() => {
      // Se já passou por .update(), retorna Promise (fim da cadeia)
      if (builder.update.mock.calls.length > 0) {
        // Mas também precisa suportar .select() após .update().eq()
        const chainWithSelect = {
          select: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: mockProfile, error: null }),
          }),
        };

        // Retorna um objeto que pode ser tanto Promise quanto ter .select()
        return Object.assign(
          Promise.resolve({ data: mockProfile, error: null }),
          chainWithSelect,
        );
      }
      // Caso contrário, continua o encadeamento
      return builder;
    });

    builder.single.mockResolvedValue({ data: mockProfile, error: null });
    builder.maybeSingle.mockResolvedValue({ data: mockProfile, error: null });

    const client = {
      from: vi.fn().mockReturnValue(builder),
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
        getPublicUrl: vi
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://cdn.com/img.png' } }),
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

  describe('fetchProfileDirectDB', () => {
    it('deve retornar perfil quando encontrado', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const result = await fetchProfileDirectDB(mockUsername);

      expect(result).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('tb_profiles');
      expect(mockBuilder.select).toHaveBeenCalledWith('*');
      expect(mockBuilder.eq).toHaveBeenCalledWith('username', mockUsername);
    });

    it('deve retornar null quando perfil não existe', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await fetchProfileDirectDB('naoexiste');

      expect(result).toBeNull();
    });

    it('deve retornar null quando ocorre erro PGRST116 (not found)', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await fetchProfileDirectDB(mockUsername);

      expect(result).toBeNull();
    });

    it('deve logar erro e retornar null para outros códigos de erro', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Internal error' },
      });

      const result = await fetchProfileDirectDB(mockUsername);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao buscar perfil no DB:',
        expect.objectContaining({ code: 'PGRST500' }),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getProfileData', () => {
    it('deve retornar dados do perfil com usuário autenticado', async () => {
      const result = await getProfileData();

      expect(result).toEqual({
        success: true,
        user_id: mockUserId,
        profile: mockProfile,
        email: 'hitalo@test.com',
        suggestedUsername: 'hitalo',
      });
    });

    it('deve retornar erro quando não há usuário autenticado', async () => {
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

    it('deve retornar erro quando auth.getUser retorna erro', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const result = await getProfileData();

      expect(result).toEqual({
        success: false,
        error: 'Usuário não autenticado.',
      });
    });

    it('deve usar supabaseClient passado como parâmetro', async () => {
      const customClient = createMockSupabase().client;
      await getProfileData(customClient);

      expect(createSupabaseServerClientReadOnly).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando query do perfil falha', async () => {
      mockBuilder.maybeSingle.mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(getProfileData()).rejects.toThrow('Database error');
    });
  });

  describe('fetchProfileRaw', () => {
    it('deve retornar perfil usando unstable_cache', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const result = await fetchProfileRaw(mockUsername);

      expect(result).toEqual(mockProfile);
    });
  });

  describe('getPublicProfile', () => {
    it('deve retornar perfil público', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const result = await getPublicProfile(mockUsername);

      expect(result).toEqual(mockProfile);
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

    it('deve retornar false quando perfil não existe', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await checkSubdomainPermission('naoexiste');

      expect(result).toBe(false);
    });

    it('deve retornar false quando use_subdomain é null', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: { use_subdomain: null },
        error: null,
      });

      const result = await checkSubdomainPermission(mockUsername);

      expect(result).toBe(false);
    });
  });

  describe('getProfileMetadataInfo', () => {
    it('deve retornar metadata do perfil', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const result = await getProfileMetadataInfo(mockUsername);

      expect(result).toEqual({
        full_name: mockProfile.full_name,
        profile_picture_url: mockProfile.profile_picture_url,
        username: mockProfile.username,
      });
    });

    it('deve retornar null quando perfil não existe', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await getProfileMetadataInfo('naoexiste');

      expect(result).toBeNull();
    });
  });

  describe('getAvatarUrl', () => {
    it('deve retornar URL do avatar', async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { profile_picture_url: 'https://cdn.com/avatar.jpg' },
        error: null,
      });

      const result = await getAvatarUrl(mockUserId);

      expect(result).toBe('https://cdn.com/avatar.jpg');
    });

    it('deve retornar null quando há erro', async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getAvatarUrl(mockUserId);

      expect(result).toBeNull();
    });

    it('deve retornar null quando profile_picture_url é null', async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { profile_picture_url: null },
        error: null,
      });

      const result = await getAvatarUrl(mockUserId);

      expect(result).toBeNull();
    });

    it('deve usar supabaseClient passado como parâmetro', async () => {
      const customClient = createMockSupabase().client;
      customClient.from().single.mockResolvedValueOnce({
        data: { profile_picture_url: 'https://cdn.com/avatar.jpg' },
        error: null,
      });

      await getAvatarUrl(mockUserId, customClient);

      expect(createSupabaseServerClientReadOnly).not.toHaveBeenCalled();
    });
  });

  describe('getProfileByUsername', () => {
    it('deve retornar perfil com username em lowercase', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const result = await getProfileByUsername('HITALO');

      expect(result).toEqual(mockProfile);
      expect(mockBuilder.eq).toHaveBeenCalledWith('username', 'hitalo');
    });

    it('deve retornar null quando há erro no Supabase', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getProfileByUsername(mockUsername);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('deve fazer trim no username', async () => {
      mockBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      await getProfileByUsername('  hitalo  ');

      expect(mockBuilder.eq).toHaveBeenCalledWith('username', 'hitalo');
    });
  });

  describe('upsertProfile', () => {
    it('deve retornar erro quando não há usuário autenticado', async () => {
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

    it('deve retornar erro quando username ou full_name não são fornecidos', async () => {
      const formData = new FormData();
      formData.append('username', '');
      formData.append('full_name', '');

      const result = await upsertProfile(formData, mockSupabase);

      expect(result).toEqual({
        success: false,
        error: 'Nome e Username são obrigatórios.',
      });
    });

    it('deve ativar trial PRO para novo usuário (primeiro setup)', async () => {
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
          plan_trial_expires: expect.any(String),
        }),
      );
    });

    it('deve não ativar trial para usuário existente', async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { plan_key: 'FREE' },
        error: null,
      });

      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');

      await upsertProfile(formData, mockSupabase);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.not.objectContaining({
          plan_key: 'PRO',
          is_trial: true,
        }),
      );
    });

    it('deve revalidar todas as tags necessárias após update bem-sucedido', async () => {
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');

      await upsertProfile(formData, mockSupabase);

      expect(revalidateTag).toHaveBeenCalledWith(`profile-${mockUsername}`);
      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-private-${mockUserId}`,
      );
      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-galerias-${mockUsername}`,
      );
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
      expect(revalidatePath).toHaveBeenCalledWith(`/${mockUsername}`);
    });

    it('deve revalidar galerias individuais quando existirem', async () => {
      const galeriasMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: 'gal1', slug: 'casamento', drive_folder_id: 'drive1' },
            { id: 'gal2', slug: 'ensaio', drive_folder_id: 'drive2' },
          ],
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockBuilder)
        .mockReturnValueOnce(mockBuilder)
        .mockReturnValueOnce(galeriasMock);

      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');

      await upsertProfile(formData, mockSupabase);

      expect(revalidateTag).toHaveBeenCalledWith('gallery-casamento');
      expect(revalidateTag).toHaveBeenCalledWith('gallery-ensaio');
      expect(revalidateTag).toHaveBeenCalledWith('drive-drive1');
      expect(revalidateTag).toHaveBeenCalledWith('drive-drive2');
      expect(revalidateTag).toHaveBeenCalledWith('photos-gal1');
      expect(revalidateTag).toHaveBeenCalledWith('photos-gal2');
      expect(revalidateTag).toHaveBeenCalledWith(`user-galerias-${mockUserId}`);
    });
  });

  describe('updateProfileSettings', () => {
    const mockSettings = {
      download_enabled: true,
      theme: 'dark' as const,
    };
    const mockTemplates = {
      download_message: 'Obrigado por baixar!',
      contact_message: 'Entre em contato!',
    };

    it('deve retornar erro quando não há usuário autenticado', async () => {
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

    it('deve atualizar settings e templates com sucesso', async () => {
      const result = await updateProfileSettings({
        settings: mockSettings,
        message_templates: mockTemplates,
      });

      expect(result.success).toBe(true);
      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: mockSettings,
          message_templates: mockTemplates,
          updated_at: expect.any(String),
        }),
      );
    });

    it('deve retornar erro quando update falha', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const firstBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { username: mockUsername },
          error: null,
        }),
      };

      const secondBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Falha ao sincronizar notificações' },
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(firstBuilder)
        .mockReturnValueOnce(secondBuilder);

      const result = await updateProfileSettings({
        settings: mockSettings,
        message_templates: mockTemplates,
      });

      expect(result).toEqual({
        success: false,
        error: 'Falha ao sincronizar notificações',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[updateProfileSettings] Erro:',
        expect.objectContaining({
          message: 'Falha ao sincronizar notificações',
        }),
      );

      consoleErrorSpy.mockRestore();
    });

    it('deve revalidar tags quando profile tem username', async () => {
      await updateProfileSettings({
        settings: mockSettings,
        message_templates: mockTemplates,
      });

      expect(revalidateTag).toHaveBeenCalledWith(`profile-${mockUsername}`);
      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-private-${mockUserId}`,
      );
      expect(revalidateUserGalleries).toHaveBeenCalledWith(mockUserId);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/settings');
    });

    it('deve não revalidar tag de username quando profile não tem username', async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { username: null },
        error: null,
      });

      await updateProfileSettings({
        settings: mockSettings,
        message_templates: mockTemplates,
      });

      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-private-${mockUserId}`,
      );

      const calls = vi.mocked(revalidateTag).mock.calls;
      const hasPublicProfileTag = calls.some(
        (call) =>
          call[0].startsWith('profile-') &&
          !call[0].startsWith('profile-private-'),
      );
      expect(hasPublicProfileTag).toBe(false);
    });
  });

  describe('signOut', () => {
    it('deve chamar auth.signOut do Supabase', async () => {
      await signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('updateSidebarPreference', () => {
    it('deve atualizar preferência de sidebar para collapsed', async () => {
      const result = await updateSidebarPreference(true);

      expect(result.success).toBe(true);
      expect(mockBuilder.update).toHaveBeenCalledWith({
        sidebar_collapsed: true,
      });
    });

    it('deve atualizar preferência de sidebar para expanded', async () => {
      const result = await updateSidebarPreference(false);

      expect(result.success).toBe(true);
      expect(mockBuilder.update).toHaveBeenCalledWith({
        sidebar_collapsed: false,
      });
    });

    it('deve retornar erro quando não há usuário autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await updateSidebarPreference(true);

      expect(result).toEqual({
        success: false,
        error: 'Sessão expirada.',
      });
    });

    it('deve retornar erro quando update falha', async () => {
      const firstBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { username: mockUsername },
          error: null,
        }),
      };

      const secondBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Falha ao sincronizar notificações' },
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(firstBuilder)
        .mockReturnValueOnce(secondBuilder);

      const result = await updateSidebarPreference(true);

      expect(result).toEqual({
        success: false,
        error: 'Falha ao sincronizar notificações',
      });
    });

    it('deve revalidar tags de cache', async () => {
      await updateSidebarPreference(true);

      expect(revalidateTag).toHaveBeenCalledWith(`profile-${mockUsername}`);
      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-private-${mockUserId}`,
      );
    });

    it('deve não revalidar tag de username quando profile não tem username', async () => {
      mockBuilder.single.mockResolvedValueOnce({
        data: { username: null },
        error: null,
      });

      await updateSidebarPreference(true);

      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-private-${mockUserId}`,
      );

      const calls = vi.mocked(revalidateTag).mock.calls;
      const hasPublicProfileTag = calls.some(
        (call) =>
          call[0].startsWith('profile-') &&
          !call[0].startsWith('profile-private-'),
      );
      expect(hasPublicProfileTag).toBe(false);
    });
  });

  describe('updateCustomCategories', () => {
    const mockCategories = ['Casamento', 'Ensaio', 'Formatura'];

    it('deve atualizar categorias personalizadas com sucesso', async () => {
      const result = await updateCustomCategories(mockCategories);

      expect(result.success).toBe(true);
      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          custom_categories: mockCategories,
          updated_at: expect.any(String),
        }),
      );
    });

    it('deve retornar erro quando não há usuário autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await updateCustomCategories(mockCategories);

      expect(result).toEqual({
        success: false,
        error: 'Sessão expirada.',
      });
    });

    it('deve retornar erro quando update falha', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const firstBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { username: mockUsername },
          error: null,
        }),
      };

      const secondBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(firstBuilder)
        .mockReturnValueOnce(secondBuilder);

      const result = await updateCustomCategories(mockCategories);

      expect(result).toEqual({
        success: false,
        error: 'Database error',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[updateCustomCategories] Erro:',
        expect.objectContaining({ message: 'Database error' }),
      );

      consoleErrorSpy.mockRestore();
    });

    it('deve revalidar tags de cache', async () => {
      await updateCustomCategories(mockCategories);

      expect(revalidateTag).toHaveBeenCalledWith(`profile-${mockUsername}`);
      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-private-${mockUserId}`,
      );
    });

    it('deve aceitar array vazio de categorias', async () => {
      const result = await updateCustomCategories([]);

      expect(result.success).toBe(true);
      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          custom_categories: [],
        }),
      );
    });
  });

  describe('updatePushSubscriptionAction', () => {
    const mockSubscription = {
      endpoint: 'https://push.service.com/endpoint',
      keys: {
        p256dh: 'key1',
        auth: 'key2',
      },
    };

    it('deve atualizar push subscription com sucesso', async () => {
      const result = await updatePushSubscriptionAction(mockSubscription);

      expect(result.success).toBe(true);
      expect(mockBuilder.update).toHaveBeenCalledWith({
        push_subscription: mockSubscription,
        notifications_enabled: true,
      });
    });

    it('deve retornar erro quando não há usuário autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await updatePushSubscriptionAction(mockSubscription);

      expect(result).toEqual({
        success: false,
        error: 'Usuário não autenticado',
      });
    });

    it('deve retornar erro quando update falha', async () => {
      mockBuilder.eq.mockResolvedValueOnce({
        error: { message: 'Falha ao sincronizar notificações' },
      });

      const result = await updatePushSubscriptionAction(mockSubscription);

      expect(result).toEqual({
        success: false,
        error: 'Falha ao sincronizar notificações',
      });
    });
  });

  describe('processSubscriptionAction', () => {
    it('deve processar mudança de plano com sucesso', async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { username: mockUsername },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: mockUserId, plan_key: 'PRO', is_trial: false },
          error: null,
        });

      const result = await processSubscriptionAction(mockUserId, 'PRO');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: mockUserId,
        plan_key: 'PRO',
        is_trial: false,
      });
    });

    it('deve desativar trial ao processar mudança de plano', async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { username: mockUsername },
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockProfile,
          error: null,
        });

      await processSubscriptionAction(mockUserId, 'PRO');

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_key: 'PRO',
          is_trial: false,
          updated_at: expect.any(String),
        }),
      );
    });

    it('deve revalidar todas as tags e paths necessários', async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { username: mockUsername },
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockProfile,
          error: null,
        });

      await processSubscriptionAction(mockUserId, 'PRO');

      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-private-${mockUserId}`,
      );
      expect(revalidateTag).toHaveBeenCalledWith(`profile-${mockUsername}`);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard', 'layout');
    });

    it('deve retornar erro quando update falha', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockBuilder.single
        .mockResolvedValueOnce({
          data: { username: mockUsername },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Falha ao sincronizar notificações' },
        });

      const result = await processSubscriptionAction(mockUserId, 'PRO');

      expect(result).toEqual({
        success: false,
        error: 'Falha ao sincronizar notificações',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[processSubscriptionAction] Erro na transição:',
        'Falha ao sincronizar notificações',
      );

      consoleErrorSpy.mockRestore();
    });

    it('deve processar upgrade de FREE para PRO', async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { username: mockUsername },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockProfile, plan_key: 'PRO' },
          error: null,
        });

      const result = await processSubscriptionAction(mockUserId, 'PRO');

      expect(result.success).toBe(true);
      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ plan_key: 'PRO' }),
      );
    });

    it('deve processar downgrade de PRO para FREE', async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { username: mockUsername },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockProfile, plan_key: 'FREE' },
          error: null,
        });

      const result = await processSubscriptionAction(mockUserId, 'FREE');

      expect(result.success).toBe(true);
      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ plan_key: 'FREE' }),
      );
    });

    it('deve não revalidar tag de username quando profile não tem username', async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { username: null },
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockProfile,
          error: null,
        });

      await processSubscriptionAction(mockUserId, 'PRO');

      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-private-${mockUserId}`,
      );

      const calls = vi.mocked(revalidateTag).mock.calls;
      const hasPublicProfileTag = calls.some(
        (call) =>
          call[0].startsWith('profile-') &&
          !call[0].startsWith('profile-private-'),
      );
      expect(hasPublicProfileTag).toBe(false);
    });
  });

  describe('Tags de Revalidação', () => {
    it('deve revalidar tags corretas no upsertProfile', async () => {
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Revised');

      await upsertProfile(formData, mockSupabase);

      expect(revalidateTag).toHaveBeenCalledWith(`profile-${mockUsername}`);
      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-private-${mockUserId}`,
      );
      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-galerias-${mockUsername}`,
      );
    });

    it('deve revalidar tags individuais de galerias e fotos no upsertProfile', async () => {
      const galeriasMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'gal1', slug: 'ensaio', drive_folder_id: 'drive1' }],
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockBuilder)
        .mockReturnValueOnce(mockBuilder)
        .mockReturnValueOnce(galeriasMock);

      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Revised');

      await upsertProfile(formData, mockSupabase);

      expect(revalidateTag).toHaveBeenCalledWith('gallery-ensaio');
      expect(revalidateTag).toHaveBeenCalledWith('drive-drive1');
      expect(revalidateTag).toHaveBeenCalledWith('photos-gal1');
    });

    it('deve revalidar tags no processSubscriptionAction', async () => {
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { username: mockUsername },
          error: null,
        })
        .mockResolvedValueOnce({ data: mockProfile, error: null });

      await processSubscriptionAction(mockUserId, 'PRO');

      expect(revalidateTag).toHaveBeenCalledWith(
        `profile-private-${mockUserId}`,
      );
      expect(revalidateTag).toHaveBeenCalledWith(`profile-${mockUsername}`);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard', 'layout');
    });
  });
});
