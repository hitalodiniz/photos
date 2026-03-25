import {
  Zap,
  Rocket,
  Star,
  Crown,
  Sparkles,
  Shield,
  Layout,
  Gem,
  Medal,
  Award,
} from 'lucide-react';

export type SegmentType = 'PHOTOGRAPHER' | 'EVENT' | 'CAMPAIGN' | 'OFFICE';
export type PlanKey = 'FREE' | 'START' | 'PLUS' | 'PRO' | 'PREMIUM';

export const planOrder: PlanKey[] = ['FREE', 'START', 'PLUS', 'PRO', 'PREMIUM'];

export function getNextPlanKey(current: PlanKey): PlanKey | null {
  const idx = planOrder.indexOf(current);
  if (idx === -1 || idx >= planOrder.length - 1) return null;
  return planOrder[idx + 1];
}

// =============================================================================
// 🎫 SISTEMA DE CAPACIDADE FLEXÍVEL (COTA DE ARQUIVOS)
//
// Quatro camadas de controle:
//
//   1. photoCredits                  → cota global de arquivos (processamento/exibição do Drive)
//   2. storageGB                     → capacidade em GB (informativo, exibido na UI)
//   3. maxGalleries (base dinâmico)  → floor(photoCredits / recommendedPhotosPerGallery)
//                                      garante este número de galerias com cota cheia
//   4. maxGalleriesHardCap           → teto absoluto (nunca ultrapassado)
//   5. maxPhotosPerGallery           → hard cap por galeria (bloqueia ao atingir)
//   6. recommendedPhotosPerGallery   → aviso amarelo + base do cálculo dinâmico
//                                      = photoCredits / maxGalleries
//   7. maxFilesAlertThreshold        → alerta amarelo para uso "excessivo" na galeria
//                                      (threshold de alerta, ≤ maxPhotosPerGallery)
//   8. maxVideoCount                 → vídeos por galeria
//   9. maxVideoSizeMB                → tamanho máximo por vídeo em MB
//
// Runtime check:
//   const canCreate = calcEffectiveMaxGalleries(planKey, usedCredits, activeCount) > activeCount
//
// =============================================================================

const isDev = process.env.NODE_ENV === 'development';

// ── Cota de arquivos (Pool global: fotos + vídeos processados do Drive) ───────
export const PHOTO_CREDITS_BY_PLAN: Record<PlanKey, number> = {
  FREE: isDev ? 10 : 450,
  START: isDev ? 30 : 3_000, // Ajustado para 30 (3 galerias de 10)
  PLUS: isDev ? 80 : 20_000, // Ajustado para 80 (4 galerias de 20)
  PRO: isDev ? 200 : 100_000, // 5 galerias de 40
  PREMIUM: isDev ? 500 : 300_000, // 10 galerias de 50
};

// ── Capacidade em GB (Informativo - Média de 3MB por arquivo) ─────
export const STORAGE_GB_BY_PLAN: Record<PlanKey, number> = {
  FREE: 1.5,
  START: 10,
  PLUS: 60,
  PRO: 300,
  PREMIUM: 1000,
};

// ── Teto absoluto de galerias (Hard Cap - Onde o sistema trava) ────────
export const MAX_GALLERIES_HARD_CAP_BY_PLAN: Record<PlanKey, number> = {
  FREE: isDev ? 2 : 3,
  START: isDev ? 3 : 18,
  PLUS: isDev ? 4 : 75,
  PRO: isDev ? 5 : 150,
  PREMIUM: isDev ? 10 : 500,
};

// ── Hard cap por galeria (Bloqueio de upload na galeria individual) ─────
export const MAX_PHOTOS_PER_GALLERY_BY_PLAN: Record<PlanKey, number> = {
  FREE: isDev ? 8 : 200, // Um pouco acima do recomendado para testar "uso excessivo"
  START: isDev ? 15 : 800,
  PLUS: isDev ? 30 : 1_500,
  PRO: isDev ? 60 : 4_000,
  PREMIUM: isDev ? 100 : 8_000,
};

// ── Recomendado por galeria = cota / galerias_base ───────────────────────────
export const RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN: Record<PlanKey, number> = {
  FREE: isDev ? 5 : 150, // 10 / 2 = 5
  START: isDev ? 10 : 250, // 30 / 3 = 10
  PLUS: isDev ? 20 : 400, // 80 / 4 = 20
  PRO: isDev ? 40 : 1_000, // 200 / 5 = 40
  PREMIUM: isDev ? 50 : 1_000, // 500 / 10 = 50
};

// ── Threshold de alerta amarelo na galeria individual ─────────────────────────
export const FILES_ALERT_THRESHOLD_BY_PLAN: Record<PlanKey, number> = {
  FREE: isDev ? 5 : 150, // 10 / 2 = 5
  START: isDev ? 10 : 250, // 30 / 3 = 10
  PLUS: isDev ? 20 : 400, // 80 / 4 = 20
  PRO: isDev ? 40 : 1_000, // 200 / 5 = 40
  PREMIUM: isDev ? 50 : 1_000, // 500 / 10 = 50
};

// ── Vídeos ────────────────────────────────────────────────────────────────────
export const MAX_VIDEO_COUNT_BY_PLAN: Record<PlanKey, number> = {
  FREE: isDev ? 1 : 1,
  START: isDev ? 2 : 10,
  PLUS: isDev ? 3 : 20,
  PRO: isDev ? 4 : 50,
  PREMIUM: isDev ? 5 : 100,
};

export const MAX_VIDEO_SIZE_MB_BY_PLAN: Record<PlanKey, number> = {
  FREE: 15,
  START: 50,
  PLUS: 100,
  PRO: 200, // Maior suporte para vídeos no PRO e Premium
  PREMIUM: 200,
};
// =============================================================================
// FUNÇÕES DE CÁLCULO
// =============================================================================

/**
 * Retorna o número base de galerias garantido pelo plano com cota cheia.
 * Equivale a floor(photoCredits / recommendedPhotosPerGallery).
 */
export function getBaseGalleriesFromPool(planKey: PlanKey): number {
  return Math.floor(
    PHOTO_CREDITS_BY_PLAN[planKey] /
      RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN[planKey],
  );
}

/**
 * Calcula o número máximo efetivo de galerias em runtime.
 *
 * Quem vincula menos arquivos por galeria se beneficia automaticamente:
 * a cota "sobra" e permite mais galerias, até o hardCap.
 *
 * @param planKey            - Plano do usuário
 * @param usedCredits        - Total de arquivos vinculados (soma de todas as galerias)
 * @param activeGalleryCount - Número atual de galerias ativas
 *
 * @example
 * // PRO, 10.000 arquivos em 10 galerias:
 * calcEffectiveMaxGalleries('PRO', 10_000, 10)
 * // remaining = 50.000 - 10.000 = 40.000
 * // da cota   = floor(40.000 / 1.000) = 40
 * // total     = min(10 + 40, 90) = 50
 *
 * // PRO com cota quase esgotada (45.000 usados):
 * calcEffectiveMaxGalleries('PRO', 45_000, 10)
 * // remaining = 5.000, da cota = 5
 * // total     = min(10 + 5, 90) = 15 → cota limita
 */
