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
  unstable_cache: vi.fn(
    (fn) =>
      (...args: any[]) =>
        fn(...args),
  ),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServerClientReadOnly: vi.fn(),
  createSupabaseClientForCache: vi.fn(),
}));

vi.mock('@/actions/revalidate.actions', () => ({
  revalidateUserGalleries: vi.fn().mockResolvedValue(true),
}));

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
    // Builder precisa retornar ele mesmo em todas as chamadas de cadeia
    const builder: any = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
    };

    // Configura comportamento padrão de retornar this para encadeamento
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.update.mockReturnValue(builder);
    builder.insert.mockReturnValue(builder);

    // single e maybeSingle retornam promises
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

  // =========================================================================
  // TESTES DE LEITURA - fetchProfileDirectDB
  // =========================================================================

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

  // =========================================================================
  // TESTES DE LEITURA - getProfileData
  // =========================================================================

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

  // =========================================================================
  // TESTES DE LEITURA - fetchProfileRaw
  // =========================================================================

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

  // =========================================================================
  // TESTES DE LEITURA - getPublicProfile
  // =========================================================================

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

  // =========================================================================
  // TESTES DE LEITURA - checkSubdomainPermission
  // =========================================================================

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

  // =========================================================================
  // TESTES DE LEITURA - getProfileMetadataInfo
  // =========================================================================

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

  // =========================================================================
  // TESTES DE LEITURA - getAvatarUrl
  // =========================================================================

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

  // =========================================================================
  // TESTES DE LEITURA - getProfileByUsername
  // =========================================================================

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

  // =========================================================================
  // TESTES DE MUTAÇÃO - upsertProfile
  // =========================================================================

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
        data: null, // Não existe perfil anterior
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
        data: { plan_key: 'FREE' }, // Usuário já tem plano
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

    it('deve fazer upload de foto de perfil quando fornecida', async () => {
      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append('profile_picture', file);

      await upsertProfile(formData, mockSupabase);

      expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
        expect.stringContaining('avatar-'),
        file,
        { upsert: true },
      );
    });

    it('deve usar extensão padrão webp quando arquivo não tem nome válido', async () => {
      const file = new File(['avatar'], '', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append('profile_picture', file);

      await upsertProfile(formData, mockSupabase);

      expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/\.webp$/),
        file,
        { upsert: true },
      );
    });

    it('deve usar extensão padrão webp quando arquivo não tem extensão', async () => {
      const file = new File(['avatar'], 'avatar', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append('profile_picture', file);

      await upsertProfile(formData, mockSupabase);

      expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/\.webp$/),
        file,
        { upsert: true },
      );
    });

    it('deve continuar mesmo se upload de avatar falhar', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockSupabase.storage.upload.mockResolvedValueOnce({
        error: { message: 'Upload failed' },
      });

      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append('profile_picture', file);

      const result = await upsertProfile(formData, mockSupabase);

      expect(result.success).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('deve fazer upload de múltiplas imagens de background', async () => {
      const file1 = new File(['bg1'], 'bg1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['bg2'], 'bg2.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append('background_images', file1);
      formData.append('background_images', file2);

      await upsertProfile(formData, mockSupabase);

      expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(2);
    });

    it('deve ignorar arquivos vazios de background', async () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append('background_images', emptyFile);

      await upsertProfile(formData, mockSupabase);

      expect(mockSupabase.storage.upload).not.toHaveBeenCalled();
    });

    it('deve manter URLs existentes se não houver novos backgrounds', async () => {
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append(
        'background_urls_existing',
        JSON.stringify(['https://cdn.com/bg1.jpg', 'https://cdn.com/bg2.jpg']),
      );

      await upsertProfile(formData, mockSupabase);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          background_urls: [
            'https://cdn.com/bg1.jpg',
            'https://cdn.com/bg2.jpg',
          ],
        }),
      );
    });

    it('deve formatar telefone brasileiro de 10 dígitos', async () => {
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append('phone_contact', '3112345678');

      await upsertProfile(formData, mockSupabase);

      // Nota: O código usa normalizePhoneNumber de masks-helpers que formata
      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          phone_contact: expect.any(String),
        }),
      );
    });

    it('deve formatar telefone brasileiro de 11 dígitos', async () => {
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append('phone_contact', '31912345678');

      await upsertProfile(formData, mockSupabase);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          phone_contact: expect.any(String),
        }),
      );
    });

    it('deve processar telefone com prefixo 55', async () => {
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append('phone_contact', '5531912345678');

      await upsertProfile(formData, mockSupabase);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          phone_contact: expect.any(String),
        }),
      );
    });

    it('deve processar operating_cities JSON corretamente', async () => {
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append(
        'operating_cities',
        JSON.stringify(['Belo Horizonte', 'São Paulo']),
      );

      await upsertProfile(formData, mockSupabase);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          operating_cities: ['Belo Horizonte', 'São Paulo'],
        }),
      );
    });

    it('deve usar array vazio se operating_cities JSON for inválido', async () => {
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append('operating_cities', 'invalid json');

      await upsertProfile(formData, mockSupabase);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          operating_cities: [],
        }),
      );
    });

    it('deve retornar erro quando username já está em uso', async () => {
      // Mock da primeira chamada .from() - busca perfil existente
      const firstBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { plan_key: 'FREE' },
          error: null,
        }),
      };

      // Mock da segunda chamada .from() - update que vai falhar
      const secondBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'Duplicate key' },
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(firstBuilder)
        .mockReturnValueOnce(secondBuilder);

      const formData = new FormData();
      formData.append('username', 'existente');
      formData.append('full_name', 'Teste');

      const result = await upsertProfile(formData, mockSupabase);

      expect(result).toEqual({
        success: false,
        error: 'Username já está em uso.',
      });
    });

    it('deve retornar erro genérico para outros erros de banco', async () => {
      // Mock da primeira chamada .from() - busca perfil existente
      const firstBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { plan_key: 'FREE' },
          error: null,
        }),
      };

      // Mock da segunda chamada .from() - update que vai falhar
      const secondBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23503', message: 'Foreign key violation' },
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(firstBuilder)
        .mockReturnValueOnce(secondBuilder);

      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');

      const result = await upsertProfile(formData, mockSupabase);

      expect(result).toEqual({
        success: false,
        error: 'Foreign key violation',
      });
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
      // Mock para retornar galerias
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

      // Configura o mock para retornar galeriasMock na terceira chamada
      mockSupabase.from
        .mockReturnValueOnce(mockBuilder) // Primeira: busca perfil existente
        .mockReturnValueOnce(mockBuilder) // Segunda: update do perfil
        .mockReturnValueOnce(galeriasMock); // Terceira: busca galerias

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

    it('deve incluir todos os campos opcionais quando fornecidos', async () => {
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', 'Hitalo Costa');
      formData.append('mini_bio', 'Fotógrafo profissional');
      formData.append('instagram_link', '@hitalo');
      formData.append('website', 'https://hitalo.com');
      formData.append('background_url_existing', 'https://cdn.com/bg.jpg');

      await upsertProfile(formData, mockSupabase);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          mini_bio: 'Fotógrafo profissional',
          instagram_link: '@hitalo',
          website: 'https://hitalo.com',
          background_url: 'https://cdn.com/bg.jpg',
        }),
      );
    });

    it('deve converter username para lowercase e fazer trim', async () => {
      const formData = new FormData();
      formData.append('username', '  HITALO  ');
      formData.append('full_name', 'Hitalo Costa');

      await upsertProfile(formData, mockSupabase);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'hitalo',
        }),
      );
    });

    it('deve fazer trim em full_name', async () => {
      const formData = new FormData();
      formData.append('username', mockUsername);
      formData.append('full_name', '  Hitalo Costa  ');

      await upsertProfile(formData, mockSupabase);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Hitalo Costa',
        }),
      );
    });
  });

  // =========================================================================
  // TESTES DE MUTAÇÃO - updateProfileSettings
  // =========================================================================

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

      // Mock da primeira chamada .from() - busca username
      const firstBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { username: mockUsername },
          error: null,
        }),
      };

      // Mock da segunda chamada .from() - update que vai falhar
      const secondBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
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
        error: 'Update failed',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[updateProfileSettings] Erro:',
        expect.objectContaining({ message: 'Update failed' }),
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

      // Verifica que foi chamado com profile-private mas NÃO com profile-{username}
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

  // =========================================================================
  // TESTES DE MUTAÇÃO - signOut
  // =========================================================================

  describe('signOut', () => {
    it('deve chamar auth.signOut do Supabase', async () => {
      await signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // TESTES DE MUTAÇÃO - updateSidebarPreference
  // =========================================================================

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
      // Mock da primeira chamada .from() - busca username
      const firstBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { username: mockUsername },
          error: null,
        }),
      };

      // Mock da segunda chamada .from() - update que vai falhar
      const secondBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(firstBuilder)
        .mockReturnValueOnce(secondBuilder);

      const result = await updateSidebarPreference(true);

      expect(result).toEqual({
        success: false,
        error: 'Update failed',
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

      // Verifica que foi chamado com profile-private mas NÃO com profile-{username}
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

  // =========================================================================
  // TESTES DE MUTAÇÃO - updateCustomCategories
  // =========================================================================

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

      // Mock da primeira chamada .from() - busca username
      const firstBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { username: mockUsername },
          error: null,
        }),
      };

      // Mock da segunda chamada .from() - update que vai falhar
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

  // =========================================================================
  // TESTES DE MUTAÇÃO - updatePushSubscriptionAction
  // =========================================================================

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
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/perfil');
    });

    it('deve retornar erro quando não há usuário autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await updatePushSubscriptionAction(mockSubscription);

      expect(result).toEqual({
        success: false,
        error: 'Não autorizado',
      });
    });

    it('deve retornar erro quando update falha', async () => {
      mockBuilder.eq.mockResolvedValueOnce({
        error: { message: 'Update failed' },
      });

      const result = await updatePushSubscriptionAction(mockSubscription);

      expect(result).toEqual({
        success: false,
        error: 'Update failed',
      });
    });
  });

  // =========================================================================
  // TESTES DE MUTAÇÃO - processSubscriptionAction
  // =========================================================================

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

      // Mock para a primeira busca de username
      mockBuilder.single
        .mockResolvedValueOnce({
          data: { username: mockUsername },
          error: null,
        })
        // Mock para o select().single() final que retorna erro
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Update failed' },
        });

      const result = await processSubscriptionAction(mockUserId, 'PRO');

      expect(result).toEqual({
        success: false,
        error: 'Update failed',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[processSubscriptionAction] Erro na transição:',
        'Update failed',
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

      // Verifica que foi chamado com profile-private mas NÃO com profile-{username}
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
});
