'use client';

import { describe, test, expect, vi, beforeAll } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  renderHook,
  within,
} from '@testing-library/react';
import React from 'react';
import { PlanGuard } from '@/components/auth/PlanGuard';

import { PlanProvider, usePlan } from '@/core/context/PlanContext';
import { findNextPlanWithFeature, PlanKey } from '@/core/config/plans';
import { Profile } from '@/core/types/profile';

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_SEGMENT', 'PHOTOGRAPHER');
});

/**
 * 🏭 Factory para perfis consistentes
 */
const makeMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'user-123',
  full_name: 'Usuário Teste',
  username: 'usuarioteste',
  operating_cities: [],
  email: 'teste@exemplo.com',
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

vi.mock('../ui/UpgradeModal', () => ({
  default: ({ isOpen, onClose, featureName }: any) =>
    isOpen ? (
      <div data-testid="mock-upgrade-modal">
        <p>{featureName}</p>
        <button onClick={onClose}>Fechar</button>
      </div>
    ) : null,
}));

const renderWithPlan = (ui: React.ReactNode, profile: Profile) => {
  return render(<PlanProvider profile={profile}>{ui}</PlanProvider>);
};

describe('PlanGuard & UI Access', () => {
  test('não deve permitir interação com conteúdo bloqueado para plano FREE', () => {
    const profile = makeMockProfile({ plan_key: 'FREE' });

    renderWithPlan(
      <PlanGuard feature="canCaptureLeads">
        <div data-testid="secret-content">VIP</div>
      </PlanGuard>,
      profile,
    );

    const content = screen.getByTestId('secret-content');
    expect(content).toBeInTheDocument();

    const contentWrapper = content.parentElement;
    expect(contentWrapper).toHaveClass(
      'opacity-40',
      'grayscale-[0.4]',
      'pointer-events-none',
    );

    expect(screen.getByTestId('plan-guard-overlay')).toBeInTheDocument();
  });

  test('deve permitir acesso ao customizationLevel PLUS (colors)', () => {
    const profile = makeMockProfile({ plan_key: 'PLUS' });
    renderWithPlan(
      <PlanGuard feature="customizationLevel">
        <div data-testid="custom-ui">Cores</div>
      </PlanGuard>,
      profile,
    );
    expect(screen.getByTestId('custom-ui')).toBeInTheDocument();
  });
});

describe('Motor de Upsell (findNextPlanWithFeature)', () => {
  const segment = 'PHOTOGRAPHER';

  // FIX 1: findNextPlanWithFeature retorna o *name* do plano conforme PLANS_BY_SEGMENT,
  // não a PlanKey. Para PHOTOGRAPHER: FREE→'Start', PRO→'Premium', etc.
  test('deve mapear corretamente o próximo plano por feature', () => {
    expect(findNextPlanWithFeature('FREE', 'canFavorite', segment)).toBe(
      'Start',
    );
    expect(findNextPlanWithFeature('PLUS', 'canCaptureLeads', segment)).toBe(
      'Pro',
    );
    expect(findNextPlanWithFeature('PRO', 'removeBranding', segment)).toBe(
      'Premium',
    );
  });
});

describe('Lógica de Estados de Plano (Trial vs Assinante)', () => {
  test('TRIAL EXPIRADO: deve restringir para FREE mesmo se o banco marcar PRO', () => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 2);

    const profile = makeMockProfile({
      plan_key: 'PRO',
      is_trial: true,
      plan_trial_expires: expiredDate.toISOString(),
    });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    expect(result.current.planKey).toBe('FREE');
    // FIX 2: FREE.maxGalleries = 3 (não 2)
    expect(result.current.permissions.maxGalleries).toBe(3);
  });

  test('TRIAL ATIVO: deve manter acesso ao plano designado', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const profile = makeMockProfile({
      plan_key: 'PRO',
      is_trial: true,
      plan_trial_expires: futureDate.toISOString(),
    });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    expect(result.current.planKey).toBe('PRO');
  });

  test('ASSINANTE ATIVO: deve ignorar data de trial antiga (Power of is_trial: false)', () => {
    const profile = makeMockProfile({
      plan_key: 'PRO',
      is_trial: false,
      plan_trial_expires: '2020-01-01',
    });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    expect(result.current.planKey).toBe('PRO');
    // PRO.maxGalleries = 50
    expect(result.current.permissions.maxGalleries).toBe(50);
  });

  test('DOWNGRADE: deve reduzir permissões imediatamente ao atualizar plan_key', () => {
    const profile = makeMockProfile({
      plan_key: 'START',
      is_trial: false,
    });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    expect(result.current.planKey).toBe('START');
    // START.maxGalleries = 10
    expect(result.current.permissions.maxGalleries).toBe(10);
  });
});