export function calcEffectiveMaxGalleries(
  planKey: PlanKey,
  usedCredits: number,
  activeGalleryCount: number,
): number {
  const totalCredits = PHOTO_CREDITS_BY_PLAN[planKey];
  const recommended = RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN[planKey];
  const hardCap = MAX_GALLERIES_HARD_CAP_BY_PLAN[planKey];

  const remainingCredits = Math.max(0, totalCredits - usedCredits);
  const galleriesFromCota = Math.floor(remainingCredits / recommended);
  // Fórmula da Cota Elástica: min(activeCount + floor(remainingCredits / recommended), hardCap)
  return Math.min(activeGalleryCount + galleriesFromCota, hardCap);
}

export function formatPhotoCredits(credits: number): string {
  if (credits >= 1_000) return `${(credits / 1_000).toFixed(0)}k`;
  return String(credits);
}

export function formatStorageGB(gb: number): string {
  if (gb >= 1_000) return `${(gb / 1_000).toFixed(1)} TB`;
  return `${gb} GB`;
}

// =============================================================================
// FEATURE KEYS & DESCRIPTIONS
// =============================================================================

export const FEATURE = {
  PHOTO_CREDITS: 'photoCredits',
  STORAGE_GB: 'storageGB',
  MAX_GALLERIES: 'maxGalleries',
  MAX_GALLERIES_HARD_CAP: 'maxGalleriesHardCap',
  MAX_PHOTOS_PER_GALLERY: 'maxPhotosPerGallery',
  RECOMMENDED_PHOTOS_PER_GALLERY: 'recommendedPhotosPerGallery',
  FILES_ALERT_THRESHOLD: 'filesAlertThreshold',
  MAX_VIDEO_COUNT: 'maxVideoCount',
  MAX_VIDEO_SIZE_MB: 'maxVideoSizeMB',
  TEAM_MEMBERS: 'teamMembers',
  PROFILE_LEVEL: 'profileLevel',
  PROFILE_CAROUSEL_LIMIT: 'profileCarouselLimit',
  PROFILE_LIST_LIMIT: 'profileListLimit',
  REMOVE_BRANDING: 'removeBranding',
  CAN_CAPTURE_LEADS: 'canCaptureLeads',
  CAN_EXPORT_LEADS: 'canExportLeads',
  CAN_CUSTOM_WHATSAPP: 'canCustomWhatsApp',
  SOCIAL_DISPLAY_LEVEL: 'socialDisplayLevel',
  CAN_FAVORITE: 'canFavorite',
  CAN_DOWNLOAD_FAVORITE_SELECTION: 'canDownloadFavoriteSelection',
  CAN_SHOW_SLIDESHOW: 'canShowSlideshow',
  MAX_GRID_COLUMNS: 'maxGridColumns',
  MAX_TAGS: 'maxTags',
  TAG_SELECTION_MODE: 'tagSelectionMode',
  ZIP_SIZE_LIMIT: 'zipSizeLimit',
  MAX_EXTERNAL_LINKS: 'maxExternalLinks',
  CAN_CUSTOM_LINK_LABEL: 'canCustomLinkLabel',
  KEEP_ORIGINAL_FILENAMES: 'keepOriginalFilenames',
  PRIVACY_LEVEL: 'privacyLevel',
  CUSTOMIZATION_LEVEL: 'customizationLevel',
  CAN_CUSTOM_CATEGORIES: 'canCustomCategories',
  CAN_ACCESS_STATS: 'canAccessStats',
  CAN_ACCESS_NOTIFY_EVENTS: 'canAccessNotifyEvents',
  EXPIRES_AT: 'expiresAt',
} as const;

export type FeatureKey = (typeof FEATURE)[keyof typeof FEATURE];

export interface PlanPermissions {
  // ── Capacidade ─────────────────────────────────────────────────────────────
  photoCredits: number;
  storageGB: number;
  maxGalleries: number; // base garantido com cota cheia
  maxGalleriesHardCap: number; // teto absoluto
  maxPhotosPerGallery: number; // hard cap por galeria (bloqueia)
  recommendedPhotosPerGallery: number; // = photoCredits / maxGalleries
  filesAlertThreshold: number; // aviso amarelo (≤ maxPhotosPerGallery)
  maxVideoCount: number;
  maxVideoSizeMB: number;
  // ── Equipe & Perfil ────────────────────────────────────────────────────────
  teamMembers: number;
  profileLevel: 'basic' | 'standard' | 'advanced' | 'seo';
  profileCarouselLimit: number;
  profileListLimit: number | 'unlimited';
  removeBranding: boolean;
  // ── Leads ──────────────────────────────────────────────────────────────────
  canCaptureLeads: boolean;
  canAccessNotifyEvents: boolean;
  canExportLeads: boolean;
  canAccessStats: boolean;
  canCustomWhatsApp: boolean;
  socialDisplayLevel: 'minimal' | 'social' | 'full';
  // ── Galeria ────────────────────────────────────────────────────────────────
  maxCoverPerGallery: number;
  canFavorite: boolean;
  canDownloadFavoriteSelection: boolean;
  tagSelectionFavoriteMode: 'single' | 'multiple';
  canShowSlideshow: boolean;
  maxGridColumns: number;
  canTagPhotos: number;
  maxTags: number;
  tagSelectionMode: 'manual' | 'bulk' | 'drive';
  // ── Entrega & Segurança ────────────────────────────────────────────────────
  zipSizeLimit: string;
  /** Limite do ZIP em bytes (derivado de zipSizeLimit para uso em downloads). */
  zipSizeLimitBytes: number;
  maxExternalLinks: number;
  canCustomLinkLabel: boolean;
  privacyLevel: 'public' | 'password';
  expiresAt: boolean | null;
  keepOriginalFilenames: boolean;
  customizationLevel: boolean;
  canCustomCategories: boolean;
  isTrial?: boolean;
}

