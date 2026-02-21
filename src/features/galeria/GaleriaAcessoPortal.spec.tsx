import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GalleryAccessPortal from './GaleriaAcessoPortal';
import {
  authenticateGaleriaAccessAction,
  captureLeadAction,
} from '@/actions/auth.actions';
import { Galeria } from '@/core/types/galeria';

// Mocks
vi.mock('@/actions/auth.actions', () => ({
  authenticateGaleriaAccessAction: vi.fn(),
  captureLeadAction: vi.fn(),
}));

vi.mock('@/core/utils/url-helper', () => ({
  getDirectGoogleUrl: vi.fn().mockReturnValue('mock-url'),
}));

vi.mock('@/components/ui/LoadingScreen', () => ({
  default: () => <div data-testid="loading-screen">Carregando...</div>,
}));

// Mock do window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

describe('GalleryAccessPortal', () => {
  const mockGaleria: Partial<Galeria> = {
    id: 'gal-123',
    title: 'Minha Galeria',
    is_public: false,
    leads_enabled: true,
    leads_require_name: true,
    leads_require_email: true,
    leads_require_whatsapp: true,
    cover_image_url: 'cover.jpg',
  };

  const defaultProps = {
    galeria: mockGaleria as Galeria,
    fullSlug: 'user/slug',
    isOpen: true,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fillPin = (value: string) => {
    const pinInput = document.getElementById('pin-hidden-input');
    expect(pinInput).toBeTruthy();
    fireEvent.change(pinInput as HTMLInputElement, {
      target: { value },
    });
  };

  it('deve renderizar os campos de lead e senha corretamente', () => {
    render(<GalleryAccessPortal {...defaultProps} />);

    expect(screen.getByText('Minha Galeria')).toBeDefined();
    expect(
      screen.getByPlaceholderText('Como devemos te chamar?'),
    ).toBeDefined();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeDefined();
    expect(screen.getByPlaceholderText('(00) 00000-0000')).toBeDefined();
    expect(document.getElementById('pin-hidden-input')).toBeTruthy();
  });

  it('deve validar campos obrigatórios', async () => {
    render(<GalleryAccessPortal {...defaultProps} />);
    const form = document.getElementById('access-portal-form');
    expect(form).toBeTruthy();
    fireEvent.submit(form as HTMLFormElement);

    expect(await screen.findByText('Nome obrigatório')).toBeDefined();
    expect(await screen.findByText('E-mail inválido')).toBeDefined();
    expect(await screen.findByText('Número incompleto')).toBeDefined();
    expect(await screen.findByText('Senha obrigatória')).toBeDefined();
  });

  it('deve processar o acesso com sucesso (Leads + Senha)', async () => {
    vi.mocked(captureLeadAction).mockResolvedValue({ success: true });
    vi.mocked(authenticateGaleriaAccessAction).mockResolvedValue({
      success: true,
    });

    render(<GalleryAccessPortal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Como devemos te chamar?'), {
      target: { value: 'João Silva' },
    });
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'joao@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), {
      target: { value: '31988887777' },
    });
    fillPin('1234');

    // Marca o consentimento LGPD
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByText('Acessar Galeria'));

    await waitFor(() => {
      expect(captureLeadAction).toHaveBeenCalledWith(
        // Verifica se o primeiro argumento é o objeto da galeria (ou contém o ID)
        expect.objectContaining({ id: 'gal-123' }),
        expect.objectContaining({
          nome: 'João Silva',
          email: 'joao@example.com',
          whatsapp: '31988887777',
        }),
      );
    });

    await waitFor(
      () => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  it('deve exibir erro se captureLeadAction falhar', async () => {
    vi.mocked(captureLeadAction).mockResolvedValue({
      success: false,
      error: 'Erro no Lead',
    });

    render(<GalleryAccessPortal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Como devemos te chamar?'), {
      target: { value: 'João Silva' },
    });
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'joao@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), {
      target: { value: '31988887777' },
    });
    fillPin('1234');

    // Marca o consentimento LGPD
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByText('Acessar Galeria'));

    expect(await screen.findByText('Erro no Lead')).toBeDefined();
  });

  it('deve exibir erro se authenticateGaleriaAccessAction falhar', async () => {
    vi.mocked(captureLeadAction).mockResolvedValue({ success: true });
    vi.mocked(authenticateGaleriaAccessAction).mockResolvedValue({
      success: false,
      error: 'Senha incorreta',
    });

    render(<GalleryAccessPortal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Como devemos te chamar?'), {
      target: { value: 'João Silva' },
    });
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'joao@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), {
      target: { value: '31988887777' },
    });
    fillPin('1234');

    // Marca o consentimento LGPD
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByText('Acessar Galeria'));

    expect(await screen.findByText('Senha incorreta')).toBeDefined();
  });
});
