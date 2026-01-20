/**
 * Testes unitários para useSupabaseSession
 * 
 * ⚠️ CRÍTICO: Estes testes validam comportamento de autenticação
 * Não altere sem entender completamente o impacto!
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSupabaseSession } from './useSupabaseSession';

// Mock do Supabase
vi.mock('@/lib/supabase.client', () => {
  const mockAuth = {
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };

  return {
    supabase: {
      auth: mockAuth,
    },
  };
});

// Mock do AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  AuthContext: {
    Provider: ({ children }: any) => children,
  },
  useAuth: vi.fn(),
}));

// Mock do getValidGoogleToken
vi.mock('@/actions/google.actions', () => ({
  getValidGoogleToken: vi.fn(),
}));

describe('useSupabaseSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com estado de loading', () => {
    const { result } = renderHook(() => useSupabaseSession());
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.userId).toBeNull();
  });

  it('deve retornar getAuthDetails como função', () => {
    const { result } = renderHook(() => useSupabaseSession());
    
    expect(typeof result.current.getAuthDetails).toBe('function');
  });

  it('deve retornar refreshSession como função', () => {
    const { result } = renderHook(() => useSupabaseSession());
    
    expect(typeof result.current.refreshSession).toBe('function');
  });

  // Adicione mais testes conforme necessário
  // Lembre-se: estes testes validam comportamento crítico de segurança
});
