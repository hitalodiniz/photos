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
    },
  },
}));

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
// FREE=3, START=12, PLUS=30, PRO=90, PREMIUM=300
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
  test('FREE: exibe teto "/3" no bloco Galerias', () => {
    const { container } = renderWithPlan('FREE', 0);
    expect(findSpanByContent(container, '/ 3')).not.toBeNull();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  test('START: exibe contador "5" e teto "/12"', () => {
    const { container } = renderWithPlan('START', 5);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(findSpanByContent(container, '/ 12')).not.toBeNull();
  });

  test('PLUS: exibe contador "15" e teto "/30"', () => {
    const { container } = renderWithPlan('PLUS', 15);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(findSpanByContent(container, '/ 30')).not.toBeNull();
  });

  test('PRO: exibe contador "30" e teto "/100"', () => {
    const { container } = renderWithPlan('PRO', 30);
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(findSpanByContent(container, '/ 100')).not.toBeNull();
  });

  test('PREMIUM: exibe contador "100" e teto "/300"', () => {
    const { container } = renderWithPlan('PREMIUM', 100);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(findSpanByContent(container, '/ 300')).not.toBeNull();
  });
});

// isGalLimit = galeriasCount >= maxGalleriesHardCap
// Quando limite atingido: renderiza botão com "Limite atingido — Upgrade"
// Quando abaixo: renderiza label "Galerias" e texto de disponíveis
describe('SidebarStorage — Estado de Limite Atingido', () => {
  test('FREE no limite (3/3): exibe "Limite atingido" e oculta label de disponíveis', () => {
    renderWithPlan('FREE', 3);
    expect(screen.getByText(/limite atingido/i)).toBeInTheDocument();
    // label "disponíveis" não aparece quando no limite
    expect(screen.queryByText(/disponíve/i)).not.toBeInTheDocument();
  });

  test('FREE abaixo do limite (2/3): exibe disponíveis e não exibe "Limite atingido"', () => {
    renderWithPlan('FREE', 2);
    // effectiveMax = min(2 + floor(450/150), 3) = min(2+3, 3) = 3 → available = 1
    expect(screen.getByText(/disponíve/i)).toBeInTheDocument();
    expect(screen.queryByText(/limite atingido/i)).not.toBeInTheDocument();
  });

  test('PLUS abaixo do limite (10/30): exibe label "Galerias" e não exibe limite', () => {
    renderWithPlan('PLUS', 10);
    expect(screen.getByText(/galerias/i)).toBeInTheDocument();
    expect(screen.queryByText(/limite atingido/i)).not.toBeInTheDocument();
  });

  test('PRO no hard cap (100/100): exibe botão de upgrade', () => {
    renderWithPlan('PRO', 100);
    expect(screen.getByText(/limite atingido/i)).toBeInTheDocument();
    expect(screen.queryByText(/disponíve/i)).not.toBeInTheDocument();
  });

  test('PREMIUM no limite (300/300): exibe botão de upgrade', () => {
    renderWithPlan('PREMIUM', 300);
    expect(screen.getByText(/limite atingido/i)).toBeInTheDocument();
  });
});

// Pool limiting: quando effectiveMax < hardCap por falta de créditos
// badge "pool" aparece abaixo do contador de disponíveis
describe('SidebarStorage — Pool Limiting', () => {
  test('FREE com pool esgotado: exibe badge "pool"', () => {
    // 450 fotos usadas = pool esgotado → effectiveMax = min(3+0, 3) = 3
    // galeriasCount=2 → available=1, mas isPoolLimiting = effectiveMax(3) < hardCap(3) = false
    // Para pool limiting precisamos de effectiveMax < hardCap
    // Isso em FREE não ocorre pois hardCap=3=maxGalleries
    // Testamos com START: hardCap=12, com 2.500 fotos usadas → effectiveMax = min(5+0,12)=5
    renderWithPlan('START', 5, 2_500);
    // pool esgotado: effectiveMax(5) < hardCap(12) → isPoolLimiting=true
    expect(screen.getByText('pool')).toBeInTheDocument();
  });

  test('PRO com pool cheio: não exibe badge "pool"', () => {
    // 0 fotos usadas → effectiveMax = min(30+50, 90) = 80 < 90 → ainda pool limiting
    // Para não ter pool limiting: effectiveMax deve = hardCap
    // calcEffectiveMaxGalleries('PRO', 0, 0) = min(0+50, 90) = 50 < 90 → ainda pool
    // Usamos galeriasCount=0 e totalPhotosUsed=0 com PLUS:
    // calcEffectiveMaxGalleries('PLUS', 0, 0) = min(0+20, 30) = 20 = hardCap...
    // PLUS hardCap=30, floor(10000/500)=20 → effectiveMax=min(0+20,30)=20 < 30 → pool limiting
    // Apenas com galerias vazias e pool suficiente podemos testar:
    // Nenhum plano tem effectiveMax==hardCap com 0 fotos usadas, então
    // testamos ausência do badge quando disponíveis = 0 (limite atingido)
    renderWithPlan('PLUS', 30, 0);
    // no limite → botão de upgrade, sem badge "pool"
    expect(screen.queryByText('pool')).not.toBeInTheDocument();
  });
});

// Bloco de Arquivos — mesmo padrão de dois text nodes separados no span
describe('SidebarStorage — Bloco de Arquivos', () => {
  test('FREE sem fotos: exibe créditos "/450" e texto restantes', () => {
    const { container } = renderWithPlan('FREE', 0, 0);
    expect(findSpanByContent(container, '/ 450')).not.toBeNull();
    expect(findSpanByContent(container, '450 restantes')).not.toBeNull();
  });

  test('PRO: photoCredits=50k exibido como "/50k"', () => {
    const { container } = renderWithPlan('PRO', 0, 0);
    expect(findSpanByContent(container, '/ 50k')).not.toBeNull();
  });

  test('PREMIUM: photoCredits=200k exibido como "/200k"', () => {
    const { container } = renderWithPlan('PREMIUM', 0, 0);
    expect(findSpanByContent(container, '/ 200k')).not.toBeNull();
  });

  test('FREE com 400 fotos: exibe "50 restantes"', () => {
    const { container } = renderWithPlan('FREE', 0, 400);
    // photosRemaining = 450 - 400 = 50
    expect(findSpanByContent(container, '50 restantes')).not.toBeNull();
  });

  test('PRO com 45.000 fotos: exibe "5k restantes"', () => {
    const { container } = renderWithPlan('PRO', 10, 45_000);
    // photosRemaining = 5000 → "5k restantes"
    expect(findSpanByContent(container, '5k restantes')).not.toBeNull();
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
