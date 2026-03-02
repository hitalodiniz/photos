// src/components/ui/TrialBanner.test.tsx
import {
  describe,
  test,
  expect,
  vi,
  beforeAll,
  afterEach,
  beforeEach,
} from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import TrialBanner from './TrialBanner';
import { PlanProvider } from '@/core/context/PlanContext';

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_SEGMENT', 'PHOTOGRAPHER');
});

const makeProfile = (overrides: any = {}) => ({
  id: 'u1',
  full_name: 'Test',
  username: 'test',
  operating_cities: [],
  email: 'test@test.com',
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
      required_guest_fields: [],
      data_treatment_purpose: '',
      background_color: '#FFF',
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

describe('TrialBanner', () => {
  beforeEach(() => {
    // 1. IMPORTANTE: Use o modo 'modern' para garantir compatibilidade com Date
    vi.useFakeTimers({ toFake: ['Date'] });
    const mockDate = new Date('2026-03-01T12:00:00Z');
    vi.setSystemTime(mockDate);

    document.documentElement.setAttribute('data-segment', 'PHOTOGRAPHER');
  });

  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.removeAttribute('data-segment');
  });

  test('não renderiza para plano FREE (não trial)', () => {
    const { container } = render(
      <PlanProvider
        profile={makeProfile({ plan_key: 'FREE', is_trial: false })}
      >
        <TrialBanner />
      </PlanProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  test('não renderiza para plano PREMIUM (não trial)', () => {
    const { container } = render(
      <PlanProvider
        profile={makeProfile({ plan_key: 'PREMIUM', is_trial: false })}
      >
        <TrialBanner />
      </PlanProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  test('não renderiza para trial expirado (rebaixado para FREE)', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const { container } = render(
      <PlanProvider
        profile={makeProfile({
          plan_key: 'PRO',
          is_trial: true,
          plan_trial_expires: pastDate,
        })}
      >
        <TrialBanner />
      </PlanProvider>,
    );
    // rebaixado para FREE → planKey !== PRO → não renderiza
    expect(container.firstChild).toBeNull();
  });

  test('renderiza para PRO trial ativo com dias restantes', () => {
    const expirationDate = '2026-03-06T12:00:00.000Z';

    render(
      <PlanProvider
        planKey="PRO"
        profile={makeProfile({
          plan_key: 'PRO', // GARANTA QUE ISSO NÃO É 'FREE'
          is_trial: true,
          plan_trial_expires: expirationDate,
        })}
      >
        <TrialBanner />
      </PlanProvider>,
    );

    // Use uma query mais simples primeiro para ver se algo aparece
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();

    // O Matcher com normalize para lidar com spans e quebras de linha
    expect(
      screen.getByText((content, element) => {
        const hasText = (node: Element) =>
          node.textContent === 'Seu Período PRO Expira em 5 dias';
        const elementHasText = hasText(element as Element);
        const childrenDontHaveText = Array.from(element?.children || []).every(
          (child) => !hasText(child),
        );
        return elementHasText && childrenDontHaveText;
      }),
    ).toBeInTheDocument();
  });

  test('botão "Garantir Plano" abre /dashboard/planos', () => {
    const windowSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const expirationDate = '2026-03-10T12:00:00Z';

    render(
      <PlanProvider
        planKey="PRO"
        profile={makeProfile({
          plan_key: 'PRO',
          is_trial: true,
          plan_trial_expires: expirationDate,
        })}
      >
        <TrialBanner />
      </PlanProvider>,
    );

    const button = screen.getByRole('button', { name: /garantir plano/i });
    fireEvent.click(button);

    expect(windowSpy).toHaveBeenCalledWith('/dashboard/planos', '_blank');
  });
});
