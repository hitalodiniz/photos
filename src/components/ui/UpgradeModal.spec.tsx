'use client';

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
  test('deve aplicar fallback para PREMIUM quando featureKey não for fornecido', () => {
    const profile = makeMockProfile({ plan_key: 'FREE' });

    render(
      <PlanProvider profile={profile}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Recurso Especial"
          scenarioType="feature"
        />
      </PlanProvider>,
    );

    const explanatoryText = screen.getByText(
      /exclusivo para usuários do plano/i,
    );

    expect(explanatoryText).toBeInTheDocument();
    expect(explanatoryText.parentElement?.textContent).toMatch(/premium/i);

    const upgradeButton = screen.getByRole('button', {
      name: /migrar para o premium/i,
    });
    expect(upgradeButton).toBeInTheDocument();
  });

  test('deve abrir a página de planos corretamente ao clicar no botão', () => {
    const profile = makeMockProfile({ plan_key: 'FREE' });
    const windowSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <PlanProvider profile={profile}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Qualquer Feature"
          featureKey="maxGalleries"
        />
      </PlanProvider>,
    );

    const upgradeButton = screen.getByRole('button', {
      name: /Migrar para o/i,
    });

    fireEvent.click(upgradeButton);

    expect(windowSpy).toHaveBeenCalledWith('/dashboard/planos', '_blank');
    windowSpy.mockRestore();
  });

  test('não deve renderizar nada quando isOpen for false', () => {
    const profile = makeMockProfile();
    const { container } = render(
      <PlanProvider profile={profile}>
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
});
