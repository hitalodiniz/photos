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

// =============================================================================
// 🔑 FEATURE KEYS — Chaves canônicas para bloquear/liberar funcionalidades
// Use sempre estas constantes no código, nunca strings literais.
// =============================================================================

export const FEATURE = {
  // --- Gestão de Capacidade ---
  PHOTO_CREDITS: 'photoCredits',
  MAX_GALLERIES: 'maxGalleries',
  MAX_PHOTOS_PER_GALLERY: 'maxPhotosPerGallery',
  RECOMMENDED_PHOTOS_PER_GALLERY: 'recommendedPhotosPerGallery', // ✅ NOVO
  TEAM_MEMBERS: 'teamMembers',

  // --- Presença Digital ---
  PROFILE_LEVEL: 'profileLevel', // Nível de perfil: basic | standard | advanced | seo
  PROFILE_CAROUSEL_LIMIT: 'profileCarouselLimit',
  PROFILE_LIST_LIMIT: 'profileListLimit',
  REMOVE_BRANDING: 'removeBranding', // White label (sem rodapé com marca)

  // --- Leads & Relacionamento ---
  CAN_CAPTURE_LEADS: 'canCaptureLeads',
  CAN_EXPORT_LEADS: 'canExportLeads',
  CAN_CUSTOM_WHATSAPP: 'canCustomWhatsApp',

  // --- Experiência Visual ---
  SOCIAL_DISPLAY_LEVEL: 'socialDisplayLevel', // minimal | social | full
  CAN_FAVORITE: 'canFavorite',
  CAN_DOWNLOAD_FAVORITE_SELECTION: 'canDownloadFavoriteSelection',
  CAN_SHOW_SLIDESHOW: 'canShowSlideshow',
  MAX_GRID_COLUMNS: 'maxGridColumns',
  MAX_TAGS: 'maxTags',
  TAG_SELECTION_MODE: 'tagSelectionMode', // manual | bulk | drive

  // --- Entrega de Arquivos ---
  ZIP_SIZE_LIMIT: 'zipSizeLimit', // Bytes. Use ZIP_LIMITS helper para comparar.
  MAX_EXTERNAL_LINKS: 'maxExternalLinks',
  CAN_CUSTOM_LINK_LABEL: 'canCustomLinkLabel',
  KEEP_ORIGINAL_FILENAMES: 'keepOriginalFilenames',

  // --- Segurança ---
  PRIVACY_LEVEL: 'privacyLevel', // public | private | password | expiration

  // --- Personalização ---
  CUSTOMIZATION_LEVEL: 'customizationLevel', // default | colors | full
  CAN_CUSTOM_CATEGORIES: 'canCustomCategories',

  // --- Estatísticas ---
  CAN_ACCESS_STATS: 'canAccessStats',
} as const;

// Tipo derivado das chaves — use para tipagem de parâmetros e guards
export type FeatureKey = (typeof FEATURE)[keyof typeof FEATURE];

