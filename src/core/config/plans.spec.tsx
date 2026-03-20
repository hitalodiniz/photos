import { describe, test, expect, beforeAll, vi } from 'vitest';
import {
  COMMON_FEATURES,
  PERMISSIONS_BY_PLAN,
  PlanPermissions,
  calcEffectiveMaxGalleries,
  getBaseGalleriesFromPool,
  RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN,
  PHOTO_CREDITS_BY_PLAN,
  MAX_GALLERIES_HARD_CAP_BY_PLAN,
  MAX_PHOTOS_PER_GALLERY_BY_PLAN,
} from './plans';

import { render } from '@testing-library/react';
import React from 'react';
import { PlanProvider, usePlan } from '@/core/context/PlanContext';
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

const PlanConsumer = ({ onPlan }: { onPlan: (plan: any) => void }) => {
  const plan = usePlan();
  React.useEffect(() => {
    onPlan(plan);
  });
  return <div data-testid="consumer" />;
};

const planOrder = ['FREE', 'START', 'PLUS', 'PRO', 'PREMIUM'] as const;
type PlanKey = (typeof planOrder)[number];

// =============================================================================
describe('Validação de Permissões por Grupo', () => {
  describe('Grupo: Gestão', () => {
    test('maxGalleries deve seguir progressão por plano', () => {
      const values = planOrder.map((p) => PERMISSIONS_BY_PLAN[p].maxGalleries);
      expect(values).toEqual(planOrder.map((p) => getBaseGalleriesFromPool(p)));
    });

    test('maxGalleriesHardCap deve seguir source of truth', () => {
      const values = planOrder.map(
        (p) => PERMISSIONS_BY_PLAN[p].maxGalleriesHardCap,
      );
      expect(values).toEqual(
        planOrder.map((p) => MAX_GALLERIES_HARD_CAP_BY_PLAN[p]),
      );
    });

    test('teamMembers deve permitir colaboradores apenas a partir do PLUS', () => {
      expect(PERMISSIONS_BY_PLAN.FREE.teamMembers).toBe(0);
      expect(PERMISSIONS_BY_PLAN.START.teamMembers).toBe(0);
      expect(PERMISSIONS_BY_PLAN.PLUS.teamMembers).toBe(2);
      expect(PERMISSIONS_BY_PLAN.PREMIUM.teamMembers).toBe(99);
    });
  });

  describe('Grupo: Divulgação do Perfil', () => {
    test('profileLevel deve evoluir em sofisticação', () => {
      expect(PERMISSIONS_BY_PLAN.FREE.profileLevel).toBe('basic');
      // FIX: PRO=seo (não 'advanced'), PLUS=advanced
      expect(PERMISSIONS_BY_PLAN.PLUS.profileLevel).toBe('advanced');
      expect(PERMISSIONS_BY_PLAN.PRO.profileLevel).toBe('seo');
      expect(PERMISSIONS_BY_PLAN.PREMIUM.profileLevel).toBe('seo');
    });

    test('removeBranding (White Label) deve ser EXCLUSIVO do PREMIUM', () => {
      const plansWithWhiteLabel = planOrder.filter(
        (p) => PERMISSIONS_BY_PLAN[p].removeBranding,
      );
      expect(plansWithWhiteLabel).toEqual(['PREMIUM']);
    });
  });

  describe('Grupo: Cadastro de Visitantes (Leads)', () => {
    test('canCaptureLeads e canExportLeads devem ativar apenas no PRO e PREMIUM', () => {
      const leadsPlans = planOrder.filter(
        (p) => PERMISSIONS_BY_PLAN[p].canCaptureLeads,
      );
      expect(leadsPlans).toEqual(['PRO', 'PREMIUM']);
    });
  });

  describe('Grupo: Galeria & Experiência', () => {
    test('maxGridColumns deve permitir expansão visual', () => {
      expect(PERMISSIONS_BY_PLAN.FREE.maxGridColumns).toBe(3);
      expect(PERMISSIONS_BY_PLAN.PREMIUM.maxGridColumns).toBe(8);
    });

    test('canFavorite deve estar disponível do START em diante', () => {
      expect(PERMISSIONS_BY_PLAN.FREE.canFavorite).toBe(false);
      expect(PERMISSIONS_BY_PLAN.START.canFavorite).toBe(true);
    });

    test('tagSelectionMode deve evoluir para automação no PREMIUM', () => {
      expect(PERMISSIONS_BY_PLAN.FREE.tagSelectionMode).toBe('manual');
      expect(PERMISSIONS_BY_PLAN.PREMIUM.tagSelectionMode).toBe('drive');
    });
  });

  describe('Grupo: Segurança & Automação', () => {
    test('privacyLevel deve permitir password no PRO e PREMIUM', () => {
      expect(PERMISSIONS_BY_PLAN.PRO.privacyLevel).toBe('password');
      expect(PERMISSIONS_BY_PLAN.PREMIUM.privacyLevel).toBe('password');
    });

    test('customizationLevel deve permitir cores no PLUS e full no PREMIUM', () => {
      expect(PERMISSIONS_BY_PLAN.PLUS.customizationLevel).toBe(true);
      expect(PERMISSIONS_BY_PLAN.PREMIUM.customizationLevel).toBe(true);
    });
  });
});

