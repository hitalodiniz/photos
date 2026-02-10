import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// 1. Mocks de Infraestrutura
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url) => ({ type: 'redirect', url, status: 302 })),
    json: vi.fn((data) => ({ type: 'json', data })),
  },
}));

describe('GET /api/auth/callback', () => {
  // 🎯 Mock dinâmico do cookie store para injetar o verifier
  const mockCookieStore = {
    getAll: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
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

    // Configurações de Ambiente
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = '.test.com';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://test.com';

    // 🎯 FIX: Injeta o cookie verifier por padrão para evitar erro de PKCE nos logs
    mockCookieStore.getAll.mockReturnValue([
      { name: 'google_code_verifier', value: 'mock-verifier-value' },
    ]);
    mockCookieStore.get.mockImplementation((name) => {
      if (name === 'google_code_verifier')
        return { value: 'mock-verifier-value' };
      return null;
    });

    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
  });

  it('deve redirecionar para / se não houver code', async () => {
    const request = new Request('https://test.com/api/auth/callback');
    await GET(request);
    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  it('deve trocar code por sessão quando code estiver presente e verifier existir', async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123' } },
      error: null,
    });

    const request = new Request(
      'https://test.com/api/auth/callback?code=test-code',
    );
    await GET(request);

    expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      'test-code',
    );
  });

  it('deve usar secure=true em produção', async () => {
    process.env.NODE_ENV = 'production';
    const request = new Request(
      'https://test.com/api/auth/callback?code=test-code',
    );

    await GET(request);

    // Captura o setAll injetado no Supabase Client
    const configCall = vi.mocked(createServerClient).mock.calls[0][2];
    configCall.cookies.setAll([
      { name: 'sb-auth', value: 'token', options: {} },
    ]);

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'sb-auth',
      'token',
      expect.objectContaining({
        secure: true,
        domain: '.test.com',
      }),
    );
  });

  it('deve usar secure=false em desenvolvimento', async () => {
    process.env.NODE_ENV = 'development';
    const request = new Request(
      'https://test.com/api/auth/callback?code=test-code',
    );

    await GET(request);

    const configCall = vi.mocked(createServerClient).mock.calls[0][2];
    configCall.cookies.setAll([
      { name: 'sb-auth', value: 'token', options: {} },
    ]);

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'sb-auth',
      'token',
      expect.objectContaining({
        secure: false,
      }),
    );
  });
});
