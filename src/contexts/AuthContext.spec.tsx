// src/contexts/AuthContext.spec.tsx
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react'; // Certifique-se de que o React está aqui
import { render, waitFor, screen } from '@testing-library/react';

// Mocks devem vir antes da importação do componente que os utiliza
vi.mock('@/core/services/auth.service', () => ({
  authService: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('@/core/services/profile.service', () => ({
  getAvatarUrl: vi.fn(),
}));

// Agora importe o Contexto
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '@/core/services/auth.service';
import { getAvatarUrl } from '@/core/services/profile.service';

const TestComponent = () => {
  const { user, avatarUrl, isLoading } = useAuth();
  if (isLoading) return <div data-testid="loading">Carregando...</div>;
  return (
    <div>
      <div data-testid="user-email">{user?.email || 'no-user'}</div>
      <div data-testid="avatar-url">{avatarUrl || 'no-avatar'}</div>
    </div>
  );
};

describe('AuthContext Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar o avatarUrl corretamente quando o usuário faz login', async () => {
    const mockUser = { id: 'user_123', email: 'fotografo@exemplo.com' };
    const mockAvatar = 'https://supabase.co/storage/v1/avatar.png';

    vi.mocked(authService.getSession).mockResolvedValue(null);
    vi.mocked(authService.onAuthStateChange).mockImplementation(
      (callback: any) => {
        // Dispara o evento de login para o teste
        callback('SIGNED_IN', { user: mockUser });

        // Retorna exatamente o que o seu código espera na variável 'subscription'
        return {
          unsubscribe: vi.fn(),
        };
      },
    );

    vi.mocked(getAvatarUrl).mockResolvedValue(mockAvatar);

    // 🎯 Verifique se AuthProvider não está chegando como undefined
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Aguarda o usuário ser carregado
    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe(mockUser.email);
    });

    // 🎯 Aguarda o avatarUrl ser carregado (loadProfile é assíncrono)
    await waitFor(
      () => {
        expect(screen.getByTestId('avatar-url').textContent).toBe(mockAvatar);
      },
      {
        timeout: 3000, // Timeout de 3 segundos
      },
    );
  });
});
