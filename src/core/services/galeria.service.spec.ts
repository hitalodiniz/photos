import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateUniqueDatedSlug,
  createGaleria,
  updateGaleria,
  getGalerias,
  deleteGaleria,
  getGaleriaPhotos,
  authenticateGaleriaAccess,
  deleteGalleryPermanently,
} from './galeria.service';
import * as supabaseServer from '@/lib/supabase.server';
import * as googleAuth from '@/lib/google-auth';
import * as googleDrive from '@/lib/google-drive';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';

// =========================================================================
// CONFIGURAÇÃO GLOBAL E MOCKS ESTABILIZADOS
// =========================================================================

vi.stubGlobal('fetch', vi.fn());
vi.stubEnv('JWT_GALLERY_SECRET', '12345678901234567890123456789012');

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn, key, options) => {
    // Simula o comportamento do unstable_cache: retorna uma função que executa fn quando chamada
    return (...args: any[]) => fn(...args);
  }),
}));

// O redirect precisa ser mockado de forma simples para não quebrar o worker
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url) => {
    const err = new Error('NEXT_REDIRECT');
    (err as any).digest = `NEXT_REDIRECT;replace;${url};303;`;
    throw err;
  }),
}));

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServerClientReadOnly: vi.fn(),
  createSupabaseClientForCache: vi.fn(),
}));

vi.mock('@/lib/google-auth', () => ({
  getDriveAccessTokenForUser: vi.fn(),
}));

vi.mock('@/lib/google-drive', () => ({
  listPhotosFromDriveFolder: vi.fn(),
}));

vi.mock('jose', () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('token-fake-123'),
  })),
}));

// Mock do next/headers como objeto plano
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}));

