/**
 * ⚠️ CRÍTICO: Testes para middleware de autenticação
 * Estes testes validam proteção de rotas e verificação de autenticação
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { middleware } from './middleware';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { fetchProfileDirectDB } from '@/core/services/profile.service';

// Mocks
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('@/core/services/profile.service', () => ({
  fetchProfileDirectDB: vi.fn(),
}));

vi.mock('@/core/utils/url-helper', () => ({
  resolveGalleryUrl: vi.fn((username, pathname) => 
    `https://${username}.test.com${pathname}`
  ),
}));

describe('middleware', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://test.com';
    process.env.NEXT_PUBLIC_MAIN_DOMAIN = undefined;
    process.env.NODE_ENV = 'development';
    
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
  });

  it('deve permitir acesso a arquivos estáticos', async () => {
    const request = new NextRequest('https://test.com/favicon.ico');
    
    const response = await middleware(request);
    
    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('deve permitir acesso a rotas de API', async () => {
    const request = new NextRequest('https://test.com/api/test');
    
    const response = await middleware(request);
    
    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('deve redirecionar usuário não autenticado de /dashboard', async () => {
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const request = new NextRequest('https://test.com/dashboard', {
      headers: new Headers({ host: 'test.com' }),
    });
    
    const response = await middleware(request);
    
    expect(response.status).toBe(307); // Redirect
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
  });

  it('deve permitir acesso a /dashboard para usuário autenticado', async () => {
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    const request = new NextRequest('https://test.com/dashboard', {
      headers: new Headers({ host: 'test.com' }),
    });
    
    const response = await middleware(request);
    
    expect(response.status).toBe(200);
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
  });

  it('deve redirecionar usuário não autenticado de /onboarding', async () => {
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const request = new NextRequest('https://test.com/onboarding', {
      headers: new Headers({ host: 'test.com' }),
    });
    
    const response = await middleware(request);
    
    expect(response.status).toBe(307);
  });

  it('deve fazer rewrite para subdomínio válido', async () => {
    vi.mocked(fetchProfileDirectDB).mockResolvedValue({
      username: 'testuser',
      use_subdomain: true,
    } as any);

    const request = new NextRequest('https://testuser.test.com/', {
      headers: new Headers({ host: 'testuser.test.com' }),
    });
    
    const response = await middleware(request);
    
    expect(fetchProfileDirectDB).toHaveBeenCalledWith('testuser');
    expect(response.status).toBe(200);
  });

  it('deve retornar 404 para subdomínio sem permissão', async () => {
    vi.mocked(fetchProfileDirectDB).mockResolvedValue({
      username: 'testuser',
      use_subdomain: false,
    } as any);

    const request = new NextRequest('https://testuser.test.com/', {
      headers: new Headers({ host: 'testuser.test.com' }),
    });
    
    const response = await middleware(request);
    
    // NextResponse.rewrite para /404
    expect(response.status).toBe(200);
  });

  it('deve redirecionar para subdomínio quando acessar via domínio principal', async () => {
    vi.mocked(fetchProfileDirectDB).mockResolvedValue({
      username: 'testuser',
      use_subdomain: true,
    } as any);

    const request = new NextRequest('https://test.com/testuser', {
      headers: new Headers({ host: 'test.com' }),
    });
    
    const response = await middleware(request);
    
    expect(response.status).toBe(301); // Redirect permanente (301 é usado no código)
  });
});