export const PERMISSIONS_BY_PLAN: Record<PlanKey, PlanPermissions> = {
  FREE: {
    // ── Capacidade
    photoCredits: PHOTO_CREDITS_BY_PLAN.FREE,
    storageGB: STORAGE_GB_BY_PLAN.FREE,
    maxGalleries: getBaseGalleriesFromPool('FREE'),
    maxGalleriesHardCap: MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.FREE,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.FREE,
    filesAlertThreshold: FILES_ALERT_THRESHOLD_BY_PLAN.FREE,
    maxVideoCount: MAX_VIDEO_COUNT_BY_PLAN.FREE,
    maxVideoSizeMB: MAX_VIDEO_SIZE_MB_BY_PLAN.FREE,
    // ── Equipe & Perfil
    teamMembers: 0,
    profileLevel: 'basic',
    profileCarouselLimit: 0,
    profileListLimit: 3,
    removeBranding: false,
    // ── Leads
    canCaptureLeads: false,
    canExportLeads: false,
    canAccessStats: false,
    canAccessNotifyEvents: false,
    canCustomWhatsApp: false,
    socialDisplayLevel: 'minimal',
    // ── Galeria
    maxCoverPerGallery: 1,
    canFavorite: false,
    canDownloadFavoriteSelection: false,
    canShowSlideshow: false,
    maxGridColumns: 3,
    canTagPhotos: 0,
    maxTags: 0,
    tagSelectionMode: 'manual',
    tagSelectionFavoriteMode: 'single',
    // ── Entrega & Segurança
    zipSizeLimit: '500KB',
    zipSizeLimitBytes: 500 * 1024,
    maxExternalLinks: 0,
    canCustomLinkLabel: false,
    privacyLevel: 'public',
    expiresAt: false,
    keepOriginalFilenames: false,
    customizationLevel: false,
    canCustomCategories: false,
  },
  START: {
    // ── Capacidade
    photoCredits: PHOTO_CREDITS_BY_PLAN.START,
    storageGB: STORAGE_GB_BY_PLAN.START,
    maxGalleries: getBaseGalleriesFromPool('START'),
    maxGalleriesHardCap: MAX_GALLERIES_HARD_CAP_BY_PLAN.START,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.START,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.START,
    filesAlertThreshold: FILES_ALERT_THRESHOLD_BY_PLAN.START,
    maxVideoCount: MAX_VIDEO_COUNT_BY_PLAN.START,
    maxVideoSizeMB: MAX_VIDEO_SIZE_MB_BY_PLAN.START,
    // ── Equipe & Perfil
    teamMembers: 0,
    profileLevel: 'standard',
    profileCarouselLimit: 1,
    profileListLimit: 10,
    removeBranding: false,
    // ── Leads
    canCaptureLeads: false,
    canExportLeads: false,
    canAccessStats: false,
    canAccessNotifyEvents: false,
    canCustomWhatsApp: false,
    socialDisplayLevel: 'social',
    // ── Galeria
    maxCoverPerGallery: 1,
    canFavorite: true,
    canDownloadFavoriteSelection: false,
    canShowSlideshow: false,
    maxGridColumns: 4,
    canTagPhotos: 0,
    maxTags: 0,
    tagSelectionMode: 'manual',
    tagSelectionFavoriteMode: 'single',
    // ── Entrega & Segurança
    zipSizeLimit: '1.5MB',
    zipSizeLimitBytes: Math.round(1.5 * 1024 * 1024),
    maxExternalLinks: 1,
    canCustomLinkLabel: false,
    privacyLevel: 'password',
    expiresAt: false,
    keepOriginalFilenames: false,
    customizationLevel: false,
    canCustomCategories: false,
  },
  PLUS: {
    // ── Capacidade
    photoCredits: PHOTO_CREDITS_BY_PLAN.PLUS,
    storageGB: STORAGE_GB_BY_PLAN.PLUS,
    maxGalleries: getBaseGalleriesFromPool('PLUS'),
    maxGalleriesHardCap: MAX_GALLERIES_HARD_CAP_BY_PLAN.PLUS,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PLUS,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PLUS,
    filesAlertThreshold: FILES_ALERT_THRESHOLD_BY_PLAN.PLUS,
    maxVideoCount: MAX_VIDEO_COUNT_BY_PLAN.PLUS,
    maxVideoSizeMB: MAX_VIDEO_SIZE_MB_BY_PLAN.PLUS,
    // ── Equipe & Perfil
    teamMembers: 2,
    profileLevel: 'advanced',
    profileCarouselLimit: 1,
    profileListLimit: 20,
    removeBranding: false,
    // ── Leads
    canCaptureLeads: false,
    canExportLeads: false,
    canAccessStats: false,
    canAccessNotifyEvents: false,
    canCustomWhatsApp: false,
    socialDisplayLevel: 'social',
    // ── Galeria
    maxCoverPerGallery: 2,
    canFavorite: true,
    canDownloadFavoriteSelection: true,
    canShowSlideshow: false,
    maxGridColumns: 5,
    canTagPhotos: 7,
    maxTags: 7,
    tagSelectionMode: 'manual',
    tagSelectionFavoriteMode: 'single',
    // ── Entrega & Segurança
    zipSizeLimit: '2MB',
    zipSizeLimitBytes: 2 * 1024 * 1024,
    maxExternalLinks: 2,
    canCustomLinkLabel: false,
    privacyLevel: 'password',
    expiresAt: false,
    keepOriginalFilenames: true,
    customizationLevel: true,
    canCustomCategories: true,
  },
  PRO: {
    // ── Capacidade
    photoCredits: PHOTO_CREDITS_BY_PLAN.PRO,
    storageGB: STORAGE_GB_BY_PLAN.PRO,
    maxGalleries: getBaseGalleriesFromPool('PRO'),
    maxGalleriesHardCap: MAX_GALLERIES_HARD_CAP_BY_PLAN.PRO,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PRO,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PRO,
    filesAlertThreshold: FILES_ALERT_THRESHOLD_BY_PLAN.PRO,
    maxVideoCount: MAX_VIDEO_COUNT_BY_PLAN.PRO,
    maxVideoSizeMB: MAX_VIDEO_SIZE_MB_BY_PLAN.PRO,
    // ── Equipe & Perfil
    teamMembers: 5,
    profileLevel: 'seo',
    profileCarouselLimit: 3,
    profileListLimit: 'unlimited',
    removeBranding: false,
    // ── Leads
    canCaptureLeads: true,
    canExportLeads: true,
    canAccessStats: true,
    canAccessNotifyEvents: true,
    canCustomWhatsApp: true,
    socialDisplayLevel: 'full',
    // ── Galeria
    maxCoverPerGallery: 3,
    canFavorite: true,
    canDownloadFavoriteSelection: true,
    canShowSlideshow: true,
    maxGridColumns: 8,
    canTagPhotos: 12,
    maxTags: 15,
    tagSelectionMode: 'bulk',
    tagSelectionFavoriteMode: 'multiple',
    // ── Entrega & Segurança
    zipSizeLimit: '3MB',
    zipSizeLimitBytes: 3 * 1024 * 1024,
    maxExternalLinks: 5,
    canCustomLinkLabel: true,
    privacyLevel: 'password',
    expiresAt: true,
    keepOriginalFilenames: true,
    customizationLevel: true,
    canCustomCategories: true,
  },
  PREMIUM: {
    // ── Capacidade
    photoCredits: PHOTO_CREDITS_BY_PLAN.PREMIUM,
    storageGB: STORAGE_GB_BY_PLAN.PREMIUM,
    maxGalleries: getBaseGalleriesFromPool('PREMIUM'),
    maxGalleriesHardCap: MAX_GALLERIES_HARD_CAP_BY_PLAN.PREMIUM,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PREMIUM,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PREMIUM,
    filesAlertThreshold: FILES_ALERT_THRESHOLD_BY_PLAN.PREMIUM,
    maxVideoCount: MAX_VIDEO_COUNT_BY_PLAN.PREMIUM,
    maxVideoSizeMB: MAX_VIDEO_SIZE_MB_BY_PLAN.PREMIUM,
    // ── Equipe & Perfil
    teamMembers: 99,
    profileLevel: 'seo',
    profileCarouselLimit: 5,
    profileListLimit: 'unlimited',
    removeBranding: true,
    // ── Leads
    canCaptureLeads: true,
    canExportLeads: true,
    canAccessStats: true,
    canAccessNotifyEvents: true,
    canCustomWhatsApp: true,
    socialDisplayLevel: 'full',
    // ── Galeria
    maxCoverPerGallery: 5,
    canFavorite: true,
    canDownloadFavoriteSelection: true,
    canShowSlideshow: true,
    maxGridColumns: 8,
    canTagPhotos: 30,
    maxTags: 50,
    tagSelectionMode: 'drive',
    tagSelectionFavoriteMode: 'multiple',
    // ── Entrega & Segurança
    zipSizeLimit: '3MB',
    zipSizeLimitBytes: 3 * 1024 * 1024,
    maxExternalLinks: 10,
    canCustomLinkLabel: true,
    privacyLevel: 'password',
    expiresAt: true,
    keepOriginalFilenames: true,
    customizationLevel: true,
    canCustomCategories: true,
  },
};