// =============================================================================
describe('Consistência com UI (COMMON_FEATURES)', () => {
  test('Cada entrada em COMMON_FEATURES com "key" deve existir na PlanPermissions', () => {
    const technicalKeys = Object.keys(PERMISSIONS_BY_PLAN.FREE);
    const uiKeys = COMMON_FEATURES.filter((f) => f.key).map((f) => f.key);
    uiKeys.forEach((key) => {
      expect(technicalKeys).toContain(key);
    });
  });
});

// =============================================================================
describe('Integridade Total do Sistema de Permissões', () => {
  const allPermissionKeys: (keyof PlanPermissions)[] = [
    'photoCredits',
    'maxGalleries',
    'maxGalleriesHardCap',
    'maxPhotosPerGallery',
    'recommendedPhotosPerGallery',
    'teamMembers',
    'profileLevel',
    'profileCarouselLimit',
    'profileListLimit',
    'removeBranding',
    'canCaptureLeads',
    'canAccessNotifyEvents',
    'canExportLeads',
    'canCustomWhatsApp',
    'socialDisplayLevel',
    'canFavorite',
    'canDownloadFavoriteSelection',
    'canShowSlideshow',
    'maxGridColumns',
    'maxTags',
    'tagSelectionMode',
    'zipSizeLimit',
    // zipSizeLimitBytes é derivado no PlanContext, não declarado em PlanPermissions
    'maxExternalLinks',
    'canCustomLinkLabel',
    'privacyLevel',
    'expiresAt',
    'keepOriginalFilenames',
    'customizationLevel',
    'canCustomCategories',
    'canAccessStats',
  ];

  test('Todos os planos devem definir todas as permissões da interface', () => {
    planOrder.forEach((planKey) => {
      const planPermissions = PERMISSIONS_BY_PLAN[planKey];
      allPermissionKeys.forEach((key) => {
        expect(
          planPermissions,
          `Plano ${planKey} está faltando a chave: ${key}`,
        ).toHaveProperty(key);
        expect(
          planPermissions[key],
          `Chave ${key} no plano ${planKey} é undefined`,
        ).not.toBeUndefined();
      });
    });
  });

  describe('Validação de Progressão Lógica (Anti-Degradação)', () => {
    const checkNumericProgress = (key: keyof PlanPermissions) => {
      for (let i = 1; i < planOrder.length; i++) {
        const prev = PERMISSIONS_BY_PLAN[planOrder[i - 1]][key];
        const curr = PERMISSIONS_BY_PLAN[planOrder[i]][key];
        const valPrev = prev === 'unlimited' ? Infinity : (prev as number);
        const valCurr = curr === 'unlimited' ? Infinity : (curr as number);
        expect(
          valCurr,
          `Regressão detectada em ${key}: ${planOrder[i]} < ${planOrder[i - 1]}`,
        ).toBeGreaterThanOrEqual(valPrev);
      }
    };

    test('Progressão de limites numéricos', () => {
      const numericKeys: (keyof PlanPermissions)[] = [
        'maxGalleries',
        'maxGalleriesHardCap',
        'recommendedPhotosPerGallery',
        'maxPhotosPerGallery',
        'teamMembers',
        'profileCarouselLimit',
        'maxGridColumns',
        'maxTags',
        'maxExternalLinks',
      ];
      numericKeys.forEach(checkNumericProgress);
    });

    test('Progressão de booleanos (uma vez ativo, permanece ativo)', () => {
      const booleanKeys: (keyof PlanPermissions)[] = [
        'removeBranding',
        'canCaptureLeads',
        'canExportLeads',
        'canFavorite',
        'canDownloadFavoriteSelection',
        'canShowSlideshow',
        'canCustomLinkLabel',
        'keepOriginalFilenames',
        'canCustomWhatsApp',
        'canCustomCategories',
        'canAccessStats',
        'canAccessNotifyEvents',
      ];

      booleanKeys.forEach((key) => {
        let hasBeenActivated = false;
        planOrder.forEach((plan) => {
          if (PERMISSIONS_BY_PLAN[plan][key] === true) hasBeenActivated = true;
          if (hasBeenActivated) {
            expect(
              PERMISSIONS_BY_PLAN[plan][key],
              `Recurso ${key} desativado no plano superior ${plan}`,
            ).toBe(true);
          }
        });
      });
    });
  });

  describe('Snapshots de Segurança (Cenários Críticos)', () => {
    test('FREE: deve ser rigorosamente limitado', () => {
      const p = PERMISSIONS_BY_PLAN.FREE;
      expect(p.maxGalleries).toBe(3);
      expect(p.maxGalleriesHardCap).toBe(MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE);
      expect(p.recommendedPhotosPerGallery).toBe(
        RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.FREE,
      );
      expect(p.canCaptureLeads).toBe(false);
      expect(p.removeBranding).toBe(false);
      expect(p.privacyLevel).toBe('public');
      expect(p.canAccessNotifyEvents).toBe(false);
      expect(p.expiresAt).toBe(false);
    });

    test('PRO: deve ter o motor de marketing ativado', () => {
      const p = PERMISSIONS_BY_PLAN.PRO;
      expect(p.canCaptureLeads).toBe(true);
      expect(p.canCustomWhatsApp).toBe(true);
      // FIX: PRO profileLevel = 'seo' (não 'advanced')
      expect(p.profileLevel).toBe('seo');
      expect(p.maxGalleriesHardCap).toBe(MAX_GALLERIES_HARD_CAP_BY_PLAN.PRO);
      expect(p.canAccessNotifyEvents).toBe(true);
      expect(p.expiresAt).toBe(true);
    });

    test('PREMIUM: deve ser o estado "Full Experience"', () => {
      const p = PERMISSIONS_BY_PLAN.PREMIUM;
      expect(p.removeBranding).toBe(true);
      expect(p.tagSelectionMode).toBe('drive');
      expect(p.privacyLevel).toBe('password');
      expect(p.canAccessNotifyEvents).toBe(true);
      expect(p.expiresAt).toBe(true);
      expect(p.maxGalleriesHardCap).toBe(MAX_GALLERIES_HARD_CAP_BY_PLAN.PREMIUM);
      expect(p.recommendedPhotosPerGallery).toBe(
        RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PREMIUM,
      );
    });
  });
});