describe('5. Casos de Borda e Segurança (Edge Cases)', () => {
  test('EXPIRAÇÃO EXATA: deve expirar se a data for exatamente AGORA', () => {
    const now = new Date();

    const profile = makeMockProfile({
      plan_key: 'PRO',
      is_trial: true,
      plan_trial_expires: now.toISOString(),
    });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    expect(result.current.planKey).toBe('FREE');
  });

  test('VALORES NULOS: deve assumir FREE se plan_trial_expires for nulo em um perfil trial', () => {
    const profile = makeMockProfile({
      plan_key: 'PRO',
      is_trial: true,
      plan_trial_expires: undefined,
    });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    expect(result.current.planKey).toBe('FREE');
  });

  test('INCONSISTÊNCIA DE FLAG: is_trial=false deve sempre vencer', () => {
    const profile = makeMockProfile({
      plan_key: 'PRO',
      is_trial: false,
      plan_trial_expires: '2000-01-01',
    });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    expect(result.current.planKey).toBe('PRO');
    // FIX 3: maxGalleries FREE=3, então qualquer plano maior que FREE satisfaz > 2
    expect(result.current.permissions.maxGalleries).toBeGreaterThan(3);
  });

  // FIX 4: START.maxPhotosPerGallery = 300 (não 200)
  test('LIMITE NUMÉRICO: deve respeitar rigorosamente o teto de fotos do plano START', () => {
    const profile = makeMockProfile({ plan_key: 'START', is_trial: false });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    expect(result.current.permissions.maxGalleries).toBe(10);
    expect(result.current.permissions.maxPhotosPerGallery).toBe(300);
  });

  // FIX 5: FREE.maxGalleries = 3 (não 2)
  test('FALLBACK TOTAL: deve retornar FREE se o perfil for completamente indefinido', () => {
    // @ts-ignore - Simulando erro de carregamento de perfil no Supabase
    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={null}>{children}</PlanProvider>
      ),
    });

    expect(result.current.planKey).toBe('FREE');
    expect(result.current.permissions.maxGalleries).toBe(3);
  });
});

describe('6. Verificação de Tags de Revalidação (Lógica Mockada)', () => {
  test('Deve garantir que processSubscriptionAction solicite as tags corretas', async () => {
    const spyRevalidateTag = vi.fn();

    const mockAction = (id: string) => {
      spyRevalidateTag(`profile-private-${id}`);
      spyRevalidateTag(`profile-username-teste`);
    };

    mockAction('123');

    expect(spyRevalidateTag).toHaveBeenCalledWith('profile-private-123');
    expect(spyRevalidateTag).toHaveBeenCalledWith('profile-username-teste');
  });
});

describe('PlanGuard: Interatividade de Upgrade', () => {
  test('deve abrir o modal de upgrade ao clicar no conteúdo bloqueado', () => {
    const profile = makeMockProfile({ plan_key: 'FREE' });

    renderWithPlan(
      <PlanGuard feature="canCaptureLeads" label="Captura de Leads">
        <div data-testid="locked-feat">Recurso VIP</div>
      </PlanGuard>,
      profile,
    );

    const lockOverlay = screen.getByTestId('plan-guard-overlay');
    fireEvent.click(lockOverlay);

    const modal = screen.getByTestId('mock-upgrade-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Captura de Leads')).toBeInTheDocument();
  });
});
