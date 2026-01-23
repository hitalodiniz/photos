import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserMenu from './UserMenu';
import React from 'react';

// Mock do hook useNavigation
vi.mock('@/components/providers/NavigationProvider', () => ({
  useNavigation: vi.fn(() => ({
    navigate: vi.fn(),
    isNavigating: false,
  })),
}));

describe('UserMenu Component', () => {
  const mockHandleLogout = vi.fn();
  const mockSession = {
    id: '123',
    email: 'hitalo@exemplo.com',
    name: 'Hitalo Diniz',
  };

  it('deve renderizar a letra inicial quando avatarUrl for nulo', () => {
    render(<UserMenu session={mockSession} avatarUrl={null} />);

    // Verifica se a inicial 'H' aparece no documento
    const initial = screen.getByText('H');
    expect(initial).toBeDefined();
    expect(initial.className).toContain('text-petroleum'); // Cor de texto
    expect(initial.className).toContain('bg-white'); // Cor de fundo
  });

  it('deve renderizar a imagem quando avatarUrl for fornecido', () => {
    const avatarUrl = 'https://exemplo.com/foto.jpg';

    render(<UserMenu session={mockSession} avatarUrl={avatarUrl} />);

    // No Next.js o componente Image renderiza uma tag img
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('foto.jpg');
  });

  it('deve usar o email como fallback se o nome não estiver presente', () => {
    const sessionWithoutName = { id: '123', email: 'diniz@exemplo.com' };

    render(<UserMenu session={sessionWithoutName} avatarUrl={null} />);

    // Deve pegar a primeira letra do email 'diniz' -> 'D'
    expect(screen.getByText('D')).toBeDefined();
  });
});
