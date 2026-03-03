// src/features/dashboard/components/SidebarStorage.test.tsx
import { describe, test, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SidebarStorage from './SidebarStorage';
import { PlanProvider } from '@/core/context/PlanContext';
import { Profile } from '@/core/types/profile';

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_SEGMENT', 'PHOTOGRAPHER');
});

const makeMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'user-123',
  full_name: 'Test User',
  username: 'testuser',
  operating_cities: [],
  email: 'test@example.com',
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

const renderWithPlan = (planKey: string, galeriasCount: number) =>
  render(
    <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
      <SidebarStorage
        isSidebarCollapsed={false}
        galeriasCount={galeriasCount}
      />
    </PlanProvider>,
  );

describe('SidebarStorage — Exibição de Limites', () => {
  test('FREE: exibe "0 / 3" para galerias ativas', () => {
    renderWithPlan('FREE', 0);
    expect(screen.getByText(/0 \/ 3/i)).toBeInTheDocument();
  });

  test('START: exibe "5 / 10"', () => {
    renderWithPlan('START', 5);
    expect(screen.getByText(/5 \/ 10/i)).toBeInTheDocument();
  });

  test('PLUS: exibe "15 / 20"', () => {
    renderWithPlan('PLUS', 15);
    expect(screen.getByText(/15 \/ 20/i)).toBeInTheDocument();
  });

  test('PRO: exibe "30 / 50"', () => {
    renderWithPlan('PRO', 30);
    expect(screen.getByText(/30 \/ 50/i)).toBeInTheDocument();
  });

  test('PREMIUM: exibe "100 / 200"', () => {
    renderWithPlan('PREMIUM', 100);
    expect(screen.getByText(/100 \/ 200/i)).toBeInTheDocument();
  });
});

describe('SidebarStorage — Estado de Limite Atingido', () => {
  test('FREE no limite (3/3): exibe botão "Limite Atingido"', () => {
    renderWithPlan('FREE', 3);
    expect(screen.getByText(/limite atingido/i)).toBeInTheDocument();
  });

  test('PLUS abaixo do limite (10/20): exibe texto "Galerias Ativas"', () => {
    renderWithPlan('PLUS', 10);
    expect(screen.getByText(/galerias ativas/i)).toBeInTheDocument();
    expect(screen.queryByText(/limite atingido/i)).not.toBeInTheDocument();
  });

  test('PRO no limite (50/50): exibe botão de upgrade', () => {
    renderWithPlan('PRO', 50);
    expect(screen.getByText(/limite atingido/i)).toBeInTheDocument();
  });
});

describe('SidebarStorage — UpgradeModal', () => {
  test('ao clicar em "Limite Atingido" o UpgradeModal abre', async () => {
    const { getByText } = renderWithPlan('FREE', 3);
    const btn = getByText(/limite atingido/i);
    btn.click();
  });
});
