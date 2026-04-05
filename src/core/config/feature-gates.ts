/**
 * feature-gates.ts
 *
 * Camada utilitária para verificar permissões de plano em qualquer parte do código.
 * Importe as funções abaixo em vez de acessar PERMISSIONS_BY_PLAN diretamente.
 *
 * Padrão de uso:
 *   import { can, hasCreditsFor, getLimit } from '@/core/config/feature-gates';
 *
 *   if (!can(userPlan, FEATURE.CAN_FAVORITE)) return <UpgradePrompt />;
 *   if (!hasCreditsFor(usage, userPlan)) return <QuotaWarning />;
 */

import {
  FEATURE,
  PERMISSIONS_BY_PLAN,
  PHOTO_CREDITS_BY_PLAN,
  MAX_GALLERIES_BY_PLAN,
  MAX_PHOTOS_PER_GALLERY_BY_PLAN,
  ZIP_LIMITS,
  PlanKey,
  PlanPermissions,
  FeatureKey,
  formatPhotoCredits,
} from './plans';

export { FEATURE, formatPhotoCredits, MAX_PHOTOS_PER_GALLERY_BY_PLAN };
export type { PlanKey, FeatureKey };

// =============================================================================
// 🔐 can() — Verifica permissão booleana de uma feature
//
// Uso:
//   can('PRO', FEATURE.CAN_SHOW_SLIDESHOW)  → true
//   can('FREE', FEATURE.CAN_CAPTURE_LEADS)  → false
// =============================================================================

export function can(plan: PlanKey, feature: FeatureKey): boolean {
  const perms = PERMISSIONS_BY_PLAN[plan];
  const value = perms[feature as keyof PlanPermissions];
  return Boolean(value);
}

// =============================================================================
// 🎫 VALIDAÇÕES DE CAPACIDADE — Hard caps que travam o plano
//
// Regras de negócio:
//   1. totalPhotosUsed + newPhotos <= photoCredits    → pool global
//   2. currentGalleries < maxGalleries               → limite de galerias
//   3. photosInGallery + newPhotos <= 2.000          → limite por galeria
//
// Todas retornam false quando o limite é ATINGIDO (comportamento de trava).
// =============================================================================

// --- Pool global de fotos ---

export function hasCreditsFor(
  usage: { totalPhotos: number; newPhotos?: number },
  plan: PlanKey,
): boolean {
  const total = usage.totalPhotos + (usage.newPhotos ?? 0);
  return total <= PHOTO_CREDITS_BY_PLAN[plan];
}

export function remainingCredits(
  totalPhotosUsed: number,
  plan: PlanKey,
): number {
  return Math.max(0, PHOTO_CREDITS_BY_PLAN[plan] - totalPhotosUsed);
}

export function creditUsagePercent(
  totalPhotosUsed: number,
  plan: PlanKey,
): number {
  const credits = PHOTO_CREDITS_BY_PLAN[plan];
  return Math.min(100, Math.round((totalPhotosUsed / credits) * 100));
}

export function isCreditsExhausted(
  totalPhotosUsed: number,
  plan: PlanKey,
): boolean {
  return totalPhotosUsed >= PHOTO_CREDITS_BY_PLAN[plan];
}

// --- Hard cap de galerias ---

export function canAddGallery(
  usage: { currentGalleries: number },
  plan: PlanKey,
): boolean {
  return usage.currentGalleries < MAX_GALLERIES_BY_PLAN[plan];
}

export function remainingGallerySlots(
  currentGalleries: number,
  plan: PlanKey,
): number {
  return Math.max(0, MAX_GALLERIES_BY_PLAN[plan] - currentGalleries);
}

export function isGalleriesExhausted(
  currentGalleries: number,
  plan: PlanKey,
): boolean {
  return currentGalleries >= MAX_GALLERIES_BY_PLAN[plan];
}

// --- Hard cap por galeria (varia por plano) ---

export function canAddPhotosToGallery(
  usage: { photosInGallery: number; newPhotos?: number },
  plan: PlanKey,
): boolean {
  const total = usage.photosInGallery + (usage.newPhotos ?? 0);
  return total <= MAX_PHOTOS_PER_GALLERY_BY_PLAN[plan];
}

export function remainingPhotoSlotsInGallery(
  photosInGallery: number,
  plan: PlanKey,
): number {
  return Math.max(0, MAX_PHOTOS_PER_GALLERY_BY_PLAN[plan] - photosInGallery);
}

// Verificação combinada: valida pool global E limite da galeria de uma vez
export function canUploadToGallery(
  usage: {
    totalPhotosUsed: number;
    photosInGallery: number;
    newPhotos: number;
  },
  plan: PlanKey,
): { allowed: boolean; reason?: 'credits_exhausted' | 'gallery_full' } {
  if (usage.totalPhotosUsed + usage.newPhotos > PHOTO_CREDITS_BY_PLAN[plan]) {
    return { allowed: false, reason: 'credits_exhausted' };
  }
  if (
    usage.photosInGallery + usage.newPhotos >
    MAX_PHOTOS_PER_GALLERY_BY_PLAN[plan]
  ) {
    return { allowed: false, reason: 'gallery_full' };
  }
  return { allowed: true };
}

