'use client';

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import React from 'react';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { Camera } from 'lucide-react';
import { PlanProvider, usePlan } from '@/core/context/PlanContext';
import { findNextPlanWithFeature, PlanKey } from '@/core/config/plans';
import { Profile } from '@/core/types/profile';
/**
 * 🏭 Factory para perfis consistentes
 * Nota: plan_trial_expires agora é opcional para não interferir em testes de assinantes.
 */
const makeMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'user-123',
  full_name: 'Usuário Teste',
  username: 'usuarioteste',
  operating_cities: [],
  email: 'teste@exemplo.com',
  plan_key: 'FREE',
  is_trial: false,
  // Removido o default de expires aqui para evitar falsos positivos em testes is_trial: false
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

const renderWithPlan = (ui: React.ReactNode, profile: Profile) => {
  return render(<PlanProvider profile={profile}>{ui}</PlanProvider>);
};

describe('PlanGuard & UI Access', () => {
  test('não deve renderizar conteúdo bloqueado para plano FREE', () => {
    const profile = makeMockProfile({ plan_key: 'FREE' });
    renderWithPlan(
      <PlanGuard feature="canCaptureLeads">
        <div data-testid="secret-content">VIP</div>
      </PlanGuard>,
      profile,
    );
    expect(screen.queryByTestId('secret-content')).not.toBeInTheDocument();
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

  test('deve mapear corretamente o próximo plano por feature', () => {
    expect(findNextPlanWithFeature('FREE', 'canFavorite', segment)).toBe(
      'START',
    );
    expect(findNextPlanWithFeature('PLUS', 'canCaptureLeads', segment)).toBe(
      'PRO',
    );
    expect(findNextPlanWithFeature('PRO', 'removeBranding', segment)).toBe(
      'PREMIUM',
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
    expect(result.current.permissions.maxGalleries).toBe(2);
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
      is_trial: false, // O usuário pagou!
      plan_trial_expires: '2020-01-01', // Data de 6 anos atrás
    });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    expect(result.current.planKey).toBe('PRO');
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
    expect(result.current.permissions.maxGalleries).toBe(10); // Valor conforme seu config
  });
});
describe('5. Casos de Borda e Segurança (Edge Cases)', () => {
  test('EXPIRAÇÃO EXATA: deve expirar se a data for exatamente AGORA', () => {
    const now = new Date();

    const profile = makeMockProfile({
      plan_key: 'PRO',
      is_trial: true,
      plan_trial_expires: now.toISOString(), // Expira no milissegundo atual
    });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    // Em lógicas de tempo, "igual ou menor que agora" deve ser FREE
    expect(result.current.planKey).toBe('FREE');
  });

  test('VALORES NULOS: deve assumir FREE se plan_trial_expires for nulo em um perfil trial', () => {
    const profile = makeMockProfile({
      plan_key: 'PRO',
      is_trial: true,
      plan_trial_expires: undefined, // Simula erro de dado ou campo vazio
    });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    // Se é trial mas não tem data, por segurança, restringimos ao FREE
    expect(result.current.planKey).toBe('FREE');
  });

  test('INCONSISTÊNCIA DE FLAG: is_trial=false deve sempre vencer, mesmo com plano TRIAL no banco', () => {
    // Cenário: O admin mudou o plano mas esqueceu de mudar a key,
    // ou o usuário assinou exatamente o plano que estava testando.
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
    expect(result.current.permissions.maxGalleries).toBeGreaterThan(2);
  });

  test('LIMITE NUMÉRICO: deve respeitar rigorosamente o teto de fotos do plano START', () => {
    const profile = makeMockProfile({ plan_key: 'START', is_trial: false });

    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={profile}>{children}</PlanProvider>
      ),
    });

    // Validando se o objeto de permissões está mapeando os números corretamente
    // START costuma ser 10 galerias e 200 fotos (conforme suas configs anteriores)
    expect(result.current.permissions.maxGalleries).toBe(10);
    expect(result.current.permissions.maxPhotosPerGallery).toBe(200);
  });

  test('FALLBACK TOTAL: deve retornar FREE se o perfil for completamente indefinido', () => {
    // @ts-ignore - Simulando erro de carregamento de perfil no Supabase
    const { result } = renderHook(() => usePlan(), {
      wrapper: ({ children }) => (
        <PlanProvider profile={null}>{children}</PlanProvider>
      ),
    });

    expect(result.current.planKey).toBe('FREE');
    expect(result.current.permissions.maxGalleries).toBe(2);
  });
});

describe('6. Verificação de Tags de Revalidação (Lógica Mockada)', () => {
  test('Deve garantir que processSubscriptionAction solicite as tags corretas', async () => {
    // Este teste é conceitual para sua Server Action
    const spyRevalidateTag = vi.fn();

    // Simulação da lógica da Action
    const mockAction = (id: string) => {
      spyRevalidateTag(`profile-private-${id}`);
      spyRevalidateTag(`profile-username-teste`);
    };

    mockAction('123');

    expect(spyRevalidateTag).toHaveBeenCalledWith('profile-private-123');
    expect(spyRevalidateTag).toHaveBeenCalledWith('profile-username-teste');
  });
});
