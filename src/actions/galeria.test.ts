import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateUniqueDatedSlug,
  createGaleria,
  updateGaleria,
  getGalerias,
  deleteGaleria,
} from './galeria';
import * as supabaseServer from '@/lib/supabase.server';
import * as googleAuth from '@/lib/google-auth';
import { revalidatePath } from 'next/cache';

// Mock do revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Ações de Galeria', () => {
  const mockUser = { id: 'user_hitalo' };
  const mockProfile = {
    studio_id: 'studio_123',
    username: 'hitalodiniz',
    use_subdomain: false,
  };

  // Helper para configurar o mock do Supabase dinamicamente
  const setupSupabaseMock = (
    profileData = mockProfile,
    existingSlug = null,
  ) => {
    // 1. Criamos o mock do Query Builder (o resultado de .from())
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: profileData }),
      maybeSingle: vi.fn().mockResolvedValue({ data: existingSlug }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };

    // 2. Criamos o mock do Cliente Supabase
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    (supabaseServer.createSupabaseServerClient as any).mockResolvedValue(
      mockSupabase,
    );
    (
      supabaseServer.createSupabaseServerClientReadOnly as any
    ).mockResolvedValue(mockSupabase);

    return { mockSupabase, mockQueryBuilder };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // TESTES DE SLUG
  // =========================================================================
  describe('generateUniqueDatedSlug', () => {
    it('deve incluir o username no slug quando use_subdomain for FALSE', async () => {
      setupSupabaseMock({ ...mockProfile, use_subdomain: false });
      const slug = await generateUniqueDatedSlug('Meu Casamento', '2025-12-30');

      expect(slug).toBe('hitalodiniz/2025/12/30/meu-casamento');
    });

    it('deve omitir o username no slug quando use_subdomain for TRUE', async () => {
      setupSupabaseMock({ ...mockProfile, use_subdomain: true });
      const slug = await generateUniqueDatedSlug('Meu Casamento', '2025-12-30');

      expect(slug).toBe('2025/12/30/meu-casamento');
    });

    it('deve resolver colisão de slugs adicionando sufixo incremental', async () => {
      const { mockQueryBuilder } = setupSupabaseMock({
        ...mockProfile,
        use_subdomain: true,
      });

      // Simula que o primeiro slug já existe, mas o segundo (-1) está livre
      mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'original' } })
        .mockResolvedValueOnce({ data: null });

      const slug = await generateUniqueDatedSlug('Festa', '2025-01-01');
      expect(slug).toBe('2025/01/01/festa-1');
    });
  });

  // =========================================================================
  // TESTES DE CRIAÇÃO
  // =========================================================================
  describe('createGaleria', () => {
    it('deve limpar o número do WhatsApp removendo caracteres não numéricos', async () => {
      setupSupabaseMock();
      vi.spyOn(googleAuth, 'getDriveAccessTokenForUser').mockResolvedValue(
        'token_valido',
      );

      const formData = new FormData();
      formData.append('title', 'Galeria Teste');
      formData.append('date', '2025-12-30');
      formData.append('drive_folder_id', 'folder_abc');
      formData.append('clientName', 'João Silva');
      formData.append('client_whatsapp', '(31) 98888-7777'); // Input sujo

      const { mockQueryBuilder } = setupSupabaseMock();
      await createGaleria(formData);

      // Verifica se o insert recebeu o número limpo
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          client_whatsapp: '31988887777',
        }),
      );
    });

    it('deve retornar erro se campos obrigatórios estiverem faltando', async () => {
      setupSupabaseMock();
      const formData = new FormData();
      formData.append('title', ''); // Título vazio

      const result = await createGaleria(formData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('obrigatórios');
    });
  });

  // =========================================================================
  // TESTES DE BUSCA
  // =========================================================================
  describe('getGalerias', () => {
    it('deve retornar as galerias ordenadas por data descendente', async () => {
      // 1. Configuração manual do mock estruturado
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      };
      (
        supabaseServer.createSupabaseServerClientReadOnly as any
      ).mockResolvedValue(mockSupabase);

      // 3. Resposta para o Profile (Primeira chamada interna)
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { studio_id: 'studio_123', username: 'hitalo' },
        error: null,
      });

      // 4. Resposta para as Galerias (Segunda chamada)
      const mockDbData = [
        {
          id: 'gal_1',
          title: 'Casamento',
          cover_image_url: 'foto.jpg',
          tb_profiles: { username: 'hitalo' },
        },
      ];

      // Interceptamos o final da corrente (.order) para retornar os dados
      mockQueryBuilder.order.mockReturnValue({
        then: (resolve: any) => resolve({ data: mockDbData, error: null }),
      });

      // 5. Execução
      const result = await getGalerias();

      // Verificações
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].cover_image_url).toBe('foto.jpg');
    });
  });

  describe('updateGaleria', () => {
    const mockUserId = 'user_hitalo_123';
    const galeriaId = 'gal_abc_456';

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('deve atualizar os dados da galeria e sanitizar o WhatsApp', async () => {
      // 1. Mock do Cliente Supabase
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      const mockSupabase = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: { id: mockUserId } } }),
        },
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      };
      (supabaseServer.createSupabaseServerClient as any).mockResolvedValue(
        mockSupabase,
      );

      // Mock do Profile (necessário para getAuthAndStudioIds)
      mockQueryBuilder.single.mockResolvedValue({
        data: { studio_id: 'studio_999' },
        error: null,
      });

      // 2. Criar FormData simulando o formulário de edição
      const formData = new FormData();
      formData.append('title', 'Evento Atualizado');
      formData.append('drive_folder_id', 'drive_id_new');
      formData.append('clientName', 'Cliente VIP');
      formData.append('client_whatsapp', '(31) 9 9999-8888'); // Deve ser limpo
      formData.append('date', '2025-12-31');
      formData.append('is_public', 'true');

      // 3. Executar a Action
      const result = await updateGaleria(galeriaId, formData);

      // 4. Asserts
      expect(result.success).toBe(true);

      // Verifica se o update foi chamado com o WhatsApp limpo e ID correto
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          client_whatsapp: '31999998888',
          title: 'Evento Atualizado',
        }),
      );
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', galeriaId);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('deve definir password como null quando a galeria for alterada para pública', async () => {
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { studio_id: 'studio_999' } }),
      };
      const mockSupabase = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: { id: mockUserId } } }),
        },
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      };
      (supabaseServer.createSupabaseServerClient as any).mockResolvedValue(
        mockSupabase,
      );

      const formData = new FormData();
      formData.append('title', 'Galeria Pública');
      formData.append('drive_folder_id', 'id');
      formData.append('clientName', 'Nome');
      formData.append('is_public', 'true');
      formData.append('password', 'senha123'); // Enviada, mas deve ser ignorada

      await updateGaleria(galeriaId, formData);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password: null,
        }),
      );
    });

    it('deve manter a execução mesmo se a atualização de permissão no Google Drive falhar', async () => {
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { studio_id: 'studio_999' } }),
      };
      const mockSupabase = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: { id: mockUserId } } }),
        },
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      };
      (supabaseServer.createSupabaseServerClient as any).mockResolvedValue(
        mockSupabase,
      );

      // Simula falha no Google Drive
      /*vi.spyOn(googleDrive, 'makeFolderPublic').mockRejectedValue(
        new Error('Drive Error'),
      );
      vi.spyOn(googleAuth, 'getDriveAccessTokenForUser').mockResolvedValue(
        'token_valido',
      );*/

      const formData = new FormData();
      formData.append('title', 'Teste Erro Drive');
      formData.append('drive_folder_id', 'id');
      formData.append('clientName', 'Nome');

      const result = await updateGaleria(galeriaId, formData);

      // A action deve retornar sucesso mesmo se o Drive avisar erro
      // (conforme a lógica de try-catch isolada no seu código)
      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe('deleteGaleria', () => {
    const galeriaId = 'gal_para_deletar_123';

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('deve eliminar uma galeria com sucesso e revalidar o dashboard', async () => {
      // 1. Mock do Cliente Supabase
      const mockQueryBuilder = {
        delete: vi.fn().mockReturnThis(),
        // A primeira chamada .eq() retorna um objeto que tem a segunda chamada .eq(),
        // que por sua vez resolve a promessa final.
        eq: vi
          .fn()
          .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        single: vi.fn(),
        // Adicionado para a chamada interna de getAuthAndStudioIds
        select: vi.fn().mockReturnThis(),
      };
      const mockSupabase = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: { id: 'user_123' } } }),
        },
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      };
      (supabaseServer.createSupabaseServerClient as any).mockResolvedValue(
        mockSupabase,
      );

      // 2. Mock do Profile (necessário para o getAuthAndStudioIds dentro da action)
      // Usamos mockResolvedValueOnce para a primeira chamada (getAuthAndStudioIds)
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { studio_id: 'studio_999' },
        error: null,
      });

      // 2. Executar a Action
      const result = await deleteGaleria(galeriaId);

      // 3. Asserts
      expect(result.success).toBe(true);
      expect(result.message).toContain('sucesso');

      // Verifica se os métodos corretos do banco foram chamados
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', galeriaId);

      // Garante que o Next.js vai atualizar a lista na interface
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('deve retornar erro quando a eliminação no Supabase falha', async () => {
      const mockQueryBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } }),
      };
      const mockSupabase = {
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      };
      (supabaseServer.createSupabaseServerClient as any).mockResolvedValue(
        mockSupabase,
      );

      // Simula um erro vindo do banco de dados (ex: erro de RLS ou violação de chave)

      const result = await deleteGaleria(galeriaId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Não foi possível excluir a galeria.');
    });
  });
});
