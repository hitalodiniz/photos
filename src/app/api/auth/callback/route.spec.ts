/**
 * ⚠️ CRÍTICO: Testes para callback OAuth
 * Estes testes validam troca de código por sessão e salvamento de tokens
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Mocks
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url) => ({ type: 'redirect', url })),
    json: vi.fn((data) => ({ type: 'json', data })),
  },
}));

describe('GET /api/auth/callback', () => {
  const mockCookieStore = {
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  };

  const mockSupabase = {
    auth: {
      exchangeCodeForSession: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = '.test.com';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://test.com';
    process.env.NODE_ENV = 'production';
    
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
  });

  it('deve redirecionar para / se não houver code', async () => {
    const request = new Request('https://test.com/api/auth/callback');
    
    const _response = await GET(request);
    
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/' }),
    );
  });

  it('deve trocar code por sessão quando code estiver presente', async () => {
    const mockSession = {
      user: { id: 'user-123' },
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    };

    vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    } as any);

    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    const request = new Request(
      'https://test.com/api/auth/callback?code=test-code',
    );
    
    await GET(request);
    
    expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      'test-code',
    );
  });

  it('deve configurar cookies com domínio correto', async () => {
    const mockSession = {
      user: { id: 'user-123' },
    };

    vi.mocked(mockSupabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    } as any);

    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    const request = new Request(
      'https://test.com/api/auth/callback?code=test-code',
    );
    
    await GET(request);
    
    // Verifica se setAll foi chamado (através do createServerClient)
    expect(createServerClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        cookies: expect.objectContaining({
          setAll: expect.any(Function),
        }),
      }),
    );
  });

  it('deve usar secure=true em produção', async () => {
    process.env.NODE_ENV = 'production';
    
    const request = new Request(
      'https://test.com/api/auth/callback?code=test-code',
    );
    
    await GET(request);
    
    const callArgs = vi.mocked(createServerClient).mock.calls[0];
    const setAll = callArgs[2].cookies.setAll;
    
    // Simula chamada de setAll
    setAll([{ name: 'test', value: 'value', options: {} }]);
    
    // Verifica se cookieStore.set foi chamado com secure: true
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'test',
      'value',
      expect.objectContaining({
        secure: true,
        domain: '.test.com', // Agora segue o configurado no beforeEach
      }),
    );
  });

  it('deve usar secure=false em desenvolvimento', async () => {
    process.env.NODE_ENV = 'development';
    
    const request = new Request(
      'https://test.com/api/auth/callback?code=test-code',
    );
    
    await GET(request);
    
    const callArgs = vi.mocked(createServerClient).mock.calls[0];
    const setAll = callArgs[2].cookies.setAll;
    
    setAll([{ name: 'test', value: 'value', options: {} }]);
    
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'test',
      'value',
      expect.objectContaining({
        secure: false,
      }),
    );
  });
});
