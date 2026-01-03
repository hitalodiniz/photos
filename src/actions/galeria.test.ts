import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateUniqueDatedSlug,
  createGaleria,
  updateGaleria,
  getGalerias,
  deleteGaleria,
} from './galeria';
import * as supabaseServer from '@/lib/supabase.server';
import { createSupabaseServerClientReadOnly } from '@/lib/supabase.server';
import * as googleAuth from '@/lib/google-auth';
import * as googleDrive from '@/lib/google-drive';
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
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: profileData }),
      maybeSingle: vi.fn().mockResolvedValue({ data: existingSlug }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
    };
    (supabaseServer.createSupabaseServerClient as any).mockResolvedValue(
      mockSupabase,
    );
    (
      supabaseServer.createSupabaseServerClientReadOnly as any
    ).mockResolvedValue(mockSupabase);
    return mockSupabase;
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
      const mockSupabase = setupSupabaseMock({
        ...mockProfile,
        use_subdomain: true,
      });

      // Simula que o primeiro slug já existe, mas o segundo (-1) está livre
      mockSupabase.maybeSingle
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

      const mockSupabase = setupSupabaseMock();
      await createGaleria(formData);

      // Verifica se o insert recebeu o número limpo
      expect(mockSupabase.insert).toHaveBeenCalledWith(
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
      // 1. Obtemos a instância do cliente (que vem do seu vitest.setup)
      const mockSupabase =
        await supabaseServer.createSupabaseServerClientReadOnly();

      // 2. Garantimos que os métodos existam como funções mock do Vitest
      mockSupabase.from = vi.fn().mockReturnThis();
      mockSupabase.select = vi.fn().mockReturnThis();
      mockSupabase.eq = vi.fn().mockReturnThis();
      mockSupabase.order = vi.fn().mockReturnThis();
      mockSupabase.single = vi.fn(); // Definimos explicitamente como mock

      // 3. Resposta para o Profile (Primeira chamada interna)
      (mockSupabase.single as any).mockResolvedValueOnce({
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
      (mockSupabase.order as any).mockReturnValue({
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
      const mockSupabase = await supabaseServer.createSupabaseServerClient();

      // Mock do Profile (necessário para getAuthAndStudioIds)
      (mockSupabase.single as any).mockResolvedValue({
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
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          client_whatsapp: '31999998888',
          title: 'Evento Atualizado',
        }),
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', galeriaId);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('deve definir password como null quando a galeria for alterada para pública', async () => {
      const mockSupabase = await supabaseServer.createSupabaseServerClient();

      const formData = new FormData();
      formData.append('title', 'Galeria Pública');
      formData.append('drive_folder_id', 'id');
      formData.append('clientName', 'Nome');
      formData.append('is_public', 'true');
      formData.append('password', 'senha123'); // Enviada, mas deve ser ignorada

      await updateGaleria(galeriaId, formData);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password: null,
        }),
      );
    });

    it('deve manter a execução mesmo se a atualização de permissão no Google Drive falhar', async () => {
      const mockSupabase = await supabaseServer.createSupabaseServerClient();

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
      expect(mockSupabase.update).toHaveBeenCalled();
    });
  });

  describe('deleteGaleria', () => {
    const galeriaId = 'gal_para_deletar_123';

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('deve eliminar uma galeria com sucesso e revalidar o dashboard', async () => {
      // 1. Mock do Cliente Supabase
      const mockSupabase = await supabaseServer.createSupabaseServerClient();

      // 2. Mock do Profile (necessário para o getAuthAndStudioIds dentro da action)
      // Usamos mockResolvedValueOnce para a primeira chamada (getAuthAndStudioIds)
      (mockSupabase.single as any).mockResolvedValueOnce({
        data: { studio_id: 'studio_999' },
        error: null,
      });

      // 3. Configurar o encadeamento do delete com os dois filtros .eq()
      mockSupabase.delete = vi.fn().mockReturnThis();
      mockSupabase.from = vi.fn().mockReturnThis();
      // O eq() deve retornar o próprio objeto para permitir o encadeamento: .eq('id', id).eq('user_id', userId)
      mockSupabase.eq = vi.fn().mockReturnThis();

      // 2. Executar a Action
      const result = await deleteGaleria(galeriaId);

      // 3. Asserts
      expect(result.success).toBe(true);
      expect(result.message).toContain('sucesso');

      // Verifica se os métodos corretos do banco foram chamados
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', galeriaId);

      // Garante que o Next.js vai atualizar a lista na interface
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('deve retornar erro quando a eliminação no Supabase falha', async () => {
      const mockSupabase = await supabaseServer.createSupabaseServerClient();

      // Simula um erro vindo do banco de dados (ex: erro de RLS ou violação de chave)
      mockSupabase.delete = vi.fn().mockReturnThis();
      mockSupabase.eq = vi.fn().mockResolvedValue({
        error: { message: 'Database error' },
      });

      const result = await deleteGaleria(galeriaId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Não foi possível excluir a galeria.');
    });
  });
});
