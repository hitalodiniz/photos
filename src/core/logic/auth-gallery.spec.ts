/**
 * ⚠️ CRÍTICO: Testes para validação de acesso a galerias protegidas
 * Estes testes validam segurança de JWT e cookies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkGalleryAccess } from './auth-gallery';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Mock do jose
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

// Mock do next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('checkGalleryAccess', () => {
  const mockGaleriaId = 'galeria-123';
  const mockSecret = 'test-secret-key-32-chars-long';
  const mockToken = 'valid-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_GALLERY_SECRET = mockSecret;
  });

  it('deve retornar false se não houver token no cookie', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    } as any);

    const result = await checkGalleryAccess(mockGaleriaId);
    expect(result).toBe(false);
  });

  it('deve retornar true se o token JWT for válido e o galeriaId corresponder', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    } as any);

    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { galeriaId: mockGaleriaId },
    } as any);

    const result = await checkGalleryAccess(mockGaleriaId);
    expect(result).toBe(true);
    expect(jwtVerify).toHaveBeenCalled();
    const callArgs = vi.mocked(jwtVerify).mock.calls[0];
    expect(callArgs[0]).toBe(mockToken);
    // Verifica que o segundo argumento é um Uint8Array
    expect(callArgs[1]).toBeDefined();
    expect(callArgs[1] instanceof Uint8Array || Object.prototype.toString.call(callArgs[1]) === '[object Uint8Array]').toBe(true);
  });

  it('deve retornar false se o galeriaId não corresponder', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    } as any);

    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { galeriaId: 'outro-id' },
    } as any);

    const result = await checkGalleryAccess(mockGaleriaId);
    expect(result).toBe(false);
  });

  it('deve retornar false se o JWT for inválido', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    } as any);

    vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid token'));

    const result = await checkGalleryAccess(mockGaleriaId);
    expect(result).toBe(false);
  });

  it('deve usar JWT_GALLERY_SECRET do ambiente ou fallback', async () => {
    delete process.env.JWT_GALLERY_SECRET;
    
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    } as any);

    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { galeriaId: mockGaleriaId },
    } as any);

    await checkGalleryAccess(mockGaleriaId);
    
    // Deve usar o fallback 'chave-padrao-de-seguranca-32'
    expect(jwtVerify).toHaveBeenCalled();
    const callArgs = vi.mocked(jwtVerify).mock.calls[0];
    expect(callArgs[0]).toBe(mockToken);
    // Verifica que o segundo argumento é um Uint8Array
    expect(callArgs[1]).toBeDefined();
    // Verifica se é instância de Uint8Array ou tem a estrutura correta
    expect(callArgs[1] instanceof Uint8Array || callArgs[1].constructor?.name === 'Uint8Array').toBe(true);
  });

  it('deve buscar o cookie com o nome correto', async () => {
    const mockCookieStore = {
      get: vi.fn().mockReturnValue({ value: mockToken }),
    };
    
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { galeriaId: mockGaleriaId },
    } as any);

    await checkGalleryAccess(mockGaleriaId);
    
    expect(mockCookieStore.get).toHaveBeenCalledWith(
      `galeria-${mockGaleriaId}-auth`,
    );
  });
});
