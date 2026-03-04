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

export const FEATURE = {
  PHOTO_CREDITS: 'photoCredits',
  MAX_GALLERIES: 'maxGalleries',
  MAX_GALLERIES_HARD_CAP: 'maxGalleriesHardCap',
  MAX_PHOTOS_PER_GALLERY: 'maxPhotosPerGallery',
  RECOMMENDED_PHOTOS_PER_GALLERY: 'recommendedPhotosPerGallery',
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
} as const;

export type FeatureKey = (typeof FEATURE)[keyof typeof FEATURE];

export const FEATURE_DESCRIPTIONS: Partial<
  Record<keyof PlanPermissions, { label: string; description: string }>
> = {
  photoCredits: {
    label: 'Créditos de Fotos',
    description:
      'Pool total de fotos distribuído livremente entre suas galerias. Ao esgotar, novos uploads ficam bloqueados até upgrade ou exclusão.',
  },
  maxGalleries: {
    label: 'Galerias Ativas',
    description:
      'Número de galerias simultâneas baseado no seu pool de fotos e na quantidade recomendada por galeria. Fotógrafos que publicam menos fotos por galeria podem ter mais galerias ativas.',
  },
  maxGalleriesHardCap: {
    label: 'Limite Absoluto de Galerias',
    description:
      'Teto máximo de galerias independente do pool de fotos. Mesmo que o pool permita mais, este limite nunca é ultrapassado.',
  },
  maxPhotosPerGallery: {
    label: 'Fotos por Galeria (Máximo)',
    description:
      'Limite máximo de fotos por galeria individual. Ao atingir, novos uploads são bloqueados.',
  },
  recommendedPhotosPerGallery: {
    label: 'Fotos Recomendadas por Galeria',
    description:
      'Quantidade recomendada de fotos por galeria. Ao ultrapassar, um aviso é exibido. Também determina quantas galerias seu pool suporta.',
  },
  teamMembers: {
    label: 'Equipe de Trabalho',
    description:
      'Número de colaboradores que podem acessar e gerenciar o painel além do titular da conta.',
  },
  removeBranding: {
    label: 'White Label',
    description:
      'Remove a marca do app do rodapé das galerias. Suas entregas ficam com sua identidade visual exclusiva.',
  },
  canCaptureLeads: {
    label: 'Captura de Visitantes',
    description:
      'Exibe um formulário de acesso à galeria coletando nome, e-mail e WhatsApp do visitante antes de liberar as fotos.',
  },
  canAccessNotifyEvents: {
    label: 'Notificações de eventos da galeria',
    description:
      'Receba notificações quando a galeria for visualizada, compartilhada, baixada, etc.',
  },
  canExportLeads: {
    label: 'Exportar Contatos',
    description:
      'Permite exportar a lista de visitantes cadastrados em formato CSV, XLS ou PDF para uso em CRM ou campanhas.',
  },
  canCustomWhatsApp: {
    label: 'WhatsApp Customizado',
    description:
      'Edite os templates das mensagens automáticas de WhatsApp enviadas aos clientes com link da galeria.',
  },
  canShowSlideshow: {
    label: 'Modo Slideshow',
    description:
      'Habilita apresentação automática das fotos em tela cheia dentro do visualizador da galeria.',
  },
  canDownloadFavoriteSelection: {
    label: 'Download por Seleção',
    description:
      'Permite que o cliente baixe apenas as fotos marcadas como favoritas, sem precisar baixar a galeria inteira.',
  },
  zipSizeLimit: {
    label: 'Qualidade do ZIP',
    description:
      'Tamanho máximo por foto no download ZIP. Valores mais altos preservam melhor a resolução original das imagens.',
  },
  maxExternalLinks: {
    label: 'Links Externos',
    description:
      'Links de download direto para serviços externos (Google Drive, WeTransfer, Dropbox). Facilitam a entrega de arquivos em alta resolução.',
  },
  privacyLevel: {
    label: 'Controle de Acesso',
    description:
      'Define o nível de proteção da galeria: pública, privada (só com link), protegida por senha ou com link de expiração.',
  },
  expiresAt: {
    label: 'Data de Expiração',
    description:
      'Defina uma data para expiração do acesso à galeria. Após esta data, a galeria ficará indisponível para acesso.',
  },
  customizationLevel: {
    label: 'Personalização Visual',
    description:
      'Controla o nível de customização da interface da galeria: tema padrão, cores do grid ou fundo personalizado completo.',
  },
  keepOriginalFilenames: {
    label: 'Nomes de Arquivo',
    description:
      'Preserva os nomes originais dos arquivos no download. Sem este recurso, os arquivos recebem nomes sequenciais.',
  },
  tagSelectionMode: {
    label: 'Modo de Seleção',
    description:
      'Define como as fotos podem ser selecionadas: manual (uma a uma), em lote (múltiplas de vez) ou automático por pastas do Drive.',
  },
  canAccessStats: {
    label: 'Estatísticas',
    description:
      'Notificações de eventos em tempo real: visualizações, downloads, favoritos e acessos à galeria.',
  },
};