// =============================================================================
// 📖 FEATURE DESCRIPTIONS — Labels e descrições para tooltips na UI
// Cobertura parcial: apenas campos com valor explicativo para o usuário final.
// =============================================================================

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
      'Número máximo de galerias simultâneas. Ao atingir o limite, a criação de novas galerias é bloqueada.',
  },
  maxPhotosPerGallery: {
    label: 'Fotos por Galeria',
    description:
      'Limite de fotos por galeria individual. Garante que cada galeria permaneça organizada e com boa performance.',
  },
  // ✅ NOVO
  recommendedPhotosPerGallery: {
    label: 'Fotos Recomendadas por Galeria',
    description:
      'Quantidade recomendada de fotos por galeria para garantir melhor performance e experiência do cliente. Ao ultrapassar, um aviso é exibido.',
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
      'Preserva os nomes originais dos arquivos no download. Sem este recurso, os arquivos recebem nomes sequências.',
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
// 🎫 CRÉDITOS DE FOTOS — Sistema de capacidade flexível
//
// O plano fornece um pool total de "créditos de fotos" que o usuário distribui
// livremente entre suas galerias — respeitando dois hard caps:
//
//   1. totalPhotosUsed + newPhotos <= photoCredits   → pool global
//   2. galleries.length < maxGalleries               → limite de galerias
//   3. gallery.photos.length < maxPhotosPerGallery   → hard cap por galeria (bloqueia)
//   4. gallery.photos.length >= recommendedPhotosPerGallery → aviso ao usuário
//
// Limites 1, 2 e 3 TRAVAM o sistema quando atingidos.
// Limite 4 emite aviso amarelo antes do hard cap para orientar o usuário.
//
// =============================================================================

// Pool total de fotos — trava quando esgotado
export const PHOTO_CREDITS_BY_PLAN: Record<PlanKey, number> = {
  FREE: 450,
  START: 3_000,
  PLUS: 8_000,
  PRO: 30_000,
  PREMIUM: 200_000,
};

// Hard cap de galerias — trava quando atingido
export const MAX_GALLERIES_BY_PLAN: Record<PlanKey, number> = {
  FREE: 3,
  START: 10,
  PLUS: 20,
  PRO: 50,
  PREMIUM: 200,
};

// Hard cap por galeria — bloqueia ao atingir (sem exceção)
export const MAX_PHOTOS_PER_GALLERY_BY_PLAN: Record<PlanKey, number> = {
  FREE: 200,
  START: 450,
  PLUS: 800,
  PRO: 1_500,
  PREMIUM: 3_000,
};

// ✅ NOVO — Valor recomendado por galeria (coluna "Fotos/galeria" da planilha)
// Ao ultrapassar: exibe aviso amarelo no formulário de galeria.
// Ao ultrapassar MAX_PHOTOS_PER_GALLERY_BY_PLAN: bloqueia completamente.
export const RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN: Record<PlanKey, number> = {
  FREE: 150, // hard cap: 200   → aviso ao atingir 150
  START: 300, // hard cap: 450   → aviso ao atingir 300
  PLUS: 600, // hard cap: 800   → aviso ao atingir 600
  PRO: 800, // hard cap: 1.500 → aviso ao atingir 800
  PREMIUM: 1_000, // hard cap: 3.000 → aviso ao atingir 1.000
};

// Helper para exibição amigável dos créditos
export function formatPhotoCredits(credits: number): string {
  if (credits >= 1_000) return `${(credits / 1_000).toFixed(0)}k`;
  return String(credits);
}

// Referência de tamanho ZIP em bytes (para comparações programáticas)
export const ZIP_LIMITS: Record<PlanKey, number> = {
  FREE: 500_000, // 500 KB
  START: 1_000_000, // 1 MB
  PLUS: 1_500_000, // 1.5 MB
  PRO: 2_000_000, // 2 MB
  PREMIUM: 3_000_000, // 3 MB
};

export const ZIP_LIMIT_TO_RESOLUTION: Record<number, number> = {
  500_000: 1024, // FREE    → 500KB  → ~1024px
  1_000_000: 1600, // START   → 1MB    → ~1600px
  1_500_000: 2048, // PLUS    → 1.5MB  → ~2048px
  2_000_000: 2560, // PRO     → 2MB    → ~2560px
  3_000_000: 0, // PREMIUM → 3MB    → original (0 = sem limite)
};

// =============================================================================
// 🛡️ PERMISSIONS — Mapa completo de permissões por plano
// =============================================================================

export interface PlanPermissions {
  // Capacidade (sistema flexível com dois hard caps)
  photoCredits: number; // Pool total — trava ao esgotar
  maxGalleries: number; // Hard cap de galerias — trava ao atingir
  maxPhotosPerGallery: number; // Hard cap por galeria — bloqueia ao atingir
  recommendedPhotosPerGallery: number; // ✅ NOVO — emite aviso ao ultrapassar
  teamMembers: number;

  // Presença Digital
  profileLevel: 'basic' | 'standard' | 'advanced' | 'seo';
  profileCarouselLimit: number;
  profileListLimit: number | 'unlimited';
  removeBranding: boolean;

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
  zipSizeLimit: string; // Label amigável para UI ("500KB", "1MB"...)
  zipSizeLimitBytes: number; // Valor real para comparação no código
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

  // Controle interno (não é um plano em si — injetado pelo PlanContext em runtime)
  isTrial?: boolean;
}

export const PERMISSIONS_BY_PLAN: Record<PlanKey, PlanPermissions> = {
  FREE: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.FREE,
    maxGalleries: MAX_GALLERIES_BY_PLAN.FREE,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.FREE,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.FREE, // ✅ NOVO
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
  },
  START: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.START,
    maxGalleries: MAX_GALLERIES_BY_PLAN.START,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.START,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.START, // ✅ NOVO
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
  },
  PLUS: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.PLUS,
    maxGalleries: MAX_GALLERIES_BY_PLAN.PLUS,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PLUS,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PLUS, // ✅ NOVO
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
  },
  PRO: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.PRO,
    maxGalleries: MAX_GALLERIES_BY_PLAN.PRO,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PRO,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PRO, // ✅ NOVO
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
  },
  PREMIUM: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.PREMIUM,
    maxGalleries: MAX_GALLERIES_BY_PLAN.PREMIUM,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PREMIUM,
    recommendedPhotosPerGallery: RECOMMENDED_PHOTOS_PER_GALLERY_BY_PLAN.PREMIUM, // ✅ NOVO
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
  },
};

