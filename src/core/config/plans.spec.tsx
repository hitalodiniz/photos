import { describe, test, expect } from 'vitest';
import {
  COMMON_FEATURES,
  PERMISSIONS_BY_PLAN,
  planOrder,
  PlanPermissions,
} from './plans';

describe('Validação de Permissões por Grupo', () => {
  describe('Grupo: Gestão', () => {
    test('maxGalleries deve seguir progressão: 2 -> 10 -> 20 -> 50 -> 9999', () => {
      const values = planOrder.map((p) => PERMISSIONS_BY_PLAN[p].maxGalleries);
      expect(values).toEqual([2, 10, 20, 50, 9999]);
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
    test('privacyLevel deve permitir expiração apenas no PREMIUM', () => {
      expect(PERMISSIONS_BY_PLAN.PRO.privacyLevel).toBe('password');
      expect(PERMISSIONS_BY_PLAN.PREMIUM.privacyLevel).toBe('password');
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
  // Lista exata de todas as chaves da interface PlanPermissions para garantir cobertura 100%
  const allPermissionKeys: (keyof PlanPermissions)[] = [
    'maxGalleries',
    'maxPhotosPerGallery',
    'teamMembers',
    'profileLevel',
    'profileCarouselLimit',
    'profileListLimit',
    'removeBranding',
    'canCaptureLeads',
    'canExportLeads',
    'socialDisplayLevel',
    'canFavorite',
    'canDownloadFavoriteSelection',
    'canShowSlideshow',
    'maxGridColumns',
    'maxTags',
    'tagSelectionMode',
    'zipSizeLimit',
    'maxExternalLinks',
    'canCustomLinkLabel',
    'privacyLevel',
    'keepOriginalFilenames',
    'customizationLevel',
    'canCustomWhatsApp',
    'canCustomCategories',
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
    /**
     * Esta função garante que um plano superior NUNCA tenha um limite menor que o anterior.
     * Útil para evitar erros de digitação ao ajustar valores de mercado.
     */
    const checkNumericProgress = (key: keyof PlanPermissions) => {
      for (let i = 1; i < planOrder.length; i++) {
        const prev = PERMISSIONS_BY_PLAN[planOrder[i - 1]][key];
        const curr = PERMISSIONS_BY_PLAN[planOrder[i]][key];

        // Trata 'unlimited' como um número infinito para comparação
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
    test('FREE: deve ser rigorosamente limitado', () => {
      const p = PERMISSIONS_BY_PLAN.FREE;
      expect(p.maxGalleries).toBe(2);
      expect(p.canCaptureLeads).toBe(false);
      expect(p.removeBranding).toBe(false);
      expect(p.privacyLevel).toBe('public');
    });

    test('PRO: deve ter o motor de marketing ativado', () => {
      const p = PERMISSIONS_BY_PLAN.PRO;
      expect(p.canCaptureLeads).toBe(true);
      expect(p.canCustomWhatsApp).toBe(true);
      expect(p.profileLevel).toBe('advanced');
    });

    test('PREMIUM: deve ser o estado "Full Experience"', () => {
      const p = PERMISSIONS_BY_PLAN.PREMIUM;
      expect(p.removeBranding).toBe(true);
      expect(p.tagSelectionMode).toBe('drive');
      expect(p.privacyLevel).toBe('password');
    });
  });
});