// ── Mapa: limite do ZIP em bytes → resolução (px) para download ─────────────
// Usado em PhotoGrid para decidir resolução ao baixar fotos no ZIP.
const KB = 1024;
const MB = KB * 1024;
export const ZIP_LIMIT_TO_RESOLUTION: Record<number, number> = {
  [500 * KB]: 1080, // 500KB → 1080 (FREE)
  [1 * MB]: 1600, // 1MB   → 1600 (START)
  [1.5 * MB]: 2048, // 1.5MB → 2048 (PLUS)
  [2 * MB]: 2560, // 2MB   → 2560 (PRO)
  [3 * MB]: 4000, // 3MB   → 4000 (PREMIUM)
};

// =============================================================================
// FEATURE DESCRIPTIONS (para UpgradeModal e PlanGuard)
// =============================================================================

export const FEATURE_DESCRIPTIONS: Record<
  keyof PlanPermissions,
  {
    label: string;
    description: string;
    previewUrl?: string;
    previewType?: 'image' | 'video';
  }
> = {
  photoCredits: {
    label: 'Cota de arquivos',
    description:
      'Limite de fotos e vídeos que o sistema pode processar e exibir do seu Google Drive. Os arquivos permanecem no Drive; a cota refere-se ao vínculo e exibição na plataforma.',
  },
  storageGB: {
    label: 'Capacidade',
    description:
      'Equivalente em capacidade de armazenamento para suporte à cota de arquivos.',
  },
  maxGalleries: {
    label: 'Limite de Galerias',
    description:
      'Aumente o número de galerias ativas simultaneamente em sua conta.',
  },
  maxGalleriesHardCap: {
    label: 'Teto de Galerias',
    description:
      'Limite absoluto de galerias independente da cota de arquivos.',
  },
  maxPhotosPerGallery: {
    label: 'Capacidade por Galeria',
    description:
      'Aumente o limite de arquivos vinculados por galeria (processados do Drive).',
  },
  recommendedPhotosPerGallery: {
    label: 'Recomendado por Galeria',
    description:
      'Quantidade recomendada de arquivos por galeria para uso ideal da cota.',
  },
  filesAlertThreshold: {
    label: 'Alerta de Galeria',
    description: 'Aviso quando a galeria ultrapassa o uso recomendado.',
  },
  maxVideoCount: {
    label: 'Vídeos por Galeria',
    description: 'Número máximo de vídeos por galeria.',
  },
  maxVideoSizeMB: {
    label: 'Tamanho Máximo de Vídeo',
    description: 'Tamanho máximo por arquivo de vídeo em MB.',
  },
  teamMembers: {
    label: 'Membros de Equipe',
    description:
      'Adicione colaboradores para gerenciar suas galerias com você.',
  },
  profileLevel: {
    label: 'Perfil Profissional',
    description:
      'Desbloqueie Bio, Cidades, Áreas de Atuação e SEO no seu perfil.',
  },
  profileCarouselLimit: {
    label: 'Carrossel de Capa',
    description:
      'Personalize seu perfil com um carrossel de fotos profissionais.',
  },
  profileListLimit: {
    label: 'Exibição no Portfólio',
    description: 'Aumente o número de galerias visíveis no seu perfil público.',
  },
  removeBranding: {
    label: 'White Label',
    description:
      'Remova a marca do app do rodapé das galerias e perfil público.',
  },
  canCaptureLeads: {
    label: 'Cadastro de Visitantes',
    description: 'Solicite nome, WhatsApp e e-mail antes de liberar as fotos.',
  },
  canAccessStats: {
    label: 'Estatísticas da Galeria',
    description: 'Acesse estatísticas de visualizações, favoritos e downloads.',
  },
  canAccessNotifyEvents: {
    label: 'Notificações de Eventos',
    description:
      'Receba alertas quando a galeria for visualizada, compartilhada, etc.',
  },
  canExportLeads: {
    label: 'Exportação de Visitantes',
    description: 'Exporte sua base de visitantes em CSV, Excel ou PDF.',
  },
  socialDisplayLevel: {
    label: 'Links de Contato',
    description: 'Adicione botões para WhatsApp, Instagram e Website.',
  },
  maxCoverPerGallery: {
    label: 'Fotos de Capa',
    description: 'Crie carrosséis de impacto na capa das suas galerias.',
  },
  canFavorite: {
    label: 'Sistema de Favoritos',
    description: 'Permita que clientes selecionem e favoritem fotos.',
  },
  canDownloadFavoriteSelection: {
    label: 'Download de Seleção',
    description: 'Permita download filtrado apenas das fotos favoritadas.',
  },
  tagSelectionFavoriteMode: {
    label: 'Modo de Seleção de Favoritos',
    description: 'Selecione fotos individualmente ou em lote.',
  },
  canShowSlideshow: {
    label: 'Modo Slideshow',
    description: 'Habilite apresentação automática de fotos em tela cheia.',
  },
  maxGridColumns: {
    label: 'Colunas da Grade',
    description: 'Mais liberdade para organizar o layout das fotos.',
  },
  canTagPhotos: {
    label: 'Marcações (Tags)',
    description: 'Crie marcações e filtros personalizados em galerias.',
  },
  maxTags: {
    label: 'Limite de Tags',
    description: 'Número máximo de tags por galeria.',
  },
  tagSelectionMode: {
    label: 'Organização em Lote',
    description: 'Organize fotos via pastas do Drive ou seleções em massa.',
  },
  zipSizeLimit: {
    label: 'Qualidade de Download',
    description: 'Libere downloads em alta definição para seus clientes.',
  },
  zipSizeLimitBytes: {
    label: 'Limite do ZIP (bytes)',
    description:
      'Limite em bytes para qualidade do download em ZIP (uso interno).',
  },
  maxExternalLinks: {
    label: 'Links de Entrega',
    description: 'Adicione botões externos para download de arquivos pesados.',
  },
  canCustomLinkLabel: {
    label: 'Nomes de Links Customizados',
    description: 'Dê nomes personalizados aos seus links de entrega.',
  },
  privacyLevel: {
    label: 'Proteção por Senha',
    description: 'Aumente a segurança das suas galerias com senhas.',
  },
  expiresAt: {
    label: 'Data de Expiração',
    description: 'Defina data para expiração automática do acesso à galeria.',
  },
  keepOriginalFilenames: {
    label: 'Preservar Nomes Originais',
    description: 'Mantenha os nomes originais dos arquivos no download.',
  },
  customizationLevel: {
    label: 'Personalização Visual',
    description: 'Escolha até 7 temas para criar galerias exclusivas.',
  },
  canCustomWhatsApp: {
    label: 'WhatsApp Customizado',
    description: 'Edite os templates das mensagens enviadas aos clientes.',
  },
  canCustomCategories: {
    label: 'Categorias Próprias',
    description: 'Crie nomes de categorias fora do padrão do sistema.',
  },
  isTrial: {
    label: 'Período de Teste',
    description: 'Acesso temporário a recursos premium durante o trial.',
  },
};

