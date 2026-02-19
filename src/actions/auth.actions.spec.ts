import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  captureLeadAction,
  authenticateGaleriaAccessAction,
} from './auth.actions';
import * as supabaseServer from '@/lib/supabase.server';
import { cookies } from 'next/headers';
import * as galeriaService from '@/core/services/galeria.service';
import { revalidateTag } from 'next/cache';
import * as statsService from '@/core/services/galeria-stats.service';

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/core/services/galeria.service', () => ({
  authenticateGaleriaAccess: vi.fn(),
}));

// 🎯 Adicionado mock do stats service
vi.mock('@/core/services/galeria-stats.service', () => ({
  emitGaleriaEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('auth.actions.ts - Testes Unitários', () => {
  // 🎯 Mock do objeto Galeria completo conforme a tipagem exige
  const mockGaleria = { id: 'gal-123', slug: 'teste-slug' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('captureLeadAction', () => {
    const mockGaleria = { id: 'gal-123', slug: 'teste' } as any;
    const leadData = {
      nome: 'João',
      email: 'joao@example.com',
      whatsapp: '31988887777',
    };

    it('1. deve salvar o lead com sucesso e definir o cookie', async () => {
      const mockSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ set: mockSet } as any);

      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValueOnce({ data: { user_id: 'user-456' }, error: null }) // Busca Owner
          .mockResolvedValueOnce({ data: { id: 'lead-999' }, error: null }), // Resultado Insert
      };

      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockQueryBuilder as any,
      );

      const result = await captureLeadAction(mockGaleria, leadData);

      expect(result.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('user-galerias-user-456');
      expect(mockSet).toHaveBeenCalledWith(
        `galeria-gal-123-lead`,
        'captured',
        expect.any(Object),
      );
    });

    it('2. deve limpar o whatsapp antes de salvar (garantir prefixo 55)', async () => {
      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValueOnce({ data: { user_id: 'user-456' }, error: null })
          .mockResolvedValueOnce({ data: { id: 'lead-999' }, error: null }),
      };

      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockQueryBuilder as any,
      );

      await captureLeadAction(mockGaleria, {
        ...leadData,
        whatsapp: '(31) 98888-7777',
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({ whatsapp: '5531988887777' }),
      ]);
    });

    it('3. deve tratar erro 23505 (unique_violation) como sucesso (Reconhecido)', async () => {
      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValueOnce({ data: { user_id: 'user-456' }, error: null })
          .mockResolvedValueOnce({
            data: null,
            error: { code: '23505', message: 'duplicate' },
          }),
      };

      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockQueryBuilder as any,
      );

      const result = await captureLeadAction(mockGaleria, leadData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Reconhecido');
      expect(revalidateTag).toHaveBeenCalledWith('user-galerias-user-456');
    });

    it('4. deve retornar erro se falhar com código desconhecido', async () => {
      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValueOnce({ data: { user_id: 'user-456' }, error: null })
          .mockResolvedValueOnce({
            data: null,
            error: { code: '500', message: 'DB Error' },
          }),
      };

      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockQueryBuilder as any,
      );

      const result = await captureLeadAction(mockGaleria, leadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('DB Error');
    });
  });
});