// =============================================================================
// 📦 PLAN INFO — Informações de display por segmento
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
      maxGalleries: MAX_GALLERIES_BY_PLAN.FREE,
      icon: Zap,
      cta: 'Começar Grátis',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Start',
      price: 29,
      semesterPrice: 26,
      yearlyPrice: 24,
      maxGalleries: MAX_GALLERIES_BY_PLAN.START,
      icon: Rocket,
      cta: 'Evoluir',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Plus',
      price: 49,
      semesterPrice: 43,
      yearlyPrice: 39,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PLUS,
      icon: Star,
      cta: 'Crescer',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Pro',
      price: 89,
      semesterPrice: 78,
      yearlyPrice: 74,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Dominar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Premium',
      price: 149,
      semesterPrice: 131,
      yearlyPrice: 124,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PREMIUM,
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
      maxGalleries: MAX_GALLERIES_BY_PLAN.FREE,
      icon: Zap,
      cta: 'Testar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Event',
      price: 99,
      semesterPrice: 87,
      yearlyPrice: 79,
      maxGalleries: MAX_GALLERIES_BY_PLAN.START,
      icon: Rocket,
      cta: 'Iniciar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Plus',
      price: 159,
      semesterPrice: 140,
      yearlyPrice: 129,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PLUS,
      icon: Star,
      cta: 'Expandir',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Club',
      price: 249,
      semesterPrice: 219,
      yearlyPrice: 199,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Assinar Club',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Enterprise',
      price: 499,
      semesterPrice: 439,
      yearlyPrice: 399,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PREMIUM,
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
      maxGalleries: MAX_GALLERIES_BY_PLAN.FREE,
      icon: Shield,
      cta: 'Começar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Bronze',
      price: 199,
      semesterPrice: 175,
      yearlyPrice: 159,
      maxGalleries: MAX_GALLERIES_BY_PLAN.START,
      icon: Medal,
      cta: 'Plano Bronze',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Prata',
      price: 399,
      semesterPrice: 351,
      yearlyPrice: 329,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PLUS,
      icon: Award,
      cta: 'Plano Prata',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Ouro',
      price: 799,
      semesterPrice: 703,
      yearlyPrice: 659,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Plano Ouro',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Majoritário',
      price: 1499,
      semesterPrice: 1319,
      yearlyPrice: 1249,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PREMIUM,
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
      maxGalleries: MAX_GALLERIES_BY_PLAN.FREE,
      icon: Layout,
      cta: 'Começar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Essential',
      price: 149,
      semesterPrice: 131,
      yearlyPrice: 119,
      maxGalleries: MAX_GALLERIES_BY_PLAN.START,
      icon: Rocket,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Advanced',
      price: 299,
      semesterPrice: 263,
      yearlyPrice: 249,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PLUS,
      icon: Star,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Mandato',
      price: 599,
      semesterPrice: 527,
      yearlyPrice: 499,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Vanguard',
      price: 999,
      semesterPrice: 879,
      yearlyPrice: 829,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PREMIUM,
      icon: Sparkles,
      cta: 'Assinar VIP',
      permissions: PERMISSIONS_BY_PLAN.PREMIUM,
    },
  },
};

// =============================================================================
// 📊 COMMON FEATURES — Tabela visual de comparação (Landing Page)
// =============================================================================

