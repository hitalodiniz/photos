import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DowngradeAlert } from './DowngradeAlert';

vi.mock('@/actions/downgrade.actions', () => ({
  acknowledgeDowngradeAlert: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/components/ui/BaseModal', () => ({
  default: ({ children, isOpen, title, footer }: any) =>
    isOpen ? (
      <div role="dialog">
        <h1>{title}</h1>
        {children}
        <footer>{footer}</footer>
      </div>
    ) : null,
}));

describe('DowngradeAlert', () => {
  const baseProfile = {
    id: 'p1',
    full_name: 'User Test',
    metadata: { last_downgrade_alert_viewed: false },
  };

  it('não renderiza se não houver galerias auto_archived', () => {
    render(
      <DowngradeAlert
        profile={baseProfile}
        galerias={[
          {
            id: 'g1',
            title: 'G1',
            date: new Date().toISOString(),
            auto_archived: false,
            is_archived: false,
            is_deleted: false,
          } as any,
        ]}
      />,
    );

    expect(
      screen.queryByRole('dialog'),
    ).not.toBeInTheDocument();
  });

  it('renderiza modal quando há galerias auto_archived e metadata ainda não vista', () => {
    render(
      <DowngradeAlert
        profile={baseProfile}
        galerias={[
          {
            id: 'g1',
            title: 'Galeria Auto',
            date: '2024-01-01',
            auto_archived: true,
            is_archived: false,
            is_deleted: false,
          } as any,
        ]}
      />,
    );

    // Title passed to BaseModal
    expect(
      screen.getByRole('heading', { name: /Notificação de Plano/i }),
    ).toBeInTheDocument();
    
    // Content inside the modal
    expect(
      screen.getByText(/galeria(s)? arquivada(s)? automaticamente/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Galeria Auto/i)).toBeInTheDocument();
  });

  it('não renderiza quando last_downgrade_alert_viewed é true', () => {
    render(
      <DowngradeAlert
        profile={{
          ...baseProfile,
          metadata: { last_downgrade_alert_viewed: true },
        }}
        galerias={[
          {
            id: 'g1',
            title: 'Galeria Auto',
            date: '2024-01-01',
            auto_archived: true,
            is_archived: false,
            is_deleted: false,
          } as any,
        ]}
      />,
    );

    expect(
      screen.queryByRole('dialog'),
    ).not.toBeInTheDocument();
  });

  it('chama acknowledgeDowngradeAlert ao clicar em Entendi', async () => {
    const { acknowledgeDowngradeAlert } = await import(
      '@/actions/downgrade.actions'
    );
    render(
      <DowngradeAlert
        profile={baseProfile}
        galerias={[
          {
            id: 'g1',
            title: 'Galeria Auto',
            date: '2024-01-01',
            auto_archived: true,
            is_archived: false,
            is_deleted: false,
          } as any,
        ]}
      />,
    );

    const button = screen.getByRole('button', { name: /Entendi/i });
    fireEvent.click(button);

    expect(acknowledgeDowngradeAlert).toHaveBeenCalled();
  });
});

