import { vi, describe, it, expect, beforeEach } from 'vitest';

// 🎯 Mock preventivo: impede que o código real de 'auth.service' tente importar o 'supabase' real
vi.mock('@/core/services/auth.service', () => ({
  authService: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('@/core/services/profile.service', () => ({
  profileService: {
    getAvatarUrl: vi.fn(),
  },
}));

import { render, waitFor, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '@/core/services/auth.service';
import { profileService } from '@/core/services/profile.service';
import React from 'react';

// Componente auxiliar para ler o estado do contexto no teste
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

    // 1. Simula que inicialmente não há sessão
    (authService.getSession as any).mockResolvedValue(null);

    // 2. Simula que o onAuthStateChange dispara um evento de SIGNED_IN
    (authService.onAuthStateChange as any).mockImplementation(
      (callback: any) => {
        // Dispara o login imediatamente para o teste
        callback('SIGNED_IN', { user: mockUser });
        return { unsubscribe: vi.fn() };
      },
    );

    // 3. Simula o retorno do serviço de perfil
    (profileService.getAvatarUrl as any).mockResolvedValue(mockAvatar);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // 4. Verificações de Integração
    // Espera o loading sumir e os dados aparecerem
    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe(mockUser.email);
    });

    // O ponto principal: Garante que o avatarUrl mudou no estado global
    expect(screen.getByTestId('avatar-url').textContent).toBe(mockAvatar);

    // Garante que o serviço de perfil foi chamado com o ID correto
    expect(profileService.getAvatarUrl).toHaveBeenCalledWith(mockUser.id);
  });
});
