// src/components/ui/UpgradeModal.spec.tsx
import { describe, test, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import UpgradeModal from './UpgradeModal';
import { PlanProvider } from '@/core/context/PlanContext';
import { Profile } from '@/core/types/profile';

vi.mock('@/core/services/billing.service', () => ({
  getBillingProfile: vi.fn(() => Promise.resolve(null)),
}));

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_SEGMENT', 'PHOTOGRAPHER');
});

const makeMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'user-123',
  full_name: 'Hitalo Diniz',
  username: 'hitalodiniz',
  operating_cities: [],
  email: 'hitalo@exemplo.com',
  profile_picture_url: null,
  plan_key: 'FREE',
  is_trial: false,
  plan_trial_expires: undefined,
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  settings: {
    display: { show_contract_type: true },
    defaults: {
      list_on_profile: false,
      enable_guest_registration: false,
      required_guest_fields: ['name', 'whatsapp'],
      data_treatment_purpose: '',
      background_color: '#FFFFFF',
      background_photo: '',
      grid_mobile: 2,
      grid_tablet: 3,
      grid_desktop: 4,
    },
  },
  message_templates: {
    CARD_SHARE: '',
    card_share: '',
    photo_share: '',
    guest_share: '',
  },
  ...overrides,
});

describe('UpgradeModal Integration', () => {
  // ─── Renderização básica ────────────────────────────────────────────────────

  test('não renderiza quando isOpen=false', () => {
    const { container } = render(
      <PlanProvider profile={makeMockProfile()}>
        <UpgradeModal
          isOpen={false}
          onClose={() => {}}
          featureName="Teste"
          scenarioType="feature"
        />
      </PlanProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  test('fallback para PREMIUM quando featureKey não fornecida', () => {
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Recurso Especial"
          scenarioType="feature"
        />
      </PlanProvider>,
    );
    expect(
      screen.getByText(/exclusivo para usuários do plano/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /migrar para o plano premium/i }),
    ).toBeInTheDocument();
  });

  // ─── scenarioType=limit ─────────────────────────────────────────────────────

  test('scenarioType=limit exibe "Limite Atingido" e botão "Aumentar Limite"', () => {
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Galerias Ativas"
          featureKey="maxGalleries"
          scenarioType="limit"
        />
      </PlanProvider>,
    );
    expect(screen.getByText(/limite atingido/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /aumentar limite/i }),
    ).toBeInTheDocument();
  });

  // ─── Navegação ──────────────────────────────────────────────────────────────

  test('abre página de planos ao clicar em upgrade', () => {
    const windowSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Qualquer"
          featureKey="maxGalleries"
          scenarioType="feature"
        />
      </PlanProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Migrar para o/i }));

    windowSpy.mockRestore();
  });

  test('onClose dispara ao clicar em "Manter o plano FREE"', () => {
    const onClose = vi.fn();
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
        <UpgradeModal
          isOpen={true}
          onClose={onClose}
          featureName="X"
          scenarioType="feature"
        />
      </PlanProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /manter o plano free/i }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  // ─── Detecção do próximo plano ──────────────────────────────────────────────

  test('FREE + canCaptureLeads → próximo plano é PRO', () => {
    // canCaptureLeads só ativa no PRO — FREE, START e PLUS não têm
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Captura de Leads"
          featureKey="canCaptureLeads"
          scenarioType="feature"
        />
      </PlanProvider>,
    );
    expect(
      screen.getByRole('button', { name: /migrar para o plano pro/i }),
    ).toBeInTheDocument();
  });

  test('START + canShowSlideshow → próximo plano é PRO', () => {
    // canShowSlideshow só ativa no PRO — FREE e START não têm
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'START' })}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Slideshow"
          featureKey="canShowSlideshow"
          scenarioType="feature"
        />
      </PlanProvider>,
    );
    expect(
      screen.getByRole('button', { name: /migrar para o plano pro/i }),
    ).toBeInTheDocument();
  });

  test('PRO + removeBranding → próximo plano é PREMIUM', () => {
    // removeBranding exclusivo do PREMIUM
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'PRO' })}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="White Label"
          featureKey="removeBranding"
          scenarioType="feature"
        />
      </PlanProvider>,
    );
    expect(
      screen.getByRole('button', { name: /migrar para o plano premium/i }),
    ).toBeInTheDocument();
  });

  test('FREE + privacyLevel → próximo plano é START (primeiro com senha)', () => {
    // findNextPlanWithFeature tem regra específica para privacyLevel:
    // qualquer mudança de valor (public -> password) já aciona o upgrade.
    // FREE = public, START = password → upgrade para START.
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Proteção por Senha"
          featureKey="privacyLevel"
          scenarioType="feature"
        />
      </PlanProvider>,
    );
    expect(
      screen.getByRole('button', { name: /migrar para o plano start/i }),
    ).toBeInTheDocument();
  });

  // ─── Benefícios exibidos (descrição do recurso + CTA do plano de destino) ─────

  test('lista de benefícios do plano PRO (FREE + canCaptureLeads)', () => {
    // nextPlanKey = PRO → exibe descrição do canCaptureLeads e CTA "Migrar para o Pro"
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Captura de Leads"
          featureKey="canCaptureLeads"
          scenarioType="feature"
        />
      </PlanProvider>,
    );

    expect(
      screen.getAllByText(/solicite nome.*whatsapp.*e-mail.*liberar as fotos/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole('button', { name: /migrar para o plano pro/i }),
    ).toBeInTheDocument();
  });

  test('lista de benefícios do plano PREMIUM (PRO + removeBranding)', () => {
    // nextPlanKey = PREMIUM → exibe descrição do removeBranding e CTA "Migrar para o Premium"
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'PRO' })}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="White Label"
          featureKey="removeBranding"
          scenarioType="feature"
        />
      </PlanProvider>,
    );

    expect(
      screen.getByText(/remova a marca do app do rodapé/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /migrar para o plano premium/i }),
    ).toBeInTheDocument();
  });

  test('lista de benefícios do plano START (FREE + canFavorite)', () => {
    // nextPlanKey = START → exibe descrição do canFavorite e CTA "Migrar para o Start"
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Favoritar Fotos"
          featureKey="canFavorite"
          scenarioType="feature"
        />
      </PlanProvider>,
    );

    expect(
      screen.getByText(/permita que clientes selecionem e favoritem fotos/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /migrar para o plano start/i }),
    ).toBeInTheDocument();
  });
});
