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

// =============================================================================
// 🎫 SISTEMA DE CAPACIDADE FLEXÍVEL
//
// Quatro camadas de controle:
//
//   1. photoCredits                  → pool global de arquivos (fotos + vídeos)
//   2. storageGB                     → capacidade em GB (informativo, exibido na UI)
//   3. maxGalleries (base dinâmico)  → floor(photoCredits / recommendedPhotosPerGallery)
//                                      garante este número de galerias com pool cheio
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

// ── Pool de arquivos (fotos + vídeos) ─────────────────────────────────────────
export const PHOTO_CREDITS_BY_PLAN: Record<PlanKey, number> = {
  FREE: 450,
  START: 2_500,
  PLUS: 10_000,
  PRO: 50_000,
  PREMIUM: 200_000,
};

// ── Capacidade em GB (informativo, exibido nos cards de plano e sidebar) ──────
export const STORAGE_GB_BY_PLAN: Record<PlanKey, number> = {
  FREE: 4.5,
  START: 25,
  PLUS: 100,
  PRO: 500,
  PREMIUM: 2_000,
};

// ── Teto absoluto de galerias (nunca ultrapassado mesmo com pool sobrando) ────
export const MAX_GALLERIES_HARD_CAP_BY_PLAN: Record<PlanKey, number> = {
  FREE: 3,
  START: 12,
  PLUS: 30,
  PRO: 100,
  PREMIUM: 300,
};

// ── Hard cap por galeria (bloqueia upload ao atingir) ─────────────────────────
export const MAX_PHOTOS_PER_GALLERY_BY_PLAN: Record<PlanKey, number> = {
  FREE: 150, // = recommended (FREE não tem margem)
  START: 500,
  PLUS: 1_000,
  PRO: 1_500,
  PREMIUM: 3_000,
};

// ── Recomendado por galeria = pool / galBase ──────────────────────────────────
// Garante que, com pool cheio, o usuário tem exatamente maxGalleries disponíveis.
// Também é usado por calcEffectiveMaxGalleries para o cálculo dinâmico.
// FREE:    450 / 3   = 150
// START:   2500 / 10 = 250
// PLUS:    10000 / 20 = 500
// PRO:     50000 / 50 = 1000
// PREMIUM: 200000 / 200 = 1000
export const RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN: Record<PlanKey, number> = {
  FREE: 150,
  START: 250,
  PLUS: 500,
  PRO: 1_000,
  PREMIUM: 1_000,
};

// ── Threshold de alerta amarelo na galeria individual ─────────────────────────
// Aviso quando o usuário está "acima do recomendado" mas abaixo do hard cap.
// Vem da coluna "Arq. Rec." da planilha.
export const FILES_ALERT_THRESHOLD_BY_PLAN: Record<PlanKey, number> = {
  FREE: 150,
  START: 250,
  PLUS: 500,
  PRO: 750, // PRO: alerta em 750, bloqueia em 1500
  PREMIUM: 1_000,
};

// ── Vídeos ────────────────────────────────────────────────────────────────────
export const MAX_VIDEO_COUNT_BY_PLAN: Record<PlanKey, number> = {
  FREE: 1,
  START: 10,
  PLUS: 20,
  PRO: 50,
  PREMIUM: 100,
};

export const MAX_VIDEO_SIZE_MB_BY_PLAN: Record<PlanKey, number> = {
  FREE: 15,
  START: 50,
  PLUS: 100,
  PRO: 100,
  PREMIUM: 100,
};

// =============================================================================
// FUNÇÕES DE CÁLCULO
// =============================================================================