// =============================================================================
// 📏 getLimit() — Retorna o valor numérico de um limite do plano
// =============================================================================

export function getLimit(plan: PlanKey, feature: FeatureKey): number | string {
  const perms = PERMISSIONS_BY_PLAN[plan];
  const value = perms[feature as keyof PlanPermissions];
  if (value === 'unlimited') return 'unlimited';
  return value as number | string;
}

// =============================================================================
// 🆙 requiresPlan() — Retorna o plano mínimo que suporta uma feature
// =============================================================================

const PLAN_ORDER: PlanKey[] = ['FREE', 'START', 'PLUS', 'PRO', 'PREMIUM'];

export function requiresPlan(feature: FeatureKey): PlanKey {
  for (const plan of PLAN_ORDER) {
    const value = PERMISSIONS_BY_PLAN[plan][feature as keyof PlanPermissions];
    if (
      value &&
      value !== 'minimal' &&
      value !== 'basic' &&
      value !== 'public' &&
      value !== 'default'
    ) {
      return plan;
    }
  }
  return 'PREMIUM';
}

// =============================================================================
// 📁 canUploadFile() — Valida tamanho de arquivo antes do upload no ZIP
// =============================================================================

export function canUploadFile(
  file: { fileSizeBytes: number },
  plan: PlanKey,
): boolean {
  return file.fileSizeBytes <= ZIP_LIMITS[plan];
}

// =============================================================================
// 🔒 privacyAllows() — Verifica se o plano suporta certo nível de privacidade
// =============================================================================

type PrivacyLevel = 'public' | 'password';
const PRIVACY_RANK: Record<PrivacyLevel, number> = {
  public: 0,
  password: 1,
};

export function privacyAllows(plan: PlanKey, level: PrivacyLevel): boolean {
  const planLevel = PERMISSIONS_BY_PLAN[plan].privacyLevel as PrivacyLevel;
  return PRIVACY_RANK[planLevel] >= PRIVACY_RANK[level];
}

// =============================================================================
// 🎨 customizationAllows()
// =============================================================================

type CustomizationLevel = 'default' | 'colors' | 'full';
const CUSTOM_RANK: Record<CustomizationLevel, number> = {
  default: 0,
  colors: 1,
  full: 2,
};

export function customizationAllows(
  plan: PlanKey,
  level: CustomizationLevel,
): boolean {
  const planLevel = PERMISSIONS_BY_PLAN[plan]
    .customizationLevel as CustomizationLevel;
  return CUSTOM_RANK[planLevel] >= CUSTOM_RANK[level];
}

// =============================================================================
// 📊 getPlanSummary() — Resumo legível do plano (útil em dashboards/UI)
// =============================================================================

export function getPlanSummary(plan: PlanKey) {
  const perms = PERMISSIONS_BY_PLAN[plan];
  return {
    credits: formatPhotoCredits(perms.photoCredits),
    maxGalleries: perms.maxGalleries,
    maxPhotosPerGallery: perms.maxPhotosPerGallery,
    teamMembers: perms.teamMembers === 99 ? 'Ilimitado' : perms.teamMembers,
    zipLimit: perms.zipSizeLimit,
    privacyLevel: perms.privacyLevel,
    customizationLevel: perms.customizationLevel,
    canCaptureLeads: perms.canCaptureLeads,
    canShowSlideshow: perms.canShowSlideshow,
    removeBranding: perms.removeBranding,
  };
}

// =============================================================================
// 🧩 getGateGroups() — Grupos semânticos de features para componentes
// =============================================================================

export function getGateGroups(plan: PlanKey) {
  const p = PERMISSIONS_BY_PLAN[plan];
  return {
    capacity: {
      photoCredits: p.photoCredits,
      maxGalleries: p.maxGalleries,
      maxPhotosPerGallery: p.maxPhotosPerGallery,
      teamMembers: p.teamMembers,
    },
    profile: {
      level: p.profileLevel,
      carouselLimit: p.profileCarouselLimit,
      listLimit: p.profileListLimit,
      removeBranding: p.removeBranding,
    },
    leads: {
      canCapture: p.canCaptureLeads,
      canExport: p.canExportLeads,
      canCustomWhatsApp: p.canCustomWhatsApp,
    },
    gallery: {
      socialDisplayLevel: p.socialDisplayLevel,
      canFavorite: p.canFavorite,
      canDownloadSelection: p.canDownloadFavoriteSelection,
      canShowSlideshow: p.canShowSlideshow,
      maxGridColumns: p.maxGridColumns,
      maxTags: p.maxTags,
      tagSelectionMode: p.tagSelectionMode,
    },
    delivery: {
      zipSizeLimit: p.zipSizeLimit,
      zipSizeLimitBytes: p.zipSizeLimitBytes,
      maxExternalLinks: p.maxExternalLinks,
      canCustomLinkLabel: p.canCustomLinkLabel,
      keepOriginalFilenames: p.keepOriginalFilenames,
    },
    security: {
      privacyLevel: p.privacyLevel,
    },
    design: {
      customizationLevel: p.customizationLevel,
      canCustomCategories: p.canCustomCategories,
    },
  };
}