// =============================================================================
// 🎫 SISTEMA DE CAPACIDADE FLEXÍVEL
//
// Três camadas de controle para galerias:
//
//   1. photoCredits                → pool global de fotos (trava ao esgotar)
//   2. maxGalleries (dinâmico)     → floor(photoCredits / recommendedPhotosPerGallery)
//                                    fotógrafos com menos fotos/galeria têm mais galerias
//   3. maxGalleriesHardCap         → teto absoluto (nunca ultrapassado)
//   4. maxPhotosPerGallery         → hard cap por galeria (bloqueia ao atingir)
//   5. recommendedPhotosPerGallery → aviso amarelo antes do hard cap
//
// Runtime check:
//   const canCreate = calcEffectiveMaxGalleries(planKey, usedCredits, activeCount) > activeCount
//
// =============================================================================

export const PHOTO_CREDITS_BY_PLAN: Record<PlanKey, number> = {
  FREE: 450,
  START: 3_000,
  PLUS: 12_000,
  PRO: 40_000,
  PREMIUM: 200_000,
};

// Teto absoluto — nunca ultrapassado mesmo com pool sobrando
export const MAX_GALLERIES_HARD_CAP_BY_PLAN: Record<PlanKey, number> = {
  FREE: 3,
  START: 20,
  PLUS: 40,
  PRO: 100,
  PREMIUM: 400,
};

export const MAX_PHOTOS_PER_GALLERY_BY_PLAN: Record<PlanKey, number> = {
  FREE: 200,
  START: 450,
  PLUS: 800,
  PRO: 1_500,
  PREMIUM: 3_000,
};

// Base do cálculo do pool de galerias: floor(photoCredits / recommended)
// FREE:    450 / 150 = 3  | START: 3.000 / 300 = 10
// PLUS: 12.000 / 600 = 20 | PRO:  40.000 / 800 = 50 | PREMIUM: 200.000 / 1.000 = 200
export const RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN: Record<PlanKey, number> = {
  FREE: 150,
  START: 300,
  PLUS: 600,
  PRO: 800,
  PREMIUM: 1_000,
};