export type PlanBenefitItem = {
  label: string;
  description: string;
  isPremium?: boolean;
};

/** Termos mínimos para montar labels (ex: "galerias" via terms.items). */
export type PlanBenefitsTerms = { items: string };

/**
 * Retorna a lista de benefícios de um plano (capacidade + recursos disponíveis).
 * Usado no UpgradeModal e no UpgradeSheet para exibição consistente.
 */
export function getPlanBenefits(
  perms: PlanPermissions,
  terms: PlanBenefitsTerms,
): PlanBenefitItem[] {
  const storageLabel =
    perms.storageGB >= 1_000
      ? `${(perms.storageGB / 1_000).toFixed(perms.storageGB % 1_000 === 0 ? 0 : 1)} TB`
      : `${perms.storageGB} GB`;

  const capacityItems: PlanBenefitItem[] = [
    FEATURE_DESCRIPTIONS.maxGalleriesHardCap && {
      label: FEATURE_DESCRIPTIONS.maxGalleriesHardCap.label,
      description: `Até ${perms.maxGalleriesHardCap} galerias ativas`,
      isPremium:
        perms.maxGalleriesHardCap >
        PERMISSIONS_BY_PLAN.FREE.maxGalleriesHardCap,
    },
    FEATURE_DESCRIPTIONS.storageGB && {
      label: FEATURE_DESCRIPTIONS.storageGB.label,
      description: `Equivalente a ${storageLabel} de capacidade`,
      isPremium: perms.storageGB > PERMISSIONS_BY_PLAN.FREE.storageGB,
    },
    FEATURE_DESCRIPTIONS.maxPhotosPerGallery && {
      label: FEATURE_DESCRIPTIONS.maxPhotosPerGallery.label,
      description: `Até ${perms.maxPhotosPerGallery} arquivos vinculados por galeria`,
      isPremium:
        perms.maxPhotosPerGallery >
        PERMISSIONS_BY_PLAN.FREE.maxPhotosPerGallery,
    },
    FEATURE_DESCRIPTIONS.maxVideoCount && {
      label: FEATURE_DESCRIPTIONS.maxVideoCount.label,
      description: `${perms.maxVideoCount} vídeo${perms.maxVideoCount !== 1 ? 's' : ''} por galeria`,
      isPremium: perms.maxVideoCount > PERMISSIONS_BY_PLAN.FREE.maxVideoCount,
    },
  ].filter(Boolean) as PlanBenefitItem[];

  const featureKeys: (keyof PlanPermissions)[] = [
    //'teamMembers',
    'profileLevel',
    'profileCarouselLimit',
    'profileListLimit',
    'canCaptureLeads',
    'canAccessNotifyEvents',
    'canAccessStats',
    'canCustomWhatsApp',
    'canTagPhotos',
    'customizationLevel',
    'canCustomCategories',
  ];

  const featureItems: PlanBenefitItem[] = featureKeys
    .filter((key) => {
      const value = perms[key];
      //if (key === 'teamMembers') return typeof value === 'number' && value > 0;
      if (typeof value === 'number') return value > 0;
      // customizationLevel é boolean (true = tem temas; false = não tem)
      if (key === 'customizationLevel') return value === true;
      return !!value;
    })
    .map((key): PlanBenefitItem | null => {
      const meta = FEATURE_DESCRIPTIONS[key];
      const isPremium =
        typeof perms[key] === 'number'
          ? (perms[key] as number) > (PERMISSIONS_BY_PLAN.FREE[key] as number)
          : perms[key] !== PERMISSIONS_BY_PLAN.FREE[key];
      return meta
        ? { label: meta.label, description: meta.description, isPremium }
        : null;
    })
    .filter((b): b is PlanBenefitItem => !!b);

  return [...capacityItems, ...featureItems];
}

/** Chaves de recursos exibidos como benefícios (mesma lista de getPlanBenefits). */
const PLAN_FEATURE_KEYS: (keyof PlanPermissions)[] = [
  'profileLevel',
  'profileCarouselLimit',
  'profileListLimit',
  'canCaptureLeads',
  'canAccessNotifyEvents',
  'canAccessStats',
  'canCustomWhatsApp',
  'canTagPhotos',
  'customizationLevel',
  'canCustomCategories',
];

/**
 * Retorna os rótulos dos recursos PRO que são perdidos no downgrade para FREE.
 * Usado no dropdown de trial na Navbar para listar o que será desabilitado.
 */
export function getProOnlyFeatureLabels(): string[] {
  const pro = PERMISSIONS_BY_PLAN.PRO;
  const free = PERMISSIONS_BY_PLAN.FREE;
  const labels: string[] = [];
  for (const key of PLAN_FEATURE_KEYS) {
    const proVal = pro[key];
    const freeVal = free[key];
    const hasInPro =
      typeof proVal === 'number'
        ? proVal > 0
        : key === 'customizationLevel'
          ? proVal === true
          : !!proVal;
    const hasInFree =
      typeof freeVal === 'number'
        ? freeVal > 0
        : key === 'customizationLevel'
          ? freeVal === true
          : !!freeVal;
    if (hasInPro && !hasInFree) {
      const meta = FEATURE_DESCRIPTIONS[key];
      if (meta?.label) labels.push(meta.label);
    }
  }
  // Recursos adicionais PRO (não em getPlanBenefits) que fazem sentido citar no trial
  if (pro.canFavorite && !free.canFavorite && FEATURE_DESCRIPTIONS.canFavorite)
    labels.push(FEATURE_DESCRIPTIONS.canFavorite.label);
  if (
    pro.canExportLeads &&
    !free.canExportLeads &&
    FEATURE_DESCRIPTIONS.canExportLeads
  )
    labels.push(FEATURE_DESCRIPTIONS.canExportLeads.label);
  if (
    pro.removeBranding &&
    !free.removeBranding &&
    FEATURE_DESCRIPTIONS.removeBranding
  )
    labels.push(FEATURE_DESCRIPTIONS.removeBranding.label);
  return labels;
}