// =============================================================================
// POOL SYSTEM
// =============================================================================
describe('Pool System — Créditos de Fotos e Galerias', () => {
  const poolCases: Array<[string, number, number, number]> = planOrder.map(
    (planKey) => [
      planKey,
      PHOTO_CREDITS_BY_PLAN[planKey],
      getBaseGalleriesFromPool(planKey),
      MAX_PHOTOS_PER_GALLERY_BY_PLAN[planKey],
    ],
  );

  test.each(poolCases)(
    'plano %s → %d créditos, %d galerias (pool base), %d fotos/galeria (max)',
    (planKey, credits, galleries, perGallery) => {
      let captured: any;
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.planKey).toBe(planKey);
      expect(captured.permissions.photoCredits).toBe(credits);
      expect(captured.permissions.maxGalleries).toBe(galleries);
      expect(captured.permissions.maxPhotosPerGallery).toBe(perGallery);
    },
  );

  test('FREE com 3 galerias: canAddMore retorna false; com 2 retorna true', () => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.canAddMore('maxGalleries', 3)).toBe(false);
    expect(captured.canAddMore('maxGalleries', 2)).toBe(true);
  });

  test('PLUS usa limite dinâmico de galerias (dev/prod)', () => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'PLUS' })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    const plusMax = PERMISSIONS_BY_PLAN.PLUS.maxGalleries;
    expect(captured.canAddMore('maxGalleries', plusMax)).toBe(false);
    expect(captured.canAddMore('maxGalleries', plusMax - 1)).toBe(true);
  });

  describe('calcEffectiveMaxGalleries — pool dinâmico de galerias', () => {
    test('PRO: respeita fórmula dinâmica sem hardcode de ambiente', () => {
      const used = 500;
      const active = 10;
      const expected = Math.min(
        active +
          Math.floor(
            Math.max(0, PHOTO_CREDITS_BY_PLAN.PRO - used) /
              RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PRO,
          ),
        MAX_GALLERIES_HARD_CAP_BY_PLAN.PRO,
      );
      expect(calcEffectiveMaxGalleries('PRO', used, active)).toBe(expected);
    });

    test('PRO com uso alto: respeita fórmula dinâmica', () => {
      const used = 8_000;
      const active = 10;
      const expected = Math.min(
        active +
          Math.floor(
            Math.max(0, PHOTO_CREDITS_BY_PLAN.PRO - used) /
              RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PRO,
          ),
        MAX_GALLERIES_HARD_CAP_BY_PLAN.PRO,
      );
      expect(calcEffectiveMaxGalleries('PRO', used, active)).toBe(expected);
    });

    test('FREE: pool reduzido respeita hardCap do ambiente', () => {
      const case1Expected = Math.min(
        0 +
          Math.floor(
            Math.max(0, PHOTO_CREDITS_BY_PLAN.FREE - 20) /
              RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.FREE,
          ),
        MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE,
      );
      expect(calcEffectiveMaxGalleries('FREE', 20, 0)).toBe(case1Expected);

      const hardCapExpected = MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE;
      expect(
        calcEffectiveMaxGalleries(
          'FREE',
          PHOTO_CREDITS_BY_PLAN.FREE,
          hardCapExpected,
        ),
      ).toBe(hardCapExpected);
    });

    test('PREMIUM: muitas galerias pequenas continuam contidas pelo hardCap', () => {
      const used = 1_000;
      const active = 1;
      const expected = Math.min(
        active +
          Math.floor(
            Math.max(0, PHOTO_CREDITS_BY_PLAN.PREMIUM - used) /
              RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PREMIUM,
          ),
        MAX_GALLERIES_HARD_CAP_BY_PLAN.PREMIUM,
      );
      expect(calcEffectiveMaxGalleries('PREMIUM', used, active)).toBe(expected);
    });

    test('getBaseGalleriesFromPool bate com maxGalleries de PERMISSIONS_BY_PLAN', () => {
      planOrder.forEach((p) => {
        expect(getBaseGalleriesFromPool(p)).toBe(
          PERMISSIONS_BY_PLAN[p].maxGalleries,
        );
      });
    });

    test('recommendedPhotosPerGallery é monotônico por plano', () => {
      for (let i = 1; i < planOrder.length; i++) {
        expect(RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN[planOrder[i]]).toBeGreaterThanOrEqual(
          RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN[planOrder[i - 1]],
        );
      }
    });
  });
});

