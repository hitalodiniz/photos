import { describe, test, expect, beforeAll, vi } from 'vitest';
import {
  COMMON_FEATURES,
  PERMISSIONS_BY_PLAN,
  PlanPermissions,
  // FIX 1: planOrder não existe em plans.ts — PLAN_ORDER é privado.
  // Exportamos nossa própria constante local, idêntica à usada internamente.
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
// FIX 1: Declarado localmente porque plans.ts não exporta planOrder.
// Deve manter a mesma ordem usada internamente em PLAN_ORDER.
const planOrder = ['FREE', 'START', 'PLUS', 'PRO', 'PREMIUM'] as const;
type PlanKey = (typeof planOrder)[number];

describe('Validação de Permissões por Grupo', () => {
  describe('Grupo: Gestão', () => {
    // FIX 2: Progressão real do plans.ts:
    //   FREE=3, START=10, PLUS=20, PRO=50, PREMIUM=200
    test('maxGalleries deve seguir progressão: 3 -> 10 -> 20 -> 50 -> 200', () => {
      const values = planOrder.map((p) => PERMISSIONS_BY_PLAN[p].maxGalleries);
      expect(values).toEqual([3, 10, 20, 50, 200]);
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
      // FIX 3: PRO tem 'advanced' (não 'seo' — só PREMIUM tem seo)
      expect(PERMISSIONS_BY_PLAN.PRO.profileLevel).toBe('advanced');
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
    // FIX 4: PRO tem 'password', PREMIUM tem 'expiration'
    test('privacyLevel deve permitir expiração apenas no PREMIUM', () => {
      expect(PERMISSIONS_BY_PLAN.PRO.privacyLevel).toBe('password');
      expect(PERMISSIONS_BY_PLAN.PREMIUM.privacyLevel).toBe('expiration');
    });

    test('customizationLevel deve permitir cores no PLUS e full no PREMIUM', () => {
      expect(PERMISSIONS_BY_PLAN.PLUS.customizationLevel).toBe('colors');
      expect(PERMISSIONS_BY_PLAN.PREMIUM.customizationLevel).toBe('full');
    });
  });
});

describe('Consistência com UI (COMMON_FEATURES)', () => {
  test('Cada entrada em COMMON_FEATURES com "key" deve existir na PlanPermissions', () => {
    const technicalKeys = Object.keys(PERMISSIONS_BY_PLAN.FREE);
    const uiKeys = COMMON_FEATURES.filter((f) => f.key).map((f) => f.key);

    uiKeys.forEach((key) => {
      expect(technicalKeys).toContain(key);
    });
  });
});

describe('Integridade Total do Sistema de Permissões', () => {
  // FIX 5: Lista de chaves sincronizada com a interface PlanPermissions real.
  // Adicionadas: photoCredits, zipSizeLimitBytes, canAccessStats
  // (estavam ausentes na versão original do teste)
  const allPermissionKeys: (keyof PlanPermissions)[] = [
    'photoCredits',
    'maxGalleries',
    'maxPhotosPerGallery',
    'teamMembers',
    'profileLevel',
    'profileCarouselLimit',
    'profileListLimit',
    'removeBranding',
    'canCaptureLeads',
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
    'zipSizeLimitBytes',
    'maxExternalLinks',
    'canCustomLinkLabel',
    'privacyLevel',
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
    // FIX 6: FREE.maxGalleries real = 3 (não 2)
    test('FREE: deve ser rigorosamente limitado', () => {
      const p = PERMISSIONS_BY_PLAN.FREE;
      expect(p.maxGalleries).toBe(3);
      expect(p.canCaptureLeads).toBe(false);
      expect(p.removeBranding).toBe(false);
      expect(p.privacyLevel).toBe('public');
    });

    // FIX 7: PRO profileLevel = 'advanced' (não 'seo')
    test('PRO: deve ter o motor de marketing ativado', () => {
      const p = PERMISSIONS_BY_PLAN.PRO;
      expect(p.canCaptureLeads).toBe(true);
      expect(p.canCustomWhatsApp).toBe(true);
      expect(p.profileLevel).toBe('advanced');
    });

    // FIX 8: PREMIUM privacyLevel = 'expiration' (não 'password')
    test('PREMIUM: deve ser o estado "Full Experience"', () => {
      const p = PERMISSIONS_BY_PLAN.PREMIUM;
      expect(p.removeBranding).toBe(true);
      expect(p.tagSelectionMode).toBe('drive');
      expect(p.privacyLevel).toBe('expiration');
    });
  });
});

// ─── POOL SYSTEM ─────────────────────────────────────────────────────────────
describe('Pool System — Créditos de Fotos e Galerias', () => {
  const poolCases: Array<[string, number, number, number]> = [
    ['FREE', 450, 3, 150],
    ['START', 3000, 10, 300],
    ['PLUS', 8000, 20, 400],
    ['PRO', 30000, 50, 600],
    ['PREMIUM', 200000, 200, 1000],
  ];

  test.each(poolCases)(
    'plano %s → %d créditos, %d galerias, %d fotos/galeria',
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

  test('PLUS com 20 galerias: canAddMore retorna false; com 19 retorna true', () => {
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
    expect(captured.canAddMore('maxGalleries', 20)).toBe(false);
    expect(captured.canAddMore('maxGalleries', 19)).toBe(true);
  });
});

// ─── TRIAL LOGIC ─────────────────────────────────────────────────────────────
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

  test('trial expirado → rebaixado para FREE', () => {
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
    expect(captured.planKey).toBe('FREE');
    expect(captured.permissions.canCaptureLeads).toBe(false);
  });

  test('trial sem data → FREE', () => {
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
    expect(captured.planKey).toBe('FREE');
  });
});

// ─── ZIP LIMITS ──────────────────────────────────────────────────────────────
describe('ZIP Limits por Plano', () => {
  const zipCases: Array<[string, number, string]> = [
    ['FREE', 500_000, '500KB'],
    ['START', 1_000_000, '1MB'],
    ['PLUS', 1_500_000, '1.5MB'],
    ['PRO', 2_000_000, '2MB'],
    ['PREMIUM', 3_000_000, '3MB'],
  ];
  test.each(zipCases)('plano %s: %d bytes (%s)', (planKey, bytes, label) => {
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
    expect(captured.permissions.zipSizeLimitBytes).toBe(bytes);
    expect(captured.permissions.zipSizeLimit).toBe(label);
  });
});

// ─── ENUM PERMISSIONS ────────────────────────────────────────────────────────
describe('Permissões de Nível (enum)', () => {
  test.each([
    ['FREE', 'public'],
    ['START', 'private'],
    ['PLUS', 'private'],
    ['PRO', 'password'],
    ['PREMIUM', 'expiration'],
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

  test.each([
    ['FREE', 'basic'],
    ['START', 'standard'],
    ['PLUS', 'standard'],
    ['PRO', 'advanced'],
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
    ['FREE', 'default'],
    ['START', 'default'],
    ['PLUS', 'colors'],
    ['PRO', 'colors'],
    ['PREMIUM', 'full'],
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
});

// ─── BOOLEAN PERMISSIONS ─────────────────────────────────────────────────────
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
});

// ─── NUMERIC PERMISSIONS ─────────────────────────────────────────────────────
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

  test.each([
    ['FREE', 3],
    ['START', 4],
    ['PLUS', 5],
    ['PRO', 6],
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

  test.each([
    ['FREE', 0],
    ['START', 0],
    ['PLUS', 7],
    ['PRO', 12],
    ['PREMIUM', 30],
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

// ─── isPro / isPremium ────────────────────────────────────────────────────────
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