/**
 * Retorna o número de galerias que o pool suporta com fotos na quantidade recomendada.
 * Equivale à coluna G da planilha. Usado em PERMISSIONS_BY_PLAN e exibições estáticas.
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
 * Fotógrafos de ensaio que publicam ~50 fotos/galeria se beneficiam
 * automaticamente: o pool "sobra" e permite mais galerias, até o hardCap.
 *
 * @param planKey          - Plano do usuário
 * @param usedCredits      - Total de fotos publicadas (soma de todas as galerias)
 * @param activeGalleryCount - Número atual de galerias ativas
 *
 * @example
 * // PRO, 5.000 fotos em 10 galerias (média 500/galeria):
 * calcEffectiveMaxGalleries('PRO', 5_000, 10)
 * // remaining = 40.000 - 5.000 = 35.000
 * // fromPool  = floor(35.000 / 800) = 43
 * // total     = min(10 + 43, 150) = 53
 *
 * // PRO, mesmo usuário mas 50 fotos/galeria em média:
 * // Se usedCredits = 500, remaining = 39.500, fromPool = 49
 * // total = min(10 + 49, 150) = 59 → mais galerias, mesmo plano
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

export const ZIP_LIMITS: Record<PlanKey, number> = {
  FREE: 500_000,
  START: 1_000_000,
  PLUS: 1_500_000,
  PRO: 2_000_000,
  PREMIUM: 3_000_000,
};

export const ZIP_LIMIT_TO_RESOLUTION: Record<number, number> = {
  500_000: 1024,
  1_000_000: 1600,
  1_500_000: 2048,
  2_000_000: 2560,
  3_000_000: 0,
};

// =============================================================================
// 🛡️ PERMISSIONS
// =============================================================================

export interface PlanPermissions {
  // Capacidade
  photoCredits: number;
  maxGalleries: number; // Base estática: getBaseGalleriesFromPool()
  maxGalleriesHardCap: number; // Teto absoluto: usar calcEffectiveMaxGalleries() em runtime
  maxPhotosPerGallery: number;
  recommendedPhotosPerGallery: number;
  teamMembers: number;

  // Presença Digital
  profileLevel: 'basic' | 'standard' | 'advanced' | 'seo';
  profileCarouselLimit: number;
  profileListLimit: number | 'unlimited';
  removeBranding: boolean;
  selectedProfileTheme?: boolean;

  // Leads
  canCaptureLeads: boolean;
  canAccessNotifyEvents: boolean;
  canExportLeads: boolean;
  canCustomWhatsApp: boolean;

  // Experiência Visual
  socialDisplayLevel: 'minimal' | 'social' | 'full';
  canFavorite: boolean;
  canDownloadFavoriteSelection: boolean;
  canShowSlideshow: boolean;
  maxGridColumns: number;
  maxTags: number;
  tagSelectionMode: 'manual' | 'bulk' | 'drive';

  // Entrega de Arquivos
  zipSizeLimit: string;
  zipSizeLimitBytes: number;
  maxExternalLinks: number;
  canCustomLinkLabel: boolean;
  privacyLevel: 'public' | 'password';
  expiresAt: boolean | null;
  keepOriginalFilenames: boolean;

  // Personalização
  customizationLevel: 'default' | 'colors' | 'full';
  canCustomCategories: boolean;

  // Estatísticas
  canAccessStats: boolean;

  isTrial?: boolean;
}

export const PERMISSIONS_BY_PLAN: Record<PlanKey, PlanPermissions> = {
  FREE: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.FREE,
    maxGalleries: getBaseGalleriesFromPool('FREE'), // 3
    maxGalleriesHardCap: MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE, // 10
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.FREE,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.FREE,
    teamMembers: 0,
    profileLevel: 'basic',
    profileCarouselLimit: 0,
    profileListLimit: 1,
    removeBranding: false,
    canCaptureLeads: false,
    canExportLeads: false,
    canAccessStats: false,
    canAccessNotifyEvents: false,
    canCustomWhatsApp: false,
    socialDisplayLevel: 'minimal',
    canFavorite: false,
    canDownloadFavoriteSelection: false,
    canShowSlideshow: false,
    maxGridColumns: 3,
    maxTags: 0,
    tagSelectionMode: 'manual',
    zipSizeLimit: '500KB',
    zipSizeLimitBytes: ZIP_LIMITS.FREE,
    maxExternalLinks: 0,
    canCustomLinkLabel: false,
    privacyLevel: 'public',
    expiresAt: false,
    keepOriginalFilenames: false,
    customizationLevel: 'default',
    canCustomCategories: false,
    selectedProfileTheme: false,
  },
  START: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.START,
    maxGalleries: getBaseGalleriesFromPool('START'), // 10
    maxGalleriesHardCap: MAX_GALLERIES_HARD_CAP_BY_PLAN.START, // 30
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.START,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.START,
    teamMembers: 0,
    profileLevel: 'standard',
    profileCarouselLimit: 1,
    profileListLimit: 10,
    removeBranding: false,
    canCaptureLeads: false,
    canExportLeads: false,
    canAccessStats: false,
    canAccessNotifyEvents: false,
    canCustomWhatsApp: false,
    socialDisplayLevel: 'social',
    canFavorite: true,
    canDownloadFavoriteSelection: false,
    canShowSlideshow: false,
    maxGridColumns: 4,
    maxTags: 0,
    tagSelectionMode: 'manual',
    zipSizeLimit: '1MB',
    zipSizeLimitBytes: ZIP_LIMITS.START,
    maxExternalLinks: 1,
    canCustomLinkLabel: false,
    privacyLevel: 'password',
    expiresAt: false,
    keepOriginalFilenames: false,
    customizationLevel: 'default',
    canCustomCategories: false,
    selectedProfileTheme: false,
  },
  PLUS: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.PLUS,
    maxGalleries: getBaseGalleriesFromPool('PLUS'), // 20
    maxGalleriesHardCap: MAX_GALLERIES_HARD_CAP_BY_PLAN.PLUS, // 60
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PLUS,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PLUS,
    teamMembers: 2,
    profileLevel: 'standard',
    profileCarouselLimit: 1,
    profileListLimit: 20,
    removeBranding: false,
    canCaptureLeads: false,
    canExportLeads: false,
    canAccessStats: false,
    canAccessNotifyEvents: false,
    canCustomWhatsApp: false,
    socialDisplayLevel: 'social',
    canFavorite: true,
    canDownloadFavoriteSelection: true,
    canShowSlideshow: false,
    maxGridColumns: 5,
    maxTags: 7,
    tagSelectionMode: 'manual',
    zipSizeLimit: '1.5MB',
    zipSizeLimitBytes: ZIP_LIMITS.PLUS,
    maxExternalLinks: 2,
    canCustomLinkLabel: false,
    privacyLevel: 'password',
    expiresAt: false,
    keepOriginalFilenames: true,
    customizationLevel: 'colors',
    canCustomCategories: true,
    selectedProfileTheme: true,
  },
  PRO: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.PRO,
    maxGalleries: getBaseGalleriesFromPool('PRO'), // 50
    maxGalleriesHardCap: MAX_GALLERIES_HARD_CAP_BY_PLAN.PRO, // 150
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PRO,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PRO,
    teamMembers: 5,
    profileLevel: 'advanced',
    profileCarouselLimit: 3,
    profileListLimit: 'unlimited',
    removeBranding: false,
    canCaptureLeads: true,
    canExportLeads: true,
    canCustomWhatsApp: true,
    socialDisplayLevel: 'full',
    canFavorite: true,
    canDownloadFavoriteSelection: true,
    canShowSlideshow: true,
    maxGridColumns: 6,
    maxTags: 12,
    tagSelectionMode: 'bulk',
    zipSizeLimit: '2MB',
    zipSizeLimitBytes: ZIP_LIMITS.PRO,
    maxExternalLinks: 5,
    canCustomLinkLabel: true,
    keepOriginalFilenames: true,
    privacyLevel: 'password',
    customizationLevel: 'colors',
    canCustomCategories: true,
    canAccessStats: true,
    canAccessNotifyEvents: true,
    expiresAt: true,
    selectedProfileTheme: true,
  },
  PREMIUM: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.PREMIUM,
    maxGalleries: getBaseGalleriesFromPool('PREMIUM'), // 200
    maxGalleriesHardCap: MAX_GALLERIES_HARD_CAP_BY_PLAN.PREMIUM, // 500
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PREMIUM,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PREMIUM,
    teamMembers: 99,
    profileLevel: 'seo',
    profileCarouselLimit: 5,
    profileListLimit: 'unlimited',
    removeBranding: true,
    canCaptureLeads: true,
    canExportLeads: true,
    canCustomWhatsApp: true,
    socialDisplayLevel: 'full',
    canFavorite: true,
    canDownloadFavoriteSelection: true,
    canShowSlideshow: true,
    maxGridColumns: 8,
    maxTags: 30,
    tagSelectionMode: 'drive',
    zipSizeLimit: '3MB',
    zipSizeLimitBytes: ZIP_LIMITS.PREMIUM,
    maxExternalLinks: 10,
    canCustomLinkLabel: true,
    keepOriginalFilenames: true,
    privacyLevel: 'password',
    customizationLevel: 'full',
    canCustomCategories: true,
    canAccessStats: true,
    canAccessNotifyEvents: true,
    expiresAt: true,
    selectedProfileTheme: true,
  },
};

// =============================================================================
// 📦 PLAN INFO
// =============================================================================

export interface PlanInfo {
  name: string;
  price: number;
  semesterPrice: number;
  yearlyPrice: number;
  maxGalleries: number;
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
      semesterPrice: 0,
      yearlyPrice: 0,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE,
      icon: Zap,
      cta: 'Começar Grátis',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Start',
      price: 29,
      semesterPrice: 26,
      yearlyPrice: 24,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.START,
      icon: Rocket,
      cta: 'Evoluir',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Plus',
      price: 49,
      semesterPrice: 43,
      yearlyPrice: 39,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PLUS,
      icon: Star,
      cta: 'Crescer',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Pro',
      price: 89,
      semesterPrice: 78,
      yearlyPrice: 74,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Dominar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Premium',
      price: 149,
      semesterPrice: 131,
      yearlyPrice: 124,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PREMIUM,
      icon: Sparkles,
      cta: 'Elite',
      permissions: PERMISSIONS_BY_PLAN.PREMIUM,
    },
  },
  EVENT: {
    FREE: {
      name: 'Free Trial',
      price: 0,
      semesterPrice: 0,
      yearlyPrice: 0,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE,
      icon: Zap,
      cta: 'Testar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Event',
      price: 99,
      semesterPrice: 87,
      yearlyPrice: 79,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.START,
      icon: Rocket,
      cta: 'Iniciar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Plus',
      price: 159,
      semesterPrice: 140,
      yearlyPrice: 129,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PLUS,
      icon: Star,
      cta: 'Expandir',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Club',
      price: 249,
      semesterPrice: 219,
      yearlyPrice: 199,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Assinar Club',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Enterprise',
      price: 499,
      semesterPrice: 439,
      yearlyPrice: 399,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PREMIUM,
      icon: Gem,
      cta: 'Experience',
      permissions: PERMISSIONS_BY_PLAN.PREMIUM,
    },
  },
  CAMPAIGN: {
    FREE: {
      name: 'Militante',
      price: 0,
      semesterPrice: 0,
      yearlyPrice: 0,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE,
      icon: Shield,
      cta: 'Começar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Bronze',
      price: 199,
      semesterPrice: 175,
      yearlyPrice: 159,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.START,
      icon: Medal,
      cta: 'Plano Bronze',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Prata',
      price: 399,
      semesterPrice: 351,
      yearlyPrice: 329,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PLUS,
      icon: Award,
      cta: 'Plano Prata',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Ouro',
      price: 799,
      semesterPrice: 703,
      yearlyPrice: 659,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Plano Ouro',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Majoritário',
      price: 1499,
      semesterPrice: 1319,
      yearlyPrice: 1249,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PREMIUM,
      icon: Sparkles,
      cta: 'Plano VIP',
      permissions: PERMISSIONS_BY_PLAN.PREMIUM,
    },
  },
  OFFICE: {
    FREE: {
      name: 'Básico',
      price: 0,
      semesterPrice: 0,
      yearlyPrice: 0,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE,
      icon: Layout,
      cta: 'Começar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Essential',
      price: 149,
      semesterPrice: 131,
      yearlyPrice: 119,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.START,
      icon: Rocket,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Advanced',
      price: 299,
      semesterPrice: 263,
      yearlyPrice: 249,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PLUS,
      icon: Star,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Mandato',
      price: 599,
      semesterPrice: 527,
      yearlyPrice: 499,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Vanguard',
      price: 999,
      semesterPrice: 879,
      yearlyPrice: 829,
      maxGalleries: MAX_GALLERIES_HARD_CAP_BY_PLAN.PREMIUM,
      icon: Sparkles,
      cta: 'Assinar VIP',
      permissions: PERMISSIONS_BY_PLAN.PREMIUM,
    },
  },
};

// =============================================================================
// 📊 COMMON FEATURES
// =============================================================================

export const COMMON_FEATURES = [
  {
    group: 'Gestão',
    key: 'photoCredits' as const,
    label: 'Créditos de Fotos',
    tooltip: 'Pool total distribuído livremente — trava ao esgotar',
    values: [
      '450 fotos',
      '3.000 fotos',
      '12.000 fotos',
      '40.000 fotos',
      '200.000 fotos',
    ],
  },
  {
    group: 'Gestão',
    key: 'maxGalleries' as const,
    label: 'Galerias (base do pool)',
    tooltip:
      'Galerias suportadas com fotos na quantidade recomendada. Quem publica menos fotos por galeria pode ter mais.',
    values: [
      '3 galerias',
      '10 galerias',
      '20 galerias',
      '50 galerias',
      '200 galerias',
    ],
  },
  {
    group: 'Gestão',
    key: 'maxGalleriesHardCap' as const,
    label: 'Galerias (limite absoluto)',
    tooltip:
      'Teto máximo independente do pool. Mesmo publicando poucas fotos por galeria, este limite não é ultrapassado.',
    values: [
      '10 galerias',
      '30 galerias',
      '60 galerias',
      '150 galerias',
      '500 galerias',
    ],
  },
  {
    group: 'Gestão',
    key: 'maxPhotosPerGallery' as const,
    label: 'Fotos por Galeria (máximo)',
    tooltip: 'Limite por galeria individual — bloqueia ao atingir',
    values: [
      '200 fotos',
      '450 fotos',
      '800 fotos',
      '1.500 fotos',
      '3.000 fotos',
    ],
  },
  {
    group: 'Gestão',
    key: 'canAccessStats' as const,
    label: 'Estatísticas da galeria',
    values: [false, false, false, 'Ativadas', 'Ativadas'],
  },
  {
    group: 'Gestão',
    key: 'canAccessNotifyEvents',
    label: 'Notificações de eventos',
    tooltip:
      'Receba notificações de eventos em tempo real: visualizações, downloads, favoritos e acessos.',
    values: [false, false, false, 'Ativadas', 'Ativadas'],
  },
  {
    group: 'Gestão',
    key: 'teamMembers' as const,
    label: 'Equipe de Trabalho',
    values: [
      'Apenas Titular',
      'Apenas Titular',
      '+ 2 Colaboradores',
      '+ 5 Colaboradores',
      'Acessos Ilimitados',
    ],
  },
  {
    group: 'Presença Digital',
    key: 'profileLevel' as const,
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
    group: 'Presença Digital',
    label: 'Capa do Perfil',
    values: [
      'Imagem Padrão',
      '1 Foto Personalizada',
      '1 Foto Personalizada',
      '+ Carrossel (3 fotos)',
      '+ Carrossel (5 fotos)',
    ],
  },
  {
    group: 'Presença Digital',
    label: 'Catálogo de Galerias',
    values: [
      'Exibir 1 galeria',
      'Exibir até 10',
      'Exibir até 20',
      'Portfólio Completo',
      '+ Busca e Filtros',
    ],
  },
  {
    group: 'Presença Digital',
    key: 'removeBranding' as const,
    label: 'Branding (Rodapé)',
    values: [
      'Marca do App',
      'Marca do App',
      'Identidade do Autor',
      'Identidade do Autor',
      'White Label (Sem Marca)',
    ],
  },
  {
    group: 'Cadastro de visitantes',
    key: 'canCaptureLeads' as const,
    label: 'Formulário de Acesso à galeria',
    values: [
      false,
      false,
      false,
      'Nome, e-Mail e Whatsapp',
      'Nome, e-Mail e Whatsapp',
    ],
  },
  {
    group: 'Cadastro de visitantes',
    key: 'canExportLeads' as const,
    label: 'Gestão de Contatos',
    values: [
      false,
      false,
      false,
      'Exportação (CSV/XLS/PDF)',
      'Exportação (CSV/XLS/PDF)',
    ],
  },
  {
    group: 'Captura de Clientes',
    key: 'canCustomWhatsApp' as const,
    label: 'Mensagens de WhatsApp',
    values: [
      'Templates Padrão',
      'Templates Padrão',
      'Templates Padrão',
      '+ Edição Customizada',
      '+ Edição Customizada',
    ],
  },
  {
    group: 'Experiência Visual',
    key: 'socialDisplayLevel' as const,
    label: 'Contato no Visualizador',
    values: [
      'Avatar',
      '+ Atalho WhatsApp',
      '+ Link Instagram',
      '+ Link Perfil Full',
      '+ Website Direto',
    ],
  },
  {
    group: 'Experiência Visual',
    key: 'canFavorite' as const,
    label: 'Interação com Fotos',
    values: [
      'Visualização',
      '+ Favoritar (Coração)',
      '+ Filtro de Favoritas',
      '+ Seleção em Lote',
      '+ Seleção em Lote',
    ],
  },
  {
    group: 'Experiência Visual',
    key: 'canShowSlideshow' as const,
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
    group: 'Experiência Visual',
    key: 'canCustomCategories' as const,
    label: 'Organização e Tags',
    values: [
      'Categorias Padrão',
      'Categorias Padrão',
      '+ Categorias Próprias',
      '+ Filtros por Tags',
      '+ Auto-Tags (Pastas)',
    ],
  },
  {
    group: 'Experiência Visual',
    key: 'maxGridColumns' as const,
    label: 'Personalização da Grade',
    values: [
      'Fixo (3 colunas)',
      'Escolha (3 ou 4)',
      'Escolha (3 a 5)',
      'Até 6 colunas',
      'Até 8 colunas',
    ],
  },
  {
    group: 'Experiência Visual',
    key: 'customizationLevel' as const,
    label: 'Design da Interface',
    values: [
      'Tema Editorial',
      'Tema Editorial',
      '+ Cores do Grid',
      '+ Cores do Grid',
      '+ Fundo Personalizado',
    ],
  },
  {
    group: 'Entrega de Arquivos',
    key: 'zipSizeLimit' as const,
    label: 'Download ZIP - Tamanho/foto',
    values: [
      'Até 500KB/foto',
      'Até 1MB (Otimizado)',
      'Até 1.5MB (Otimizado)',
      'Até 2MB (HD)',
      'Até 3MB (Full-Res)',
    ],
  },
  {
    group: 'Entrega de Arquivos',
    key: 'maxExternalLinks' as const,
    label: 'Links de Download Externos',
    values: [
      false,
      '1 Link Direto',
      '2 Links Diretos',
      'Até 5 Links (Nomes Personalizados)',
      'Até 10 Links (Nomes Personalizados)',
    ],
  },
  {
    group: 'Entrega de Arquivos',
    key: 'keepOriginalFilenames' as const,
    label: 'Preservação de Dados',
    values: [
      'Nomes Aleatórios',
      'Nomes Aleatórios',
      'Nomes Originais',
      'Nomes Originais',
      'Nomes Originais',
    ],
  },
  {
    group: 'Segurança',
    key: 'privacyLevel' as const,
    label: 'Controle de Acesso',
    values: [
      'Link Público',
      'Link Privado',
      'Link Privado',
      '+ Proteção por Senha',
      '+ Link com Expiração',
    ],
  },
  {
    group: 'Segurança',
    key: 'expiresAt',
    label: 'Data de Expiração',
    values: [false, false, false, 'Ativa', 'Ativa'],
  },
];

// =============================================================================
// 🌐 DOMAIN CONFIG
// =============================================================================

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
    SITE_CONFIG[hostname as keyof typeof SITE_CONFIG] ??
    SITE_CONFIG['suagaleria.com.br'];
  return { ...config, plans: PLANS_BY_SEGMENT[config.segment as SegmentType] };
}

// =============================================================================
// 🔍 FIND NEXT PLAN
// =============================================================================

const PLAN_ORDER: PlanKey[] = ['FREE', 'START', 'PLUS', 'PRO', 'PREMIUM'];

export function findNextPlanWithFeature(
  currentPlan: PlanKey,
  feature: keyof PlanPermissions,
  segment: SegmentType = 'PHOTOGRAPHER',
): string | null {
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const segmentPlans = PLANS_BY_SEGMENT[segment];

  for (let i = currentIdx + 1; i < PLAN_ORDER.length; i++) {
    const key = PLAN_ORDER[i];
    const val = PERMISSIONS_BY_PLAN[key][feature];
    const has =
      typeof val === 'boolean'
        ? val
        : typeof val === 'number'
          ? val > 0
          : val !== 'default' && val !== 'basic' && val !== 'minimal' && !!val;
    if (has) return segmentPlans[key].name;
  }
  return null;
}

export function findNextPlanKeyWithFeature(
  currentPlan: PlanKey,
  feature: keyof PlanPermissions,
): PlanKey | null {
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);

  for (let i = currentIdx + 1; i < PLAN_ORDER.length; i++) {
    const key = PLAN_ORDER[i];
    const val = PERMISSIONS_BY_PLAN[key][feature];
    const has =
      typeof val === 'boolean'
        ? val
        : typeof val === 'number'
          ? val > 0
          : val !== 'default' && val !== 'basic' && val !== 'minimal' && !!val;
    if (has) return key;
  }
  return null;
}

// Alias para compatibilidade com imports existentes
export { findNextPlanKeyWithFeature as findNextPlanWithFeatureKey };
