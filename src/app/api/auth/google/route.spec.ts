/**
 * ⚠️ CRÍTICO: Testes para rota de login Google OAuth
 * Estes testes validam redirecionamento e parâmetros OAuth
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextResponse } from 'next/server';

// Mock
vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url) => ({ type: 'redirect', url })),
  },
}));

describe('GET /api/auth/google', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://test.com';
  });

  it('deve redirecionar para erro se code estiver faltando', async () => {
    const request = new Request('https://test.com/api/auth/google');
    
    await GET(request);
    
    // Verifica que NextResponse.redirect foi chamado
    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
    // Pode ser URL ou string
    const urlString = redirectCall instanceof URL ? redirectCall.toString() : redirectCall;
    expect(urlString).toContain('error=missing_parameters');
  });

  it('deve redirecionar para erro se state estiver faltando', async () => {
    const request = new Request(
      'https://test.com/api/auth/google?code=test-code',
    );
    
    await GET(request);
    
    // Verifica que NextResponse.redirect foi chamado
    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
    // Pode ser URL ou string
    const urlString = redirectCall instanceof URL ? redirectCall.toString() : redirectCall;
    expect(urlString).toContain('error=missing_parameters');
  });

  it('deve construir URL de callback do Supabase corretamente', async () => {
    const request = new Request(
      'https://test.com/api/auth/google?code=test-code&state=test-state',
    );
    
    await GET(request);
    
    const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
    const url = new URL(redirectCall);
    
    expect(url.origin).toBe('https://test.supabase.co');
    expect(url.pathname).toBe('/auth/v1/callback');
    expect(url.searchParams.get('code')).toBe('test-code');
    expect(url.searchParams.get('state')).toBe('test-state');
    expect(url.searchParams.get('redirect_to')).toBe(
      'https://test.com/api/auth/callback',
    );
  });

  it('deve incluir redirect_to apontando para /api/auth/callback', async () => {
    const request = new Request(
      'https://test.com/api/auth/google?code=test-code&state=test-state',
    );
    
    await GET(request);
    
    const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
    const url = new URL(redirectCall);
    
    expect(url.searchParams.get('redirect_to')).toBe(
      'https://test.com/api/auth/callback',
    );
  });
});