/**
 * Retorna o número base de galerias garantido pelo plano com pool cheio.
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
 * Fotógrafos que publicam menos arquivos por galeria se beneficiam
 * automaticamente: o pool "sobra" e permite mais galerias, até o hardCap.
 *
 * @param planKey            - Plano do usuário
 * @param usedCredits        - Total de arquivos publicados (soma de todas as galerias)
 * @param activeGalleryCount - Número atual de galerias ativas
 *
 * @example
 * // PRO, 10.000 arquivos em 10 galerias:
 * calcEffectiveMaxGalleries('PRO', 10_000, 10)
 * // remaining = 50.000 - 10.000 = 40.000
 * // fromPool  = floor(40.000 / 1.000) = 40
 * // total     = min(10 + 40, 90) = 50
 *
 * // PRO com pool quase esgotado (45.000 usados):
 * calcEffectiveMaxGalleries('PRO', 45_000, 10)
 * // remaining = 5.000, fromPool = 5
 * // total     = min(10 + 5, 90) = 15 → pool limita
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
  const galleriesFromPool = Math.floor(remainingCredits / recommended);

  return Math.min(activeGalleryCount + galleriesFromPool, hardCap);
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
  maxGalleries: number; // base garantido com pool cheio
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
  maxExternalLinks: number;
  canCustomLinkLabel: boolean;
  privacyLevel: 'public' | 'password';
  expiresAt: boolean | null;
  keepOriginalFilenames: boolean;
  customizationLevel: 'default' | 'colors' | 'full';
  canCustomCategories: boolean;
  isTrial?: boolean;
}

export const PERMISSIONS_BY_PLAN: Record<PlanKey, PlanPermissions> = {
  FREE: {
    // ── Capacidade
    photoCredits: 450,
    storageGB: 4.5,
    maxGalleries: 3,
    maxGalleriesHardCap: 3,
    maxPhotosPerGallery: 150,
    recommendedPhotosPerGallery: 150,
    filesAlertThreshold: 150,
    maxVideoCount: 1,
    maxVideoSizeMB: 15,
    // ── Equipe & Perfil
    teamMembers: 0,
    profileLevel: 'basic',
    profileCarouselLimit: 0,
    profileListLimit: 1,
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
    maxExternalLinks: 0,
    canCustomLinkLabel: false,
    privacyLevel: 'public',
    expiresAt: false,
    keepOriginalFilenames: false,
    customizationLevel: 'default',
    canCustomCategories: false,
  },
  START: {
    // ── Capacidade
    photoCredits: 2_500,
    storageGB: 25,
    maxGalleries: 10,
    maxGalleriesHardCap: 12,
    maxPhotosPerGallery: 500,
    recommendedPhotosPerGallery: 250,
    filesAlertThreshold: 250,
    maxVideoCount: 10,
    maxVideoSizeMB: 50,
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
    zipSizeLimit: '1MB',
    maxExternalLinks: 1,
    canCustomLinkLabel: false,
    privacyLevel: 'password',
    expiresAt: false,
    keepOriginalFilenames: false,
    customizationLevel: 'default',
    canCustomCategories: false,
  },
  PLUS: {
    // ── Capacidade
    photoCredits: 10_000,
    storageGB: 100,
    maxGalleries: 20,
    maxGalleriesHardCap: 30,
    maxPhotosPerGallery: 1_000,
    recommendedPhotosPerGallery: 500,
    filesAlertThreshold: 500,
    maxVideoCount: 20,
    maxVideoSizeMB: 100,
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
    zipSizeLimit: '1.5MB',
    maxExternalLinks: 2,
    canCustomLinkLabel: false,
    privacyLevel: 'password',
    expiresAt: false,
    keepOriginalFilenames: true,
    customizationLevel: 'colors',
    canCustomCategories: true,
  },
  PRO: {
    // ── Capacidade
    photoCredits: 50_000,
    storageGB: 500,
    maxGalleries: 50,
    maxGalleriesHardCap: 90,
    maxPhotosPerGallery: 1_500,
    recommendedPhotosPerGallery: 1_000, // pool / galBase = 50.000/50
    filesAlertThreshold: 750, // alerta amarelo antes do hard cap
    maxVideoCount: 50,
    maxVideoSizeMB: 100,
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
    zipSizeLimit: '2MB',
    maxExternalLinks: 5,
    canCustomLinkLabel: true,
    privacyLevel: 'password',
    expiresAt: true,
    keepOriginalFilenames: true,
    customizationLevel: 'colors',
    canCustomCategories: true,
  },
  PREMIUM: {
    // ── Capacidade
    photoCredits: 200_000,
    storageGB: 2_000,
    maxGalleries: 200,
    maxGalleriesHardCap: 300,
    maxPhotosPerGallery: 3_000,
    recommendedPhotosPerGallery: 1_000, // pool / galBase = 200.000/200
    filesAlertThreshold: 1_000,
    maxVideoCount: 100,
    maxVideoSizeMB: 100,
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
    maxExternalLinks: 10,
    canCustomLinkLabel: true,
    privacyLevel: 'password',
    expiresAt: true,
    keepOriginalFilenames: true,
    customizationLevel: 'full',
    canCustomCategories: true,
  },
};

// =============================================================================
// FEATURE DESCRIPTIONS (para UpgradeModal e PlanGuard)
// =============================================================================

export const FEATURE_DESCRIPTIONS: Record<
  keyof PlanPermissions,
  { label: string; description: string }
> = {
  photoCredits: {
    label: 'Créditos de Arquivos',
    description:
      'Pool total de fotos e vídeos distribuído entre suas galerias.',
  },
  storageGB: {
    label: 'Armazenamento',
    description: 'Capacidade total de armazenamento do seu plano.',
  },
  maxGalleries: {
    label: 'Limite de Galerias',
    description:
      'Aumente o número de galerias ativas simultaneamente em sua conta.',
  },
  maxGalleriesHardCap: {
    label: 'Teto de Galerias',
    description:
      'Limite absoluto de galerias independente do pool de arquivos.',
  },
  maxPhotosPerGallery: {
    label: 'Capacidade por Galeria',
    description: 'Aumente o limite de arquivos permitidos em cada galeria.',
  },
  recommendedPhotosPerGallery: {
    label: 'Recomendado por Galeria',
    description:
      'Quantidade recomendada de arquivos por galeria para uso ideal do pool.',
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
    label: 'Resolução de Download',
    description: 'Libere downloads em alta definição para seus clientes.',
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
    description: 'Altere cores e fundos para criar galerias exclusivas.',
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

// =============================================================================
// PLAN INFO (preços, ícones, CTAs)
// =============================================================================

export interface PlanInfo {
  name: string;
  price: number;
  yearlyPrice: number;
  maxGalleries: number;
  storageLabel: string; // ex: "25 GB", "500 GB", "2 TB"
  icon: any;
  cta: string;
  permissions: PlanPermissions;
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
      maxGalleries: 3,
      storageLabel: '4,5 GB',
      icon: Zap,
      cta: 'Começar Grátis',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Start',
      price: 29,
      yearlyPrice: 24,
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
      maxGalleries: 20,
      storageLabel: '100 GB',
      icon: Star,
      cta: 'Crescer',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Pro',
      price: 79,
      yearlyPrice: 74,
      maxGalleries: 50,
      storageLabel: '500 GB',
      icon: Crown,
      cta: 'Dominar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Premium',
      price: 119,
      yearlyPrice: 99,
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
      maxGalleries: 10,
      storageLabel: '25 GB',
      icon: Rocket,
      cta: 'Iniciar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Plus',
      price: 159,
      yearlyPrice: 129,
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
      maxGalleries: 10,
      storageLabel: '25 GB',
      icon: Medal,
      cta: 'Plano Bronze',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Prata',
      price: 399,
      yearlyPrice: 329,
      maxGalleries: 20,
      storageLabel: '100 GB',
      icon: Award,
      cta: 'Plano Prata',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Ouro',
      price: 799,
      yearlyPrice: 659,
      maxGalleries: 50,
      storageLabel: '500 GB',
      icon: Crown,
      cta: 'Plano Ouro',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Majoritário',
      price: 1499,
      yearlyPrice: 1249,
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
      maxGalleries: 10,
      storageLabel: '25 GB',
      icon: Rocket,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Advanced',
      price: 299,
      yearlyPrice: 249,
      maxGalleries: 20,
      storageLabel: '100 GB',
      icon: Star,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Mandato',
      price: 599,
      yearlyPrice: 499,
      maxGalleries: 50,
      storageLabel: '500 GB',
      icon: Crown,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Vanguard',
      price: 999,
      yearlyPrice: 829,
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

export const COMMON_FEATURES = [
  // --- GESTÃO ---
  {
    key: 'maxGalleries',
    group: 'Gestão',
    label: 'Galerias Ativas',
    values: ['3', '10', '20', '50', '200'],
  },
  {
    key: 'storageGB',
    group: 'Gestão',
    label: 'Armazenamento',
    values: ['4,5 GB', '25 GB', '100 GB', '500 GB', '2 TB'],
  },
  {
    key: 'maxPhotosPerGallery',
    group: 'Gestão',
    label: 'Capacidade por Galeria',
    values: ['150 arq.', '500 arq.', '1.000 arq.', '1.500 arq.', '3.000 arq.'],
  },
  {
    key: 'maxVideoCount',
    group: 'Gestão',
    label: 'Vídeos por Galeria',
    values: ['1 vídeo', '10 vídeos', '20 vídeos', '50 vídeos', '100 vídeos'],
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
  {
    key: 'teamMembers',
    group: 'Gestão',
    label: 'Equipe de Trabalho',
    values: [
      'Apenas Titular',
      'Apenas Titular',
      '+ 2 Colaboradores',
      '+ 5 Colaboradores',
      'Ilimitados',
    ],
  },
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
      'Exibir 1',
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
      '+ Alta Resolução',
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
      '+ Cores do Grid',
      '+ Cores do Grid',
      '+ Full Custom',
    ],
  },
  // --- ENTREGA & SEGURANÇA ---
  {
    key: 'zipSizeLimit',
    group: 'Entrega de Arquivos',
    label: 'Download ZIP — Tamanho/foto',
    values: [
      'Até 500KB',
      'Até 1MB (Otimizado)',
      'Até 1,5MB',
      'Até 2MB (HD)',
      'Até 3MB (Full-Res)',
    ],
  },
  {
    key: 'maxExternalLinks',
    group: 'Entrega de Arquivos',
    label: 'Links de Download Externos',
    values: [false, '1 Link', '2 Links', 'Até 5 Links', 'Até 10 Links'],
  },
  {
    key: 'keepOriginalFilenames',
    group: 'Entrega de Arquivos',
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

  for (let i = currentPlanIndex + 1; i < planOrder.length; i++) {
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