// =============================================================================
// TRIAL LOGIC
// =============================================================================
describe('Trial Logic', () => {
  test('trial ativo (PRO) → planKey=PRO, isTrial=true', () => {
    let captured: any;
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();
    render(
      <PlanProvider
        profile={makeMockProfile({
          plan_key: 'PRO',
          is_trial: true,
          plan_trial_expires: futureDate,
        })}
      >
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.planKey).toBe('PRO');
    expect(captured.permissions.isTrial).toBe(true);
    expect(captured.permissions.canCaptureLeads).toBe(true);
  });

  test('trial expirado → mantém plano atual até cron aplicar downgrade', () => {
    let captured: any;
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    render(
      <PlanProvider
        profile={makeMockProfile({
          plan_key: 'PRO',
          is_trial: true,
          plan_trial_expires: pastDate,
        })}
      >
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.planKey).toBe('PRO');
    expect(captured.permissions.canCaptureLeads).toBe(true);
  });

  test('trial sem data → mantém plano atual até cron aplicar downgrade', () => {
    let captured: any;
    render(
      <PlanProvider
        profile={makeMockProfile({
          plan_key: 'PRO',
          is_trial: true,
          plan_trial_expires: undefined,
        })}
      >
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.planKey).toBe('PRO');
  });
});