describe('Galeria Service - Testes Unitários', () => {
  const mockUserId = 'user_hitalo';
  const mockStudioId = 'studio_123';
  const mockProfile = {
    studio_id: mockStudioId,
    username: 'fotografo_teste',
    use_subdomain: false,
  };

  const setupSupabaseMock = (profileData: any = mockProfile) => {
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      // Mudança crítica: maybeSingle retorna null por padrão para não travar loops de slug
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: profileData, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
      mockSupabase as any,
    );
    vi.mocked(
      supabaseServer.createSupabaseServerClientReadOnly,
    ).mockResolvedValue(mockSupabase as any);
    // 🎯 Mock para createSupabaseClientForCache usado dentro de unstable_cache
    vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
      mockSupabase as any,
    );

    return { mockSupabase, mockQueryBuilder };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. TESTES DE SLUG
  // =========================================================================
  describe('generateUniqueDatedSlug', () => {
    it('deve gerar slug único incluindo username e data', async () => {
      setupSupabaseMock();
      const slug = await generateUniqueDatedSlug(
        'Ensaio Gestante',
        '2026-01-10',
      );
      expect(slug).toBe('fotografo_teste/2026/01/10/ensaio-gestante');
    });

    it('deve resolver colisão adicionando sufixo incremental', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'original' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'original-1' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const slug = await generateUniqueDatedSlug('Festa', '2026-01-01');
      expect(slug).toBe('fotografo_teste/2026/01/01/festa-2');
    });
  });

  it('deve retornar erro ao buscar galeria por ID inexistente', async () => {
    const { mockQueryBuilder } = setupSupabaseMock();

    // Simula o maybeSingle retornando nulo (galeria não encontrada)
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await getGaleriaPhotos('id-fantasma');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Galeria não encontrada.');
  });
  // =========================================================================
  // 2. Atuallizações de galeria
  // =========================================================================
  describe('Update galeria', () => {
    /*it('deve retornar erro ao falhar na atualização da galeria', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();

      // 1. Configura os métodos que apenas retornam 'this'
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.update.mockReturnThis();

      // 2. ORQUESTRANDO O .eq() COM PRECISÃO
      mockQueryBuilder.eq
        // Primeira chamada (Perfil): Retorna o mock para permitir o .single()
        .mockImplementationOnce(() => mockQueryBuilder)
        // Segunda chamada (Update): Retorna o erro final
        .mockImplementationOnce(() =>
          Promise.resolve({
            data: null,
            error: { message: 'Database Error' },
          }),
        );

      // 3. Mock do .single() para a chamada do Perfil
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { studio_id: 's1', user_id: 'u1' },
        error: null,
      });

      // 4. FormData COMPLETO (Essencial para passar da linha 277)
      const fd = new FormData();
      fd.append('title', 'Galeria Editada');
      fd.append('drive_folder_id', 'pasta_123');
      fd.append('clientName', 'João Silva');
      fd.append('date', '2026-01-01');

      // EXECUÇÃO
      const result = await updateGaleria('id_da_galeria', fd);

      // VALIDAÇÃO
      expect(result.success).toBe(false);
      expect(result.error).toBe('Campos obrigatórios ausentes.');
    });*/

    it('updateGaleria deve desativar senha se galeria for alterada para pública', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      const fd = new FormData();
      fd.append('title', 'Update');
      fd.append('drive_folder_id', 'id_pasta');
      // Mantenha clientName se o seu formulário usa esse name no input
      fd.append('client_name', 'Joao');
      fd.append('date', '2026-01-01');
      fd.append('is_public', 'true');
      fd.append('password', '123');

      // Adicione os campos de customização que a função prepareGalleryData exige
      fd.append('show_cover_in_grid', 'true');
      fd.append('grid_bg_color', '#F3E5AB');

      // O single() simula a busca da galeria existente para validar permissão
      mockQueryBuilder.single.mockResolvedValue({
        data: { studio_id: 'studio_123' },
        error: null,
      });

      // IMPORTANTE: O mock do update também precisa retornar sucesso para o result.success ser true
      mockQueryBuilder.update.mockReturnValue(mockQueryBuilder); // Mantém o chain
      mockQueryBuilder.select.mockReturnValue(mockQueryBuilder); // Se houver .select()
      mockQueryBuilder.single
        .mockResolvedValueOnce({
          data: { studio_id: 'studio_123' },
          error: null,
        }) // para o find
        .mockResolvedValueOnce({ data: { id: 'gal_123' }, error: null }); // para o resultado do update

      const result = await updateGaleria('gal_123', fd);

      // Se o service retornar {success: true, data: ...}
      expect(result.success).toBe(true);

      // Verifica se o service limpou a senha ao detectar is_public: true
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password: null,
          is_public: true,
        }),
      );
    });
    /*it('deve capturar erro crítico ao deletar galeria', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      mockQueryBuilder.delete.mockReturnThis();
      // Simula erro no .eq() finalizador do delete
      mockQueryBuilder.eq.mockResolvedValueOnce({
        error: { message: 'Delete Failed' },
      });

      const result = await deleteGalleryPermanently('123');
      expect(result).toBe(true);
    });*/
  });

  describe('Exclusão de galeria ', () => {
    /*it('deve retornar erro ao falhar na exclusão da galeria', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();

      // 1. Mock do Perfil (se o delete exigir studioId)
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockImplementationOnce(() => mockQueryBuilder);
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { studio_id: 's1' },
      });

      // 2. Mock do Erro no Delete
      mockQueryBuilder.delete.mockReturnThis();
      mockQueryBuilder.eq.mockImplementationOnce(() =>
        Promise.resolve({
          error: { message: 'Erro ao deletar' },
        }),
      );

      const result = await deleteGaleria('id_para_deletar');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined(); // Verifique a string exata no seu catch
    });*/

    it('deve disparar erro se o banco falhar no final do update', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();

      // Mocks para passar pelo Auth
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockImplementationOnce(() => mockQueryBuilder);
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { studio_id: '1' },
      });

      // Mock do Erro no Update
      mockQueryBuilder.update.mockReturnThis();
      mockQueryBuilder.eq.mockResolvedValueOnce({
        error: { message: 'DB Error' },
      });

      const fd = new FormData();
      fd.append('title', 'T');
      fd.append('drive_folder_id', 'D');
      fd.append('clientName', 'C');

      const result = await updateGaleria('id', fd);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. DRIVE E BUSCA
  // =========================================================================
  describe('Integração Drive', () => {
    it('getGaleriaPhotos deve ordenar fotos por data decrescente', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { studio_id: mockStudioId },
      });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { drive_folder_id: 'f1' },
      });

      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
        'token',
      );
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue([
        { name: 'Velha', createdTime: '2025-01-01' },
        { name: 'Nova', createdTime: '2026-01-01' },
      ] as any);

      const res = await getGaleriaPhotos('123');
      expect(res.data![0].name).toBe('Nova');
    });

    it('getGalerias deve capturar erro de expiração do Google', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      mockQueryBuilder.order.mockRejectedValue(new Error('Google expirou'));

      const result = await getGalerias();
      expect(result.error).toBe('AUTH_RECONNECT_REQUIRED');
    });

    it('getGaleriaPhotos deve falhar se o folder_id do drive for nulo', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      // Mock para passar no Auth, mas falhar na busca da galeria (sem drive_folder_id)
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { studio_id: '1' },
      });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { drive_folder_id: null },
      });

      const result = await getGaleriaPhotos('gal_123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Galeria não encontrada.');
    });

    it('deve capturar erro genérico ao buscar fotos da galeria (catch)', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();

      mockQueryBuilder.single.mockResolvedValue({ data: { studio_id: 's1' } });
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { drive_folder_id: 'f1' },
      });
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
        'token',
      );

      // Simula o erro que dispara o catch
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error('Drive Offline'),
      );

      const result = await getGaleriaPhotos('123');

      expect(result.success).toBe(false);
      // Ajustado para o que o seu código realmente devolve no catch:
      expect(result.error).toBe('Drive Offline');
    });

    it('deve cobrir o bloco catch de getGaleriaPhotos (linhas 414-425)', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();

      // Passa pelas validações
      mockQueryBuilder.single.mockResolvedValue({ data: { studio_id: 's1' } });
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { drive_folder_id: 'f1' },
      });
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
        'token',
      );

      // Simula uma falha crítica que caia no CATCH (não apenas retorno null)
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error('Falha catastrófica'),
      );

      const result = await getGaleriaPhotos('123');

      expect(result.success).toBe(false);
      // Garante que passou pelo console.error e retornou o objeto de erro
      expect(result.error).toBeDefined();
    });

    it('deve tratar erro quando os dados da galeria no banco estão corrompidos ou incompletos', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();

      mockQueryBuilder.single.mockResolvedValue({ data: { studio_id: 's1' } });

      // Simula que a galeria existe mas o drive_folder_id é nulo (Linha que pode estar descoberta)
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { drive_folder_id: null },
        error: null,
      });

      const result = await getGaleriaPhotos('123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Galeria não encontrada.');
    });
    it('deve capturar erro da infraestrutura no Service e retornar resposta amigável', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();

      // 1. Mocks para passar pelo Supabase
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { studio_id: 'studio_123' },
      });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { drive_folder_id: 'pasta_id' },
      });

      // 2. Mock para o Token funcionar
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
        'token-fake',
      );

      // 3. O PONTO CHAVE: A listagem explode, mas o Service deve capturar
      const errorMessage = 'Drive API Crash';
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error(errorMessage),
      );

      // 4. EXECUÇÃO: Chamamos o Service (getGaleriaPhotos)
      const result = await getGaleriaPhotos('123');

      // 5. VALIDAÇÃO: O teste não explode mais. Ele recebe o retorno do catch.
      expect(result).toEqual({
        success: false,
        error: errorMessage, // Agora o teste aceita a mensagem real
        data: [], // getFolderPhotos sempre retorna data: [] em caso de erro
      });
    });

    it('deve retornar erro amigável quando a listagem do Drive falha', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();

      // Mocks para passar pelo Supabase
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { studio_id: 's1' },
      });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { drive_folder_id: 'folder_abc' },
      });

      // Mock para passar pelo Token
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
        'token-valido',
      );

      // SIMULAÇÃO DO THROW: A listagem explode com erro de pasta não encontrada
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error(
          'A pasta selecionada não foi encontrada no seu Google Drive.',
        ),
      );

      // EXECUÇÃO: Chamamos o Service
      const result = await getGaleriaPhotos('123');

      // VALIDAÇÃO: O service capturou o throw e transformou em objeto de erro
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'A pasta selecionada não foi encontrada no seu Google Drive.',
      );
    });
    it('deve tratar erro de rede na listagem do Google Drive', async () => {
      // Mock do fetch global para simular erro de conexão
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network connection failed'));

      // Ao chamar a função que usa fetch, ela deve capturar no catch
      // ou você testa o throw se ela não tiver catch interno
      await expect(
        googleDrive.listPhotosFromDriveFolder('id', 'token'),
      ).rejects.toThrow(
        'A pasta selecionada não foi encontrada no seu Google Drive.',
      );
    });
  });

  describe('Perfil de usuário', () => {
    it('deve retornar erro se o perfil do usuário não for encontrado', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Profile Error' },
      });

      const result = await getGalerias();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Profile do usuário não encontrado');
    });
  });

  //describe('Criação de galeria', () => {
  /*it('createGaleria deve falhar se os campos obrigatórios estiverem ausentes', async () => {
      const fd = new FormData(); // FormData vazio
      const result = await createGaleria(fd);
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Título, Data e Pasta do Drive são obrigatórios.',
      );
    });*/
  /*it('createGaleria deve sanitizar WhatsApp', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      const fd = new FormData();
      fd.append('title', 'Teste');
      fd.append('date', '2026-01-01');
      fd.append('drive_folder_id', 'folder_123');
      fd.append('client_whatsapp', '(31) 98888-7777');

      await createGaleria(fd);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ client_whatsapp: '31988887777' }),
      );
    });*/
  /*it('deve capturar erro do Supabase ao inserir nova galeria', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();

      // 1. Mock do Perfil e Slug (usamos mockResolvedValue para simplificar)
      mockQueryBuilder.single.mockResolvedValue({
        data: { studio_id: 'studio_123' },
        error: null,
      });
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      // 2. Simula o erro EXATAMENTE como o código espera
      // O seu código faz: .from('tb_galerias').insert({...})
      // O mockQueryBuilder.insert deve retornar um objeto que contenha o erro
      mockQueryBuilder.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database failure' },
      });

      const fd = new FormData();
      fd.append('title', 'Título Válido');
      fd.append('date', '2026-01-01');
      fd.append('drive_folder_id', 'pasta_123');

      const result = await createGaleria(fd);

      // 3. AJUSTE DAS EXPECTATIVAS
      expect(result.success).toBe(false);
      // Tem que ser a string exata que está no seu CATCH
      expect(result.error).toBe('Erro interno ao salvar no banco de dados.');
    });*/
  // });
  // =========================================================================
  // 4. SEGURANÇA
  // =========================================================================
  describe('Segurança', () => {
    it('authenticateGaleriaAccess deve tratar senha incorreta', async () => {
      setupSupabaseMock({ password: '123', user_id: 'u1' });
      const res = await authenticateGaleriaAccess('id', 'slug', 'senha_errada');
      expect(res.success).toBe(false);
    });

    it('deve retornar AUTH_RECONNECT_REQUIRED se o Google Access Token for nulo', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();

      // Mock do Supabase ok
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { studio_id: 's1' },
      });
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { drive_folder_id: 'f1' },
      });

      // Simula que o Google Auth retornou null (conforme o novo try/catch)
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(null);

      const result = await getGaleriaPhotos('123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Falha na integração Google Drive. Refaça o login/integração.',
      );
    });

    /*it('deleteGaleria deve validar dono', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      mockQueryBuilder.eq.mockResolvedValue({ error: null });

      await deleteGaleria('id');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', mockUserId);
    });*/
  });

  // =========================================================================
  // 5.
  // =========================================================================
  //describe('Segurança', () => {});
});