export const COMMON_FEATURES = [
  // --- GESTÃO ---
  {
    group: 'Gestão',
    key: 'photoCredits' as const,
    label: 'Créditos de Fotos',
    values: [
      '450 fotos',
      '3.000 fotos',
      '8.000 fotos',
      '30.000 fotos',
      '200.000 fotos',
    ],
    tooltip:
      'Pool total distribuído livremente entre suas galerias — trava ao esgotar',
  },
  {
    group: 'Gestão',
    key: 'maxGalleries' as const,
    label: 'Galerias Ativas (máximo)',
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
    key: 'canAccessStats' as const,
    tooltip: 'Limite máximo de galerias simultâneas — trava ao atingir',
    label: 'Estatísticas da galeria',
    values: [false, false, false, 'Ativadas', 'Ativadas'],
  },
  {
    group: 'Gestão',
    key: 'canAccessNotifyEvents',
    tooltip:
      'Receba notificações de eventos em tempo real: visualizações, downloads, favoritos e acessos à galeria.',
    label: 'Notificações de eventos',
    values: [false, false, false, 'Ativadas', 'Ativadas'],
  },
  {
    group: 'Gestão',
    key: 'maxPhotosPerGallery' as const,
    label: 'Fotos por Galeria (máximo)',
    values: [
      '200 fotos',
      '450 fotos',
      '800 fotos',
      '1.500 fotos',
      '3.000 fotos',
    ],
    tooltip: 'Limite por galeria individual — trava ao atingir',
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

  // --- PRESENÇA DIGITAL ---
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

  // --- CADASTRO DE VISITANTES ---
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

  // --- EXPERIÊNCIA VISUAL ---
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

  // --- ENTREGA DE ARQUIVOS ---
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
    key: 'expiresAt',
    group: 'Segurança',
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

  return {
    ...config,
    plans: PLANS_BY_SEGMENT[config.segment as SegmentType],
  };
}

// =============================================================================
// 🔍 FIND NEXT PLAN — Usado pelo PlanGuard para indicar o plano mínimo necessário
// =============================================================================

const PLAN_ORDER: PlanKey[] = ['FREE', 'START', 'PLUS', 'PRO', 'PREMIUM'];

/**
 * Retorna o nome do próximo plano (acima do atual) que possui acesso ao feature.
 * Usado pelo PlanGuard para exibir "Disponível no Plano X ou superior".
 */
export function findNextPlanWithFeature(
  currentPlan: PlanKey,
  feature: keyof PlanPermissions,
  segment: SegmentType = 'PHOTOGRAPHER',
): string | null {
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const segmentPlans = PLANS_BY_SEGMENT[segment];

  for (let i = currentIdx + 1; i < PLAN_ORDER.length; i++) {
    const candidateKey = PLAN_ORDER[i];
    const perms = PERMISSIONS_BY_PLAN[candidateKey];
    const val = perms[feature];

    const hasFeature =
      typeof val === 'boolean'
        ? val
        : typeof val === 'number'
          ? val > 0
          : val !== 'default' && val !== 'basic' && val !== 'minimal' && !!val;

    if (hasFeature) {
      return segmentPlans[candidateKey].name;
    }
  }

  return null;
}

/**
 * Retorna a PlanKey (ex: 'START', 'PRO') do próximo plano que possui acesso ao feature.
 * Use esta função quando precisar acessar PERMISSIONS_BY_PLAN com o resultado.
 *
 * Diferença em relação a findNextPlanWithFeature:
 *   findNextPlanWithFeature → 'Start'   (nome de exibição, varia por segmento)
 *   findNextPlanKeyWithFeature → 'START'  (chave canônica, invariante)
 */
export function findNextPlanKeyWithFeature(
  currentPlan: PlanKey,
  feature: keyof PlanPermissions,
): PlanKey | null {
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);

  for (let i = currentIdx + 1; i < PLAN_ORDER.length; i++) {
    const candidateKey = PLAN_ORDER[i];
    const perms = PERMISSIONS_BY_PLAN[candidateKey];
    const val = perms[feature];

    const hasFeature =
      typeof val === 'boolean'
        ? val
        : typeof val === 'number'
          ? val > 0
          : val !== 'default' && val !== 'basic' && val !== 'minimal' && !!val;

    if (hasFeature) return candidateKey;
  }

  return null;
}
