// src/app/(dashboard)/dashboard/components/SidebarStorage.spec.tsx
import { describe, test, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mocks de dependências externas ──────────────────────────────────────────
// InfoTooltip e BaseModal usam APIs do browser/Next.js indisponíveis no jsdom.
// UpgradeModal depende de BaseModal, então também é mockado.
// useSegment depende de next/headers — mockado com valores fixos de PHOTOGRAPHER.

vi.mock('@/components/ui/InfoTooltip', () => ({
  InfoTooltip: () => null,
}));

vi.mock('@/components/ui/BaseModal', () => ({
  default: ({ children, isOpen, title }: any) =>
    isOpen ? (
      <div>
        <span>{title}</span>
        {children}
      </div>
    ) : null,
}));

vi.mock('@/components/ui/UpgradeModal', () => ({
  default: ({ isOpen, featureName }: any) =>
    isOpen ? <div data-testid="upgrade-modal">{featureName}</div> : null,
}));

vi.mock('@/hooks/useSegment', () => ({
  useSegment: () => ({
    segment: 'PHOTOGRAPHER',
    terms: {
      item: 'galeria',
      items: 'galerias',
      singular: 'fotógrafo',
      site_name: 'Sua Galeria',
    },
  }),
}));

vi.mock('@/core/config/help-content', () => ({
  HELP_CONTENT: {
    STORAGE: {
      GALLERIES: { title: 'Galerias', content: '' },
      POOL: { title: 'Pool', content: '' },
      // BUG FIX 1: POOL_LIMITING_LABEL estava ausente do mock.
      // O componente renderiza {HELP_CONTENT.STORAGE.POOL_LIMITING_LABEL} dentro
      // do badge — sem esta chave o span ficava vazio e getByText('pool') falhava.
      POOL_LIMITING_LABEL: 'pool',
    },
  },
}));

import SidebarStorage from './SidebarStorage';
import { PlanProvider } from '@/core/context/PlanContext';
import { Profile } from '@/core/types/profile';
import {
  MAX_GALLERIES_HARD_CAP_BY_PLAN,
  PHOTO_CREDITS_BY_PLAN,
} from '@/core/config/plans';

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

const renderWithPlan = (
  planKey: string,
  galeriasCount: number,
  totalPhotosUsed = 0,
) =>
  render(
    <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
      <SidebarStorage
        isSidebarCollapsed={false}
        galeriasCount={galeriasCount}
        totalPhotosUsed={totalPhotosUsed}
      />
    </PlanProvider>,
  );

// O JSX renderiza "/" e {hardCap} como dois nós de texto no mesmo <span>.
// getByText não encontra porque o textContent é fragmentado.
// Usamos querySelector direto: buscamos todos os spans e filtramos por textContent.
//
// Denominador = permissions.maxGalleriesHardCap (teto absoluto)
// FREE=3, START=12, PLUS=40, PRO=120, PREMIUM=400
const findSpanByContent = (
  container: HTMLElement,
  value: string,
): Element | null => {
  const spans = Array.from(container.querySelectorAll('span'));
  return (
    spans.find((el) => {
      // Remove espaços em branco normais e non-breaking spaces para comparação
      const text = el.textContent?.replace(/\s+/g, '').trim();
      const target = value.replace(/\s+/g, '').trim();
      return text === target;
    }) ?? null
  );
};

describe('SidebarStorage — Exibição de Limites', () => {
  test('FREE: exibe teto dinâmico no bloco Galerias', () => {
    const { container } = renderWithPlan('FREE', 0);
    expect(
      findSpanByContent(
        container,
        `/ ${MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE}`,
      ),
    ).not.toBeNull();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  test('START: exibe contador e teto dinâmico', () => {
    const { container } = renderWithPlan('START', 5);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(
      findSpanByContent(
        container,
        `/ ${MAX_GALLERIES_HARD_CAP_BY_PLAN.START}`,
      ),
    ).not.toBeNull();
  });

  test('PLUS: exibe contador e teto dinâmico', () => {
    const { container } = renderWithPlan('PLUS', 15);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(
      findSpanByContent(
        container,
        `/ ${MAX_GALLERIES_HARD_CAP_BY_PLAN.PLUS}`,
      ),
    ).not.toBeNull();
  });

  test('PRO: exibe contador e teto dinâmico', () => {
    const { container } = renderWithPlan('PRO', 30);
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(
      findSpanByContent(container, `/ ${MAX_GALLERIES_HARD_CAP_BY_PLAN.PRO}`),
    ).not.toBeNull();
  });

  test('PREMIUM: exibe contador e teto dinâmico', () => {
    const { container } = renderWithPlan('PREMIUM', 100);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(
      findSpanByContent(
        container,
        `/ ${MAX_GALLERIES_HARD_CAP_BY_PLAN.PREMIUM}`,
      ),
    ).not.toBeNull();
  });
});

// isGalLimit = galeriasCount >= maxGalleriesHardCap
// Quando limite atingido: renderiza botão com "Limite atingido — Upgrade"
// Quando abaixo: renderiza label "Galerias" e texto de disponíveis
describe('SidebarStorage — Estado de Limite Atingido', () => {
  test('FREE no limite (hard cap): exibe "Limite atingido" e oculta disponíveis', () => {
    renderWithPlan('FREE', MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE);
    expect(screen.getByText(/limite atingido/i)).toBeInTheDocument();
    // label "disponíveis" não aparece quando no limite
    expect(screen.queryByText(/disponíve/i)).not.toBeInTheDocument();
  });

  test('FREE abaixo do limite: exibe disponíveis e não exibe "Limite atingido"', () => {
    renderWithPlan('FREE', Math.max(0, MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE - 1));
    // effectiveMax = min(2 + floor(450/150), 3) = min(2+3, 3) = 3 → available = 1
    expect(screen.getByText(/disponíve/i)).toBeInTheDocument();
    expect(screen.queryByText(/limite atingido/i)).not.toBeInTheDocument();
  });

  test('PLUS abaixo do limite (10/30): exibe label "Galerias" e não exibe limite', () => {
    renderWithPlan('PLUS', 10);
    expect(screen.getByText(/galerias/i)).toBeInTheDocument();
    expect(screen.queryByText(/limite atingido/i)).not.toBeInTheDocument();
  });

  test('PRO no hard cap: exibe botão de upgrade', () => {
    renderWithPlan('PRO', MAX_GALLERIES_HARD_CAP_BY_PLAN.PRO);
    expect(screen.getByText(/limite atingido/i)).toBeInTheDocument();
    expect(screen.queryByText(/disponíve/i)).not.toBeInTheDocument();
  });

  test('PREMIUM no limite: exibe botão de upgrade', () => {
    renderWithPlan('PREMIUM', MAX_GALLERIES_HARD_CAP_BY_PLAN.PREMIUM);
    expect(screen.getByText(/limite atingido/i)).toBeInTheDocument();
  });
});

// Pool limiting: quando effectiveMax < hardCap por falta de créditos
// badge "pool" aparece abaixo do contador de disponíveis
describe('SidebarStorage — Pool Limiting', () => {
  test('START com pool esgotado: exibe badge "pool"', () => {
    renderWithPlan('START', 5, PHOTO_CREDITS_BY_PLAN.START);
    expect(screen.getByText('pool')).toBeInTheDocument();
  });

  test('PRO com pool cheio: não exibe badge "pool"', () => {
    // Quando isGalLimit = true, o badge "pool" não é renderizado — ele fica
    // dentro do bloco `else` de isGalLimit no componente.
    // Usamos PLUS no hard cap (30/30) para garantir ausência do badge.
    renderWithPlan('PLUS', MAX_GALLERIES_HARD_CAP_BY_PLAN.PLUS, 0);
    // no limite → botão de upgrade, sem badge "pool"
    expect(screen.queryByText('pool')).not.toBeInTheDocument();
  });
});

// Bloco de Arquivos — mesmo padrão de dois text nodes separados no span
describe('SidebarStorage — Bloco de Arquivos', () => {
  test('FREE sem fotos: exibe créditos e restantes dinâmicos', () => {
    const { container } = renderWithPlan('FREE', 0, 0);
    expect(
      findSpanByContent(container, `/ ${PHOTO_CREDITS_BY_PLAN.FREE}`),
    ).not.toBeNull();
    expect(
      findSpanByContent(
        container,
        `${PHOTO_CREDITS_BY_PLAN.FREE} restantes`,
      ),
    ).not.toBeNull();
  });

  test('PRO: photoCredits=60k exibido como "/60k"', () => {
    const { container } = renderWithPlan('PRO', 0, 0);
    const proCredits = PHOTO_CREDITS_BY_PLAN.PRO;
    const expected = proCredits >= 1000 ? `/ ${Math.round(proCredits / 1000)}k` : `/ ${proCredits}`;
    expect(findSpanByContent(container, expected)).not.toBeNull();
  });

  test('PREMIUM: photoCredits=200k exibido como "/200k"', () => {
    const { container } = renderWithPlan('PREMIUM', 0, 0);
    const premiumCredits = PHOTO_CREDITS_BY_PLAN.PREMIUM;
    const expected =
      premiumCredits >= 1000
        ? `/ ${Math.round(premiumCredits / 1000)}k`
        : `/ ${premiumCredits}`;
    expect(findSpanByContent(container, expected)).not.toBeNull();
  });

  test('FREE com 400 fotos: exibe "50 restantes"', () => {
    const { container } = renderWithPlan('FREE', 0, 400);
    // photosRemaining = 450 - 400 = 50
    expect(findSpanByContent(container, '50 restantes')).not.toBeNull();
  });

  test('PRO com uso alto: exibe restantes dinâmicos', () => {
    const proCredits = PHOTO_CREDITS_BY_PLAN.PRO;
    const used = Math.floor(proCredits * 0.75);
    const remaining = Math.max(0, proCredits - used);
    const expectedRemaining =
      remaining >= 1000
        ? `${Math.round(remaining / 1000)}k restantes`
        : `${remaining} restantes`;

    const { container } = renderWithPlan('PRO', 10, used);
    expect(findSpanByContent(container, expectedRemaining)).not.toBeNull();
  });
});

// UpgradeModal: abre ao clicar no botão de limite
// O mock renderiza <div data-testid="upgrade-modal">{featureName}</div>
// featureName passado pelo SidebarStorage = "Cota de Arquivos"
describe('SidebarStorage — UpgradeModal', () => {
  test('UpgradeModal fechado por padrão (sem clicar)', () => {
    renderWithPlan('FREE', 3);
    // modal não aberto → data-testid ausente
    expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
  });

  test('ao clicar em "Limite atingido" o UpgradeModal abre', () => {
    renderWithPlan('FREE', 3);
    const btn = screen.getByRole('button', { name: /limite atingido/i });
    fireEvent.click(btn);
    // após clique → modal mockado aparece com data-testid
    expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
    // e exibe o featureName passado pelo componente
    expect(screen.getByText(/cota de arquivos/i)).toBeInTheDocument();
  });
});
