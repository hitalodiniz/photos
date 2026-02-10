'use client';

import { describe, test, expect, vi, beforeEach, expect } from 'vitest';
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
  // src/components/ui/UpgradeModal.spec.tsx

  test('deve aplicar fallback para PREMIUM quando featureKey não for fornecido', () => {
    const profile = makeMockProfile({ plan_key: 'FREE' });

    render(
      <PlanProvider profile={profile}>
        <UpgradeModal
          isOpen={true}
          onClose={() => {}}
          featureName="Recurso Especial"
          scenarioType="feature" // Garantindo a prop obrigatória
        />
      </PlanProvider>,
    );

    // 🎯 ESTRATÉGIA QA: Buscar o texto de forma fragmentada, mas garantindo que estejam no mesmo contexto
    const explanatoryText = screen.getByText(
      /exclusivo para usuários do plano/i,
    );

    expect(explanatoryText).toBeInTheDocument();
    // Validamos se o "PREMIUM" (que está em negrito/outro span) está próximo
    expect(explanatoryText.parentElement?.textContent).toContain('PREMIUM');

    // 2. Valida o botão de ação (Target principal do clique)
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
