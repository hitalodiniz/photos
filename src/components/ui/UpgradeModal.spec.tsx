// src/components/ui/UpgradeModal.test.tsx
import { describe, test, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import UpgradeModal from './UpgradeModal';
import { PlanProvider } from '@/core/context/PlanContext';
import { Profile } from '@/core/types/profile';

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
      screen.getByRole('button', { name: /migrar para o premium/i }),
    ).toBeInTheDocument();
  });

  test('abre página de planos ao clicar em upgrade', () => {
    const windowSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Qualquer"
          featureKey="maxGalleries"
        />
      </PlanProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /migrar para o/i }));
    expect(windowSpy).toHaveBeenCalledWith('/dashboard/planos', '_blank');
    windowSpy.mockRestore();
  });

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

  test('scenarioType=limit exibe "Limite Atingido" e "Aumentar Limite"', () => {
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

  test('FREE com featureKey=canCaptureLeads → indica próximo plano PRO', () => {
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
    // PRO é o próximo plano que tem canCaptureLeads
    expect(
      screen.getByRole('button', { name: /migrar para o pro/i }),
    ).toBeInTheDocument();
  });

  test('exibe benefícios do plano próximo na lista', () => {
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
               {' '}
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Captura de Leads"
          featureKey="canCaptureLeads"
          scenarioType="feature"
        />
             {' '}
      </PlanProvider>,
    );

    // Em vez de buscar o número exato "50", buscamos pela estrutura do benefício
    // que contém o termo dinâmico (galerias/itens/etc)
    expect(screen.getByText(/ativas/i)).toBeInTheDocument();

    expect(
      screen.getByText(/captura e exportação de leads/i),
    ).toBeInTheDocument();
  });

  test('START com featureKey=canShowSlideshow → indica PRO como próximo plano', () => {
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
      screen.getByRole('button', { name: /migrar para o pro/i }),
    ).toBeInTheDocument();
  });

  test('featureKey=removeBranding → indica PREMIUM', () => {
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
      screen.getByRole('button', { name: /migrar para o premium/i }),
    ).toBeInTheDocument();
  });

  test('PLUS com featureKey=privacyLevel → indica PRO (password)', () => {
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'PLUS' })}>
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
      screen.getByRole('button', { name: /migrar para o pro/i }),
    ).toBeInTheDocument();
  });

  test('onClose dispara ao clicar em "Talvez mais tarde"', () => {
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
    fireEvent.click(screen.getByRole('button', { name: /talvez mais tarde/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
