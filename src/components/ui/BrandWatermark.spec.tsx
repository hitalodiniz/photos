// src/components/ui/BrandWatermark.test.tsx
import { describe, test, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrandWatermark } from './BrandWatermark';
import { PlanProvider } from '@/core/context/PlanContext';

// At the top of BrandWatermark.test.tsx, after imports:
vi.mock('@/hooks/useSegment', () => ({
  useSegment: () => ({
    terms: {
      site_name: 'TestBrand',
    },
  }),
}));

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_SEGMENT', 'PHOTOGRAPHER');
});

const makeProfile = (planKey: string) => ({
  id: 'u1',
  full_name: 'Test',
  username: 'test',
  operating_cities: [],
  email: 'test@test.com',
  profile_picture_url: null,
  plan_key: planKey,
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
});

describe('BrandWatermark', () => {
  test('exibe marca em planos sem removeBranding (FREE/START/PLUS/PRO)', () => {
    ['FREE', 'START', 'PLUS', 'PRO'].forEach((planKey) => {
      const { container, unmount } = render(
        <PlanProvider profile={makeProfile(planKey) as any}>
          <BrandWatermark />
        </PlanProvider>,
      );
      expect(container.firstChild, planKey).not.toBeNull();
      unmount();
    });
  });

  test('oculta marca em PREMIUM (removeBranding = true)', () => {
    const { container } = render(
      <PlanProvider profile={makeProfile('PREMIUM') as any}>
        <BrandWatermark />
      </PlanProvider>,
    );
    expect(container.firstChild).toBeNull();
  });
});
