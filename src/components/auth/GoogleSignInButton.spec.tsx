import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GoogleSignInButton from './GoogleSignInButton';
import { authService } from '@photos/core-auth';

vi.mock('@photos/core-auth', () => ({
  authService: {
    signInWithGoogle: vi.fn(),
  },
}));

describe('GoogleSignInButton', () => {
  it('deve exibir o estado de carregamento enquanto a promessa não resolve', async () => {
    // 1. Criamos uma promessa controlada (Deferred)
    let resolveLogin: (value: unknown) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });

    // Fazemos o mock retornar essa promessa pendente
    (authService.signInWithGoogle as any).mockReturnValue(loginPromise);

    render(<GoogleSignInButton />);
    const button = screen.getByRole('button');

    // 2. Disparamos o clique (sem await no act aqui para não travar o teste)
    act(() => {
      fireEvent.click(button);
    });

    // 3. AGORA o texto deve estar lá, pois a promessa ainda não resolveu
    expect(screen.getByText(/Conectando/i)).toBeDefined();
    expect(button).toBeDisabled();

    // 4. Resolvemos a promessa para finalizar o teste
    await act(async () => {
      resolveLogin!(undefined);
    });

    // 5. Verificamos se voltou ao estado original
    await waitFor(() => {
      expect(screen.queryByText(/Conectando/i)).toBeNull();
      expect(button).not.toBeDisabled();
    });
  });
});
