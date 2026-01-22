import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureLeadAction, authenticateGaleriaAccessAction } from './auth.actions';
import * as supabaseServer from '@/lib/supabase.server';
import { cookies } from 'next/headers';
import * as galeriaService from '@/core/services/galeria.service';

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/core/services/galeria.service', () => ({
  authenticateGaleriaAccess: vi.fn(),
}));

describe('auth.actions.ts - Testes Unitários', () => {
  const mockGaleriaId = 'gal-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('captureLeadAction', () => {
    const leadData = {
      nome: 'João Silva',
      email: 'joao@example.com',
      whatsapp: '31988887777',
    };

    it('deve salvar o lead com sucesso e definir o cookie', async () => {
      const mockSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({
        set: mockSet,
      } as any);

      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(mockQueryBuilder as any);

      const result = await captureLeadAction(mockGaleriaId, leadData);

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.from).toHaveBeenCalledWith('tb_galeria_leads');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        {
          galeria_id: mockGaleriaId,
          name: leadData.nome,
          email: leadData.email,
          whatsapp: leadData.whatsapp,
        },
      ]);
      expect(mockSet).toHaveBeenCalledWith(
        `galeria-${mockGaleriaId}-lead`,
        'captured',
        expect.any(Object)
      );
    });

    it('deve retornar erro se falhar ao inserir o lead', async () => {
      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: { message: 'DB Error', code: '500' } }),
      };

      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(mockQueryBuilder as any);

      const result = await captureLeadAction(mockGaleriaId, leadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Erro ao salvar dados');
      expect(result.error).toContain('DB Error');
    });
  });

  describe('authenticateGaleriaAccessAction', () => {
    it('deve chamar authenticateGaleriaAccess com os parâmetros corretos', async () => {
      const mockRes = { success: true };
      vi.mocked(galeriaService.authenticateGaleriaAccess).mockResolvedValue(mockRes as any);

      const result = await authenticateGaleriaAccessAction(mockGaleriaId, 'slug', '1234');

      expect(result).toBe(mockRes);
      expect(galeriaService.authenticateGaleriaAccess).toHaveBeenCalledWith(mockGaleriaId, 'slug', '1234');
    });
  });
});