// =============================================================================
// ZIP LIMITS
// =============================================================================
describe('ZIP Limits por Plano', () => {
  // zipSizeLimitBytes é computado no PlanContext — se undefined, adicionar a chave em plans.ts
  // Por ora, testamos apenas a string de display que existe em PlanPermissions
  const zipCases: Array<[string, string]> = [
    ['FREE', '500KB'],
    ['START', '1.5MB'],
    ['PLUS', '2MB'],
    ['PRO', '3MB'],
    ['PREMIUM', '3MB'],
  ];
  test.each(zipCases)('plano %s: zipSizeLimit = %s', (planKey, label) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.zipSizeLimit).toBe(label);
  });
});

// =============================================================================
// ENUM PERMISSIONS
// =============================================================================
describe('Permissões de Nível (enum)', () => {
  test.each([
    ['FREE', 'public'],
    ['START', 'password'],
    ['PLUS', 'password'],
    ['PRO', 'password'],
    ['PREMIUM', 'password'],
  ] as const)('privacyLevel plano %s = %s', (planKey, level) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.privacyLevel).toBe(level);
  });

  test.each([
    ['FREE', 'manual'],
    ['START', 'manual'],
    ['PLUS', 'manual'],
    ['PRO', 'bulk'],
    ['PREMIUM', 'drive'],
  ] as const)('tagSelectionMode plano %s = %s', (planKey, mode) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.tagSelectionMode).toBe(mode);
  });

  // FIX: PLUS=advanced (não standard), PRO=seo (não advanced)
  test.each([
    ['FREE', 'basic'],
    ['START', 'standard'],
    ['PLUS', 'advanced'],
    ['PRO', 'seo'],
    ['PREMIUM', 'seo'],
  ] as const)('profileLevel plano %s = %s', (planKey, level) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.profileLevel).toBe(level);
  });

  test.each([
    ['FREE', false],
    ['START', false],
    ['PLUS', true],
    ['PRO', true],
    ['PREMIUM', true],
  ] as const)('customizationLevel plano %s = %s', (planKey, level) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.customizationLevel).toBe(level);
  });

  test.each([
    ['FREE', false],
    ['START', false],
    ['PLUS', false],
    ['PRO', true],
    ['PREMIUM', true],
  ] as const)('expiresAt plano %s = %s', (planKey, expires) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.expiresAt).toBe(expires);
  });
});

