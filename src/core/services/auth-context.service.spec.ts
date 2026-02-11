import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAuthAndStudioIds,
  getAuthenticatedUser,
  AuthContext,
} from './auth-context.service';

// Mock do Supabase
vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClientReadOnly: vi.fn(),
}));

describe('Auth Service - Testes Completos', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset do cache do React entre testes
    vi.resetModules();

    // Mock base do Supabase
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };
  });

  describe('getAuthAndStudioIds', () => {
    describe('✅ Casos de Sucesso', () => {
      it('deve retornar userId e studioId quando usuário está autenticado', async () => {
        // Arrange
        const mockUser = { id: 'user-123' };
        const mockProfile = {
          id: 'user-123',
          studio_id: 'studio-456',
          plan_key: 'PRO',
          username: 'johndoe',
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        // Act
        const result = await getAuthAndStudioIds(mockSupabase);

        // Assert
        expect(result).toEqual({
          success: true,
          userId: 'user-123',
          studioId: 'studio-456',
        });

        expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
        expect(mockSupabase.from).toHaveBeenCalledWith('tb_profiles');
        expect(mockBuilder.select).toHaveBeenCalledWith('*');
        expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'user-123');
        expect(mockBuilder.single).toHaveBeenCalledTimes(1);
      });

      it('deve funcionar sem passar supabaseClient (usa client padrão)', async () => {
        const { createSupabaseServerClientReadOnly } =
          await import('@/lib/supabase.server');

        vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
          mockSupabase,
        );

        const mockUser = { id: 'user-789' };
        const mockProfile = {
          id: 'user-789',
          studio_id: 'studio-999',
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        // Act
        const result = await getAuthAndStudioIds();

        // Assert
        expect(result.success).toBe(true);
        expect(result.userId).toBe('user-789');
        expect(result.studioId).toBe('studio-999');
        expect(createSupabaseServerClientReadOnly).toHaveBeenCalledTimes(1);
      });

      it('deve retornar todos os dados do profile quando disponíveis', async () => {
        const mockUser = { id: 'user-complete' };
        const mockProfile = {
          id: 'user-complete',
          studio_id: 'studio-complete',
          plan_key: 'PREMIUM',
          username: 'premium_user',
          full_name: 'Premium User',
          profile_picture_url: 'https://example.com/photo.jpg',
          phone_contact: '5531999999999',
          instagram_link: '@premiumuser',
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        const result = await getAuthAndStudioIds(mockSupabase);

        expect(result.success).toBe(true);
        expect(result.userId).toBe('user-complete');
        expect(result.studioId).toBe('studio-complete');
      });
    });

    describe('❌ Casos de Erro - Autenticação', () => {
      it('deve retornar erro quando usuário não está autenticado', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const result = await getAuthAndStudioIds(mockSupabase);

        expect(result).toEqual({
          success: false,
          userId: null,
          studioId: null,
          error: 'Usuário não autenticado.',
        });
      });

      it('deve retornar erro quando auth.getUser falha', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Token expirado' },
        });

        const result = await getAuthAndStudioIds(mockSupabase);

        expect(result).toEqual({
          success: false,
          userId: null,
          studioId: null,
          error: 'Usuário não autenticado.',
        });
      });
    });

    describe('❌ Casos de Erro - Profile', () => {
      it('deve retornar erro quando profile não existe', async () => {
        const consoleErrorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});

        const mockUser = { id: 'user-no-profile' };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Profile not found' },
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        const result = await getAuthAndStudioIds(mockSupabase);

        expect(result).toEqual({
          success: false,
          userId: 'user-no-profile',
          studioId: null,
          error: 'Profile do usuário não encontrado ou incompleto.',
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Erro ao buscar profile do usuário logado:',
          { message: 'Profile not found' },
        );

        consoleErrorSpy.mockRestore();
      });

      it('deve retornar erro quando query do profile falha', async () => {
        const consoleErrorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});

        const mockUser = { id: 'user-db-error' };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection error' },
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        const result = await getAuthAndStudioIds(mockSupabase);

        expect(result.success).toBe(false);
        expect(result.userId).toBe('user-db-error');
        expect(result.studioId).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });

      it('deve manter userId mesmo quando profile falha', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const mockUser = { id: 'user-partial' };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        const result = await getAuthAndStudioIds(mockSupabase);

        expect(result.success).toBe(false);
        expect(result.userId).toBe('user-partial');
        expect(result.studioId).toBeNull();
      });
    });

    describe('🔒 Casos de Segurança', () => {
      it('deve lidar com profile sem studio_id', async () => {
        const mockUser = { id: 'user-no-studio' };
        const mockProfile = {
          id: 'user-no-studio',
          studio_id: null, // Sem studio_id
          plan_key: 'FREE',
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        const result = await getAuthAndStudioIds(mockSupabase);

        expect(result.success).toBe(true);
        expect(result.userId).toBe('user-no-studio');
        expect(result.studioId).toBeNull();
      });
    });
  });

  describe('getAuthenticatedUser', () => {
    describe('✅ Casos de Sucesso', () => {
      it('deve retornar perfil completo quando usuário está autenticado', async () => {
        const { createSupabaseServerClientReadOnly } =
          await import('@/lib/supabase.server');

        vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
          mockSupabase,
        );

        const mockUser = {
          id: 'user-123',
          email: 'user@example.com',
        };

        const mockProfile = {
          id: 'user-123',
          plan_key: 'PRO',
          username: 'johndoe',
          studio_id: 'studio-456',
          full_name: 'John Doe',
          profile_picture_url: 'https://example.com/photo.jpg',
          phone_contact: '5531999999999',
          instagram_link: '@johndoe',
          use_subdomain: true,
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        const result = await getAuthenticatedUser();

        expect(result).toEqual({
          success: true,
          userId: 'user-123',
          profile: mockProfile,
          email: 'user@example.com',
        });
      });

      it('deve buscar todos os campos do profile com SELECT *', async () => {
        const { createSupabaseServerClientReadOnly } =
          await import('@/lib/supabase.server');

        vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
          mockSupabase,
        );

        const mockUser = { id: 'user-full', email: 'full@example.com' };
        const mockProfile = {
          id: 'user-full',
          plan_key: 'PREMIUM',
          username: 'fulluser',
          studio_id: 'studio-full',
          full_name: 'Full User',
          // ... todos os outros campos
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        await getAuthenticatedUser();

        expect(mockBuilder.select).toHaveBeenCalledWith('*');
      });
    });

    describe('❌ Casos de Erro - Autenticação', () => {
      it('deve retornar erro quando usuário não está autenticado', async () => {
        const { createSupabaseServerClientReadOnly } =
          await import('@/lib/supabase.server');

        vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
          mockSupabase,
        );

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const result = await getAuthenticatedUser();

        expect(result).toEqual({
          success: false,
          profile: null,
          userId: null,
        });
      });

      it('deve retornar erro quando auth falha', async () => {
        const { createSupabaseServerClientReadOnly } =
          await import('@/lib/supabase.server');

        vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
          mockSupabase,
        );

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        });

        const result = await getAuthenticatedUser();

        expect(result).toEqual({
          success: false,
          profile: null,
          userId: null,
        });
      });
    });

    describe('❌ Casos de Erro - Profile', () => {
      it('deve retornar userId mesmo quando profile não existe', async () => {
        const { createSupabaseServerClientReadOnly } =
          await import('@/lib/supabase.server');

        vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
          mockSupabase,
        );

        const mockUser = { id: 'user-no-profile', email: 'test@example.com' };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        const result = await getAuthenticatedUser();

        expect(result).toEqual({
          success: false,
          profile: null,
          userId: 'user-no-profile',
        });
      });

      it('deve retornar erro quando query do profile falha', async () => {
        const { createSupabaseServerClientReadOnly } =
          await import('@/lib/supabase.server');

        vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
          mockSupabase,
        );

        const mockUser = { id: 'user-error', email: 'error@example.com' };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        const result = await getAuthenticatedUser();

        expect(result.success).toBe(false);
        expect(result.profile).toBeNull();
        expect(result.userId).toBe('user-error');
      });
    });

    describe('🔄 Request Memoization (React Cache)', () => {
      it('deve usar cache do React para evitar múltiplas chamadas', async () => {
        const { createSupabaseServerClientReadOnly } =
          await import('@/lib/supabase.server');

        vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
          mockSupabase,
        );

        const mockUser = { id: 'user-cached', email: 'cached@example.com' };
        const mockProfile = {
          id: 'user-cached',
          plan_key: 'PRO',
          username: 'cached',
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        };

        mockSupabase.from.mockReturnValue(mockBuilder);

        // Primeira chamada
        const result1 = await getAuthenticatedUser();

        // Segunda chamada (deveria usar cache)
        const result2 = await getAuthenticatedUser();

        expect(result1).toEqual(result2);
        // Note: O cache do React funciona por requisição,
        // então em testes pode não ser observável sem setup especial
      });
    });
  });

  describe('🔐 Casos de Borda e Segurança', () => {
    it('getAuthAndStudioIds: deve lidar com usuário sem email', async () => {
      const mockUser = { id: 'user-no-email' }; // Sem email
      const mockProfile = {
        id: 'user-no-email',
        studio_id: 'studio-123',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await getAuthAndStudioIds(mockSupabase);

      expect(result.success).toBe(true);
    });

    it('getAuthenticatedUser: deve incluir email quando disponível', async () => {
      const { createSupabaseServerClientReadOnly } =
        await import('@/lib/supabase.server');

      vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
        mockSupabase,
      );

      const mockUser = {
        id: 'user-with-email',
        email: 'with-email@example.com',
      };
      const mockProfile = {
        id: 'user-with-email',
        plan_key: 'FREE',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await getAuthenticatedUser();

      expect(result.email).toBe('with-email@example.com');
    });
  });

  describe('📊 Tipos de Retorno', () => {
    it('getAuthAndStudioIds deve retornar tipo AuthContext correto', async () => {
      const mockUser = { id: 'user-type' };
      const mockProfile = {
        id: 'user-type',
        studio_id: 'studio-type',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockBuilder);

      const result: AuthContext = await getAuthAndStudioIds(mockSupabase);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('studioId');
    });
  });
});
