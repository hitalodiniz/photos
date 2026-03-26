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

vi.mock('@/components/ui/Upgradesheet', () => ({
  UpgradeSheet: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="upgrade-sheet" /> : null,
}));

describe('DowngradeAlert', () => {
  const baseProfile = {
    id: 'p1',
    full_name: 'User Test',
    metadata: { last_downgrade_alert_viewed: false },
  };

  it('renderiza aviso mesmo sem galerias auto_archived quando metadata pede exibição', () => {
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

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(/O período da sua assinatura expirou/i),
    ).toBeInTheDocument();
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
      screen.getByRole('heading', { name: /Adequação de Plano/i }),
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

    const button = screen.getByRole('button', { name: /Manter plano Free/i });
    fireEvent.click(button);

    expect(acknowledgeDowngradeAlert).toHaveBeenCalled();
  });

  it('renderiza aviso de trial expirado mesmo sem auto_archived e abre UpgradeSheet', () => {
    render(
      <DowngradeAlert
        profile={{
          ...baseProfile,
          plan_key: 'PRO',
          is_trial: true,
          plan_trial_expires: '2020-01-01 00:00:00+00',
        }}
        galerias={[]}
      />,
    );

    expect(
      screen.getByText(/O período da sua assinatura expirou/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Assinar plano/i }));
    expect(screen.getByTestId('upgrade-sheet')).toBeInTheDocument();
  });
});

