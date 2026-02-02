'use client';

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UpgradeModal from './UpgradeModal';
import { PlanProvider } from '@/core/context/PlanContext';
import { Profile } from '@/core/types/profile';

const makeMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'user-123',
  full_name: 'Hitalo Diniz',
  username: 'hitalodiniz',
  operating_cities: [],
  email: 'hitalo@exemplo.com',
  profile_picture_url: null,
  plan_key: 'FREE',
  is_trial: false,
  plan_trial_expires: new Date().toISOString(),
  updated_at: new Date().toISOString(),
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
        />
      </PlanProvider>,
    );

    // 1. Valida o texto explicativo (usando query por parágrafo ou texto parcial)
    expect(
      screen.getByText(/exclusivo para assinantes do plano/i),
    ).toHaveTextContent('PREMIUM');

    // 2. Valida o botão de ação especificamente (Resolvendo o erro de duplicidade)
    const upgradeButton = screen.getByRole('button', {
      name: /Migrar para o PREMIUM/i,
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

    // 🎯 Busca robusta ignorando fragmentação de texto (Resolvendo seu erro)
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
        <UpgradeModal isOpen={false} onClose={() => {}} featureName="Teste" />
      </PlanProvider>,
    );

    expect(container.firstChild).toBeNull();
  });
});