// =============================================================================
// PLAN INFO (preços, ícones, CTAs)
// =============================================================================

export interface PlanInfo {
  name: string;
  price: number;
  yearlyPrice: number;
  /** Preço mensal equivalente no plano semestral (12% off). */
  semesterPrice: number;
  maxGalleries: number;
  storageLabel: string; // ex: "25 GB", "500 GB", "2 TB"
  icon: any;
  cta: string;
  permissions: PlanPermissions;
}

/** Período de cobrança no UpgradeSheet e exibição de preços. */
export type BillingPeriod = 'monthly' | 'semiannual' | 'annual';

/** Desconto adicional (em %) no pagamento via PIX para períodos semestral e anual. */
export const PIX_DISCOUNT_PERCENT = 5;

/**
 * Retorna preço mensal efetivo, total e desconto por período.
 * Fonte da verdade: valores de PlanInfo (price, semesterPrice, yearlyPrice).
 * No PIX, semestral e anual têm desconto adicional de PIX_DISCOUNT_PERCENT % — use getPixAdjustedTotal para o valor final.
 */
export function getPeriodPrice(
  planInfo: PlanInfo,
  period: BillingPeriod,
): {
  effectiveMonthly: number;
  totalPrice: number;
  discount: number;
  months: number;
} {
  if (period === 'monthly') {
    return {
      effectiveMonthly: planInfo.price,
      totalPrice: planInfo.price,
      discount: 0,
      months: 1,
    };
  }
  if (period === 'semiannual') {
    const effectiveMonthly = planInfo.semesterPrice;
    return {
      effectiveMonthly,
      totalPrice: effectiveMonthly * 6,
      discount: planInfo.price > 0 ? 12 : 0, // 12% off (exibição fixa; valores já em PlanInfo)
      months: 6,
    };
  }
  // annual
  const effectiveMonthly = planInfo.yearlyPrice;
  return {
    effectiveMonthly,
    totalPrice: effectiveMonthly * 12,
    discount: planInfo.price > 0 ? 20 : 0, // 20% off (exibição fixa; valores já em PlanInfo)
    months: 12,
  };
}

/**
 * Valor total com desconto PIX aplicado (10% para semestral e anual).
 * Para mensal, retorna o mesmo totalPrice do getPeriodPrice.
 */
export function getPixAdjustedTotal(
  planInfo: PlanInfo,
  period: BillingPeriod,
): {
  totalOriginal: number;
  discountAmount: number;
  totalWithPixDiscount: number;
} {
  const { totalPrice, months } = getPeriodPrice(planInfo, period);
  if (period === 'monthly') {
    return {
      totalOriginal: totalPrice,
      discountAmount: 0,
      totalWithPixDiscount: totalPrice,
    };
  }
  const discountAmount =
    Math.round(totalPrice * (PIX_DISCOUNT_PERCENT / 100) * 100) / 100;
  const totalWithPixDiscount =
    Math.round((totalPrice - discountAmount) * 100) / 100;
  return { totalOriginal: totalPrice, discountAmount, totalWithPixDiscount };
}

export const PLANS_BY_SEGMENT: Record<
  SegmentType,
  Record<PlanKey, PlanInfo>
> = {
  PHOTOGRAPHER: {
    FREE: {
      name: 'Free',
      price: 0,
      yearlyPrice: 0,
      semesterPrice: 0,
      maxGalleries: 3,
      storageLabel: '4,5 GB',
      icon: Zap,
      cta: 'Começar Grátis',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Start',
      price: 29,
      yearlyPrice: 23,
      semesterPrice: 26,
      maxGalleries: 10,
      storageLabel: '25 GB',
      icon: Rocket,
      cta: 'Evoluir',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Plus',
      price: 49,
      yearlyPrice: 39,
      semesterPrice: 43,
      maxGalleries: 20,
      storageLabel: '100 GB',
      icon: Star,
      cta: 'Crescer',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Pro',
      price: 79,
      yearlyPrice: 63,
      semesterPrice: 70,
      maxGalleries: 50,
      storageLabel: '500 GB',
      icon: Crown,
      cta: 'Dominar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Premium',
      price: 139, // Mensal
      yearlyPrice: 109, // Anual (20% desconto)
      semesterPrice: 119, // Semestral (12% desconto)
      maxGalleries: 200,
      storageLabel: '2 TB',
      icon: Sparkles,
      cta: 'Elite',
      permissions: PERMISSIONS_BY_PLAN.PREMIUM,
    },
  },
  EVENT: {
    FREE: {
      name: 'Free Trial',
      price: 0,
      yearlyPrice: 0,
      semesterPrice: 0,
      maxGalleries: 3,
      storageLabel: '4,5 GB',
      icon: Zap,
      cta: 'Testar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Event',
      price: 99,
      yearlyPrice: 79,
      semesterPrice: 87,
      maxGalleries: 10,
      storageLabel: '25 GB',
      icon: Rocket,
      cta: 'Iniciar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Plus',
      price: 159,
      yearlyPrice: 127,
      semesterPrice: 140,
      maxGalleries: 20,
      storageLabel: '100 GB',
      icon: Star,
      cta: 'Expandir',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Club',
      price: 249,
      yearlyPrice: 199,
      semesterPrice: 219,
      maxGalleries: 50,
      storageLabel: '500 GB',
      icon: Crown,
      cta: 'Assinar Club',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Enterprise',
      price: 499,
      yearlyPrice: 399,
      semesterPrice: 439,
      maxGalleries: 200,
      storageLabel: '2 TB',
      icon: Gem,
      cta: 'Experience',
      permissions: PERMISSIONS_BY_PLAN.PREMIUM,
    },
  },
  CAMPAIGN: {
    FREE: {
      name: 'Militante',
      price: 0,
      yearlyPrice: 0,
      semesterPrice: 0,
      maxGalleries: 3,
      storageLabel: '4,5 GB',
      icon: Shield,
      cta: 'Começar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Bronze',
      price: 199,
      yearlyPrice: 159,
      semesterPrice: 175,
      maxGalleries: 10,
      storageLabel: '25 GB',
      icon: Medal,
      cta: 'Plano Bronze',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Prata',
      price: 399,
      yearlyPrice: 319,
      semesterPrice: 351,
      maxGalleries: 20,
      storageLabel: '100 GB',
      icon: Award,
      cta: 'Plano Prata',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Ouro',
      price: 799,
      yearlyPrice: 639,
      semesterPrice: 703,
      maxGalleries: 50,
      storageLabel: '500 GB',
      icon: Crown,
      cta: 'Plano Ouro',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Majoritário',
      price: 1499,
      yearlyPrice: 1199,
      semesterPrice: 1319,
      maxGalleries: 200,
      storageLabel: '2 TB',
      icon: Sparkles,
      cta: 'Plano VIP',
      permissions: PERMISSIONS_BY_PLAN.PREMIUM,
    },
  },
  OFFICE: {
    FREE: {
      name: 'Básico',
      price: 0,
      yearlyPrice: 0,
      semesterPrice: 0,
      maxGalleries: 3,
      storageLabel: '4,5 GB',
      icon: Layout,
      cta: 'Começar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Essential',
      price: 149,
      yearlyPrice: 119,
      semesterPrice: 131,
      maxGalleries: 10,
      storageLabel: '25 GB',
      icon: Rocket,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Advanced',
      price: 299,
      yearlyPrice: 239,
      semesterPrice: 263,
      maxGalleries: 20,
      storageLabel: '100 GB',
      icon: Star,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Mandato',
      price: 599,
      yearlyPrice: 479,
      semesterPrice: 527,
      maxGalleries: 50,
      storageLabel: '500 GB',
      icon: Crown,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Vanguard',
      price: 999,
      yearlyPrice: 799,
      semesterPrice: 879,
      maxGalleries: 200,
      storageLabel: '2 TB',
      icon: Sparkles,
      cta: 'Assinar VIP',
      permissions: PERMISSIONS_BY_PLAN.PREMIUM,
    },
  },
};