// =============================================================================
// BOOLEAN PERMISSIONS
// =============================================================================
describe('Permissões Boolean por Feature', () => {
  test('removeBranding: apenas PREMIUM = true', () => {
    ['FREE', 'START', 'PLUS', 'PRO'].forEach((planKey) => {
      let captured: any;
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.permissions.removeBranding, planKey).toBe(false);
    });
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'PREMIUM' })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.removeBranding).toBe(true);
  });

  test('canCaptureLeads: false em FREE/START/PLUS, true em PRO/PREMIUM', () => {
    ['FREE', 'START', 'PLUS'].forEach((planKey) => {
      let captured: any;
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.permissions.canCaptureLeads, planKey).toBe(false);
    });
    ['PRO', 'PREMIUM'].forEach((planKey) => {
      let captured: any;
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.permissions.canCaptureLeads, planKey).toBe(true);
    });
  });

  // FIX: canShowSlideshow — START/PLUS=false, PRO/PREMIUM=true (alinhado com plans.ts)
  test('canShowSlideshow: false em FREE/START/PLUS, true em PRO/PREMIUM', () => {
    ['FREE', 'START', 'PLUS'].forEach((planKey) => {
      let captured: any;
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.permissions.canShowSlideshow, planKey).toBe(false);
    });
    ['PRO', 'PREMIUM'].forEach((planKey) => {
      let captured: any;
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.permissions.canShowSlideshow, planKey).toBe(true);
    });
  });

  test('keepOriginalFilenames: false em FREE/START, true em PLUS/PRO/PREMIUM', () => {
    ['FREE', 'START'].forEach((planKey) => {
      let captured: any;
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.permissions.keepOriginalFilenames, planKey).toBe(false);
    });
    ['PLUS', 'PRO', 'PREMIUM'].forEach((planKey) => {
      let captured: any;
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.permissions.keepOriginalFilenames, planKey).toBe(true);
    });
  });

  test('canFavorite: false em FREE, true nos demais', () => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'FREE' })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.canFavorite).toBe(false);
    ['START', 'PLUS', 'PRO', 'PREMIUM'].forEach((planKey) => {
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.permissions.canFavorite, planKey).toBe(true);
    });
  });

  test('canAccessNotifyEvents: false em FREE/START/PLUS, true em PRO/PREMIUM', () => {
    ['FREE', 'START', 'PLUS'].forEach((planKey) => {
      let captured: any;
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.permissions.canAccessNotifyEvents, planKey).toBe(false);
    });
    ['PRO', 'PREMIUM'].forEach((planKey) => {
      let captured: any;
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey as any })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.permissions.canAccessNotifyEvents, planKey).toBe(true);
    });
  });
});

// =============================================================================
// NUMERIC PERMISSIONS
// =============================================================================
describe('Permissões Numéricas', () => {
  test.each([
    ['FREE', 0],
    ['START', 0],
    ['PLUS', 2],
    ['PRO', 5],
    ['PREMIUM', 99],
  ] as const)('teamMembers plano %s = %d', (planKey, members) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.teamMembers).toBe(members);
  });

  // FIX: PRO=8 (não 6), alinhado com plans.ts
  test.each([
    ['FREE', 3],
    ['START', 4],
    ['PLUS', 5],
    ['PRO', 8],
    ['PREMIUM', 8],
  ] as const)('maxGridColumns plano %s = %d', (planKey, cols) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.maxGridColumns).toBe(cols);
  });

  // FIX: PRO maxTags=15 (não 12), alinhado com plans.ts
  test.each([
    ['FREE', 0],
    ['START', 0],
    ['PLUS', 7],
    ['PRO', 15],
    ['PREMIUM', 50],
  ] as const)('maxTags plano %s = %d', (planKey, tags) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.maxTags).toBe(tags);
  });

  test.each([
    ['FREE', 0],
    ['START', 1],
    ['PLUS', 1],
    ['PRO', 3],
    ['PREMIUM', 5],
  ] as const)('profileCarouselLimit plano %s = %d', (planKey, limit) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.profileCarouselLimit).toBe(limit);
  });

  test.each([
    ['FREE', 0],
    ['START', 1],
    ['PLUS', 2],
    ['PRO', 5],
    ['PREMIUM', 10],
  ] as const)('maxExternalLinks plano %s = %d', (planKey, links) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.permissions.maxExternalLinks).toBe(links);
  });
});

// =============================================================================
// isPro / isPremium
// =============================================================================
describe('isPro / isPremium helpers', () => {
  test.each(['PRO', 'PREMIUM'] as const)('isPro = true para %s', (planKey) => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.isPro).toBe(true);
  });

  test.each(['FREE', 'START', 'PLUS'] as const)(
    'isPro = false para %s',
    (planKey) => {
      let captured: any;
      render(
        <PlanProvider profile={makeMockProfile({ plan_key: planKey })}>
          <PlanConsumer
            onPlan={(p) => {
              captured = p;
            }}
          />
        </PlanProvider>,
      );
      expect(captured.isPro).toBe(false);
    },
  );

  test('isPremium = true apenas para PREMIUM', () => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'PREMIUM' })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.isPremium).toBe(true);
  });

  test('isPremium = false para PRO', () => {
    let captured: any;
    render(
      <PlanProvider profile={makeMockProfile({ plan_key: 'PRO' })}>
        <PlanConsumer
          onPlan={(p) => {
            captured = p;
          }}
        />
      </PlanProvider>,
    );
    expect(captured.isPremium).toBe(false);
  });
});