// =============================================================================
// COMMON FEATURES (tabela comparativa de planos)
// =============================================================================

/**
 * Gera um array de valores para a tabela de comparação a partir de uma constante
 * de limites, com uma função de formatação opcional.
 */
function getComparisonValues<T>(
  source: Record<PlanKey, T>,
  formatter: (value: T, planKey: PlanKey) => string,
): string[] {
  return planOrder.map((planKey) => formatter(source[planKey], planKey));
}

/** Formata números grandes com "mil" e sufixo. */
const formatNumber =
  (suffix = '') =>
  (value: number) => {
    const num = Number(value);
    if (num >= 1000) {
      return `${num / 1000} mil${suffix}`;
    }
    return `${num}${suffix}`;
  };

/** Formata GB, convertendo para TB se necessário. */
const formatGB = (value: number) => {
  if (value >= 1000) {
    return `${value / 1000} TB`;
  }
  return `${value} GB`;
};

export const COMMON_FEATURES = [
  // --- GESTÃO ---
  {
    key: 'maxGalleries',
    group: 'Gestão',
    label: 'Galerias Ativas',
    values: getComparisonValues(MAX_GALLERIES_HARD_CAP_BY_PLAN, (v) =>
      String(v),
    ),
  },
  {
    key: 'storageGB',
    group: 'Gestão',
    label: 'Cota de Arquivos',
    values: getComparisonValues(STORAGE_GB_BY_PLAN, (v) => formatGB(v)),
  },
  {
    key: 'maxPhotosPerGallery',
    group: 'Gestão',
    label: 'Capacidade por Galeria',
    values: getComparisonValues(MAX_PHOTOS_PER_GALLERY_BY_PLAN, (v) =>
      formatNumber(' arq.')(v),
    ),
  },
  {
    key: 'maxVideoCount',
    group: 'Gestão',
    label: 'Vídeos por Galeria',
    values: getComparisonValues(MAX_VIDEO_COUNT_BY_PLAN, (count, planKey) => {
      const size = MAX_VIDEO_SIZE_MB_BY_PLAN[planKey];
      const plural = count !== 1 ? 's' : '';
      return `${count} vídeo${plural} (até ${size}MB)`;
    }),
  },
  {
    key: 'canAccessStats',
    group: 'Gestão',
    label: 'Estatísticas',
    values: [false, false, false, 'Ativadas', 'Ativadas'],
  },
  {
    key: 'canAccessNotifyEvents',
    group: 'Gestão',
    label: 'Notificações de Eventos',
    values: [false, false, false, 'Ativadas', 'Ativadas'],
  },
  // {
  //   key: 'teamMembers',
  //   group: 'Gestão',
  //   label: 'Equipe de Trabalho',
  //   values: [
  //     'Apenas Titular',
  //     'Apenas Titular',
  //     '+ 2 Colaboradores',
  //     '+ 5 Colaboradores',
  //     'Ilimitados',
  //   ],
  // },
  // --- PERFIL PÚBLICO ---
  {
    key: 'profileLevel',
    group: 'Perfil Público',
    label: 'Perfil Profissional',
    values: [
      'Avatar + Nome',
      '+ Bio + Localização',
      '+ Áreas de Atuação',
      '+ Subdomínio + SEO',
      '+ Subdomínio + SEO',
    ],
  },
  {
    key: 'profileCarouselLimit',
    group: 'Perfil Público',
    label: 'Capa do Perfil',
    values: [
      'Imagem Padrão',
      '1 Foto',
      '1 Foto',
      'Carrossel (3 fotos)',
      'Carrossel (5 fotos)',
    ],
  },
  {
    key: 'profileListLimit',
    group: 'Perfil Público',
    label: 'Catálogo de Galerias',
    values: [
      'Exibir até 3',
      'Exibir até 10',
      'Exibir até 20',
      'Portfólio Completo',
      '+ Busca e Filtros',
    ],
  },
  {
    key: 'removeBranding',
    group: 'Perfil Público',
    label: 'Branding (Rodapé)',
    values: [
      'Marca do App',
      'Marca do App',
      'Identidade do Autor',
      'Identidade do Autor',
      'White Label',
    ],
  },
  // --- CADASTRO DE VISITANTES ---
  {
    key: 'canCaptureLeads',
    group: 'Cadastro de Visitantes',
    label: 'Formulário de Acesso',
    values: [
      false,
      false,
      false,
      'Nome, e-Mail e WhatsApp',
      'Nome, e-Mail e WhatsApp',
    ],
  },
  {
    key: 'canExportLeads',
    group: 'Cadastro de Visitantes',
    label: 'Gestão de Contatos',
    values: [
      false,
      false,
      false,
      'Exportação CSV/XLS/PDF',
      'Exportação CSV/XLS/PDF',
    ],
  },
  {
    key: 'canCustomWhatsApp',
    group: 'Cadastro de Visitantes',
    label: 'Mensagens de WhatsApp',
    values: [
      'Templates Padrão',
      'Templates Padrão',
      '+ Edição Customizada',
      '+ Edição Customizada',
      '+ Edição Customizada',
    ],
  },
  // --- EXPERIÊNCIA DO VISITANTE ---
  {
    key: 'socialDisplayLevel',
    group: 'Experiência do Visitante',
    label: 'Contato no Perfil',
    values: [
      'Avatar + Link',
      '+ WhatsApp',
      '+ Instagram',
      '+ Website Direto',
      '+ Website Direto',
    ],
  },
  {
    key: 'maxCoverPerGallery',
    group: 'Experiência do Visitante',
    label: 'Capa da Galeria',
    values: [
      '1 Foto',
      '1 Foto',
      'Carrossel (2)',
      'Carrossel (3)',
      'Carrossel (5)',
    ],
  },
  {
    key: 'canFavorite',
    group: 'Experiência do Visitante',
    label: 'Interação com Fotos',
    values: [
      'Visualização',
      '+ Favoritar',
      '+ Filtro de Favoritas',
      '+ Filtro de Favoritas',
      '+ Filtro de Favoritas',
    ],
  },
  {
    key: 'canShowSlideshow',
    group: 'Experiência do Visitante',
    label: 'Recursos do Slider',
    values: [
      'Download Simples',
      '+ Alta Qualidade',
      '+ Favoritar na Tela',
      '+ Modo Slideshow',
      '+ Modo Slideshow',
    ],
  },
  {
    key: 'canTagPhotos',
    group: 'Experiência do Visitante',
    label: 'Organização de Fotos',
    values: [false, false, false, 'Tags e Filtros', 'Tags e Filtros'],
  },
  {
    key: 'maxGridColumns',
    group: 'Experiência do Visitante',
    label: 'Personalização da Grade',
    values: [
      'Fixo (3 colunas)',
      'Escolha (3 ou 4)',
      'Escolha (3 a 5)',
      'Até 8 colunas',
      'Até 8 colunas',
    ],
  },
  {
    key: 'customizationLevel',
    group: 'Experiência do Visitante',
    label: 'Design da Interface',
    values: [
      'Tema Editorial',
      'Tema Editorial',
      '+ 7 Temas',
      '+ 7 Temas',
      '+ 7 Temas',
    ],
  },
  // --- ENTREGA & SEGURANÇA ---
  {
    key: 'zipSizeLimit',
    group: 'Entrega de fotos e vídeos',
    label: 'Download ZIP — Tamanho/foto',
    values: [
      'Até 500KB',
      'Até 1,5MB (Otimizado)',
      'Até 2MB',
      'Até 3MB (HD)',
      'Até 3MB (Full-Res)',
    ],
  },
  {
    key: 'maxExternalLinks',
    group: 'Entrega de fotos e vídeos',
    label: 'Links de Download Externos',
    values: [false, '1 Link', '2 Links', 'Até 5 Links', 'Até 10 Links'],
  },
  {
    key: 'keepOriginalFilenames',
    group: 'Entrega de fotos e vídeos',
    label: 'Preservação de Nomes',
    values: [
      'Sequenciais',
      'Sequenciais',
      'Nomes Originais',
      'Nomes Originais',
      'Nomes Originais',
    ],
  },
  {
    key: 'privacyLevel',
    group: 'Segurança',
    label: 'Controle de Acesso',
    values: [
      'Link Público',
      'Proteção por Senha',
      'Proteção por Senha',
      'Proteção por Senha',
      'Proteção por Senha',
    ],
  },
  {
    key: 'expiresAt',
    group: 'Segurança',
    label: 'Data de Expiração',
    values: [false, false, false, 'Ativa', 'Ativa'],
  },
];

// =============================================================================
// HELPERS
// =============================================================================

export function findNextPlanWithFeature(
  currentPlanKey: PlanKey,
  featureName: keyof PlanPermissions,
  segment: SegmentType = 'PHOTOGRAPHER',
): PlanKey {
  const currentPlanIndex = planOrder.indexOf(currentPlanKey);
  if (currentPlanIndex === -1) return 'PREMIUM';

  const levelWeights: Record<string, number> = {
    basic: 1,
    standard: 2,
    advanced: 3,
    seo: 4,
    minimal: 1,
    social: 2,
    full: 3,
    manual: 1,
    bulk: 2,
    drive: 3,
    default: 1,
    colors: 2,
    'full-custom': 3,
  };

  const currValue = PERMISSIONS_BY_PLAN[currentPlanKey][featureName];

  for (let i = currentPlanIndex + 1; i < planOrder.length; i++) {
    const planKey = planOrder[i];
    const nextValue = PERMISSIONS_BY_PLAN[planKey][featureName];

    // Bool: only suggest upgrade when current is false and next is true
    if (
      typeof nextValue === 'boolean' &&
      nextValue === true &&
      currValue !== true
    )
      return planKey;

    if (
      typeof nextValue === 'number' &&
      typeof currValue === 'number' &&
      nextValue > currValue
    )
      return planKey;
    if (nextValue === 'unlimited' && currValue !== 'unlimited') return planKey;
    if (typeof nextValue === 'string' && typeof currValue === 'string') {
      // privacyLevel: qualquer mudança de "nível" já habilita a feature
      if (featureName === 'privacyLevel') {
        if (nextValue !== currValue) return planKey;
      } else if (
        (levelWeights[nextValue] || 0) > (levelWeights[currValue] || 0)
      )
        return planKey;
    }
  }

  // Se nenhum plano acima tiver um nível melhor para essa feature,
  // mantemos o plano atual (não sugerir upgrade inexistente/superior).
  return currentPlanKey;
}

export const resolveGalleryLimitByPlan = (planKey?: string): number => {
  const normalizedKey = (planKey?.toUpperCase() as PlanKey) || 'FREE';
  return PERMISSIONS_BY_PLAN[normalizedKey]?.maxGalleries || 1;
};

export function getPlansByDomain(hostname: string) {
  const SITE_CONFIG = {
    'suagaleria.com.br': {
      segment: 'PHOTOGRAPHER',
      theme: 'gold',
      name: 'Sua Galeria',
    },
    'naselfie.com.br': { segment: 'EVENT', theme: 'neon', name: 'Na Selfie' },
    'emcampanha.com.br': {
      segment: 'CAMPAIGN',
      theme: 'red',
      name: 'Em Campanha',
    },
    'emmandato.com.br': {
      segment: 'OFFICE',
      theme: 'blue',
      name: 'Em Mandato',
    },
  } as const;

  const config =
    SITE_CONFIG[hostname as keyof typeof SITE_CONFIG] ||
    SITE_CONFIG['suagaleria.com.br'];
  return { ...config, plans: PLANS_BY_SEGMENT[config.segment as SegmentType] };
}

export function findNextPlanKeyWithFeature(
  currentPlanKey: PlanKey,
  featureName: keyof PlanPermissions,
): PlanKey {
  const currentIndex = planOrder.indexOf(currentPlanKey);
  if (currentIndex === -1) return 'PREMIUM';

  const levelWeights: Record<string, number> = {
    basic: 1,
    standard: 2,
    advanced: 3,
    seo: 4,
    minimal: 1,
    social: 2,
    full: 3,
    manual: 1,
    bulk: 2,
    drive: 3,
    default: 1,
    colors: 2,
    'full-custom': 3,
    public: 1,
    password: 2,
  };

  for (let i = currentIndex + 1; i < planOrder.length; i++) {
    const planKey = planOrder[i];
    const nextValue = PERMISSIONS_BY_PLAN[planKey][featureName];
    const currValue = PERMISSIONS_BY_PLAN[currentPlanKey][featureName];

    if (typeof nextValue === 'boolean' && nextValue) return planKey;
    if (
      typeof nextValue === 'number' &&
      typeof currValue === 'number' &&
      nextValue > currValue
    )
      return planKey;
    if (nextValue === 'unlimited' && currValue !== 'unlimited') return planKey;
    if (typeof nextValue === 'string' && typeof currValue === 'string') {
      if ((levelWeights[nextValue] || 0) > (levelWeights[currValue] || 0))
        return planKey;
    }
  }

  return 'PREMIUM';
}
