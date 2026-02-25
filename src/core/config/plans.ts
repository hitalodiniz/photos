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
  PHOTO_CREDITS: 'photoCredits', // Total de créditos de fotos do plano
  MAX_GALLERIES: 'maxGalleries', // Limite máximo de galerias (hard cap)
  MIN_PHOTOS_PER_GALLERY: 'minPhotosPerGallery', // Mínimo garantido por galeria
  TEAM_MEMBERS: 'teamMembers', // Colaboradores da equipe

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
} as const;

// Tipo derivado das chaves — use para tipagem de parâmetros e guards
export type FeatureKey = (typeof FEATURE)[keyof typeof FEATURE];

// =============================================================================
// 🎫 CRÉDITOS DE FOTOS — Sistema de capacidade flexível
//
// O plano fornece um pool total de "créditos de fotos" que o usuário distribui
// livremente entre suas galerias — respeitando dois hard caps:
//
//   1. totalPhotosUsed + newPhotos <= photoCredits   → pool global
//   2. galleries.length < maxGalleries               → limite de galerias
//   3. gallery.photos.length < maxPhotosPerGallery   → limite por galeria (anti-bagunça)
//
// Ambos os limites 1 e 2 TRAVAM o plano quando atingidos.
// Limite 3 existe para evitar galerias caóticas com dezenas de milhares de fotos.
//
// Exemplos com PLUS (8.000 créditos / 20 galerias / 2.000 por galeria):
//   → 20 galerias × 400 fotos  (distribuição uniforme)
//   → 4 galerias  × 2.000 fotos (poucas galerias, bem cheias)
//   → 1 galeria   × 2.000 fotos + 18 galerias pequenas
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
  PREMIUM: 100,
};

// Hard cap por galeria — varia por plano, reflete a densidade esperada
export const MAX_PHOTOS_PER_GALLERY_BY_PLAN: Record<PlanKey, number> = {
  FREE: 150,
  START: 300,
  PLUS: 600,
  PRO: 800,
  PREMIUM: 1_000,
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

// =============================================================================
// 🛡️ PERMISSIONS — Mapa completo de permissões por plano
// =============================================================================

export interface PlanPermissions {
  // Capacidade (sistema flexível com dois hard caps)
  photoCredits: number; // Pool total — trava ao esgotar
  maxGalleries: number; // Hard cap de galerias — trava ao atingir
  maxPhotosPerGallery: number; // Hard cap por galeria — varia por plano
  teamMembers: number;

  // Presença Digital
  profileLevel: 'basic' | 'standard' | 'advanced' | 'seo';
  profileCarouselLimit: number;
  profileListLimit: number | 'unlimited';
  removeBranding: boolean;

  // Leads
  canCaptureLeads: boolean;
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
  keepOriginalFilenames: boolean;

  // Segurança
  privacyLevel: 'public' | 'private' | 'password' | 'expiration';

  // Personalização
  customizationLevel: 'default' | 'colors' | 'full';
  canCustomCategories: boolean;
}

export const PERMISSIONS_BY_PLAN: Record<PlanKey, PlanPermissions> = {
  FREE: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.FREE,
    maxGalleries: MAX_GALLERIES_BY_PLAN.FREE,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.FREE,
    teamMembers: 0,
    profileLevel: 'basic',
    profileCarouselLimit: 0,
    profileListLimit: 1,
    removeBranding: false,
    canCaptureLeads: false,
    canExportLeads: false,
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
    keepOriginalFilenames: false,
    privacyLevel: 'public',
    customizationLevel: 'default',
    canCustomCategories: false,
  },
  START: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.START,
    maxGalleries: MAX_GALLERIES_BY_PLAN.START,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.START,
    teamMembers: 0,
    profileLevel: 'standard',
    profileCarouselLimit: 1,
    profileListLimit: 10,
    removeBranding: false,
    canCaptureLeads: false,
    canExportLeads: false,
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
    keepOriginalFilenames: false,
    privacyLevel: 'private',
    customizationLevel: 'default',
    canCustomCategories: false,
  },
  PLUS: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.PLUS,
    maxGalleries: MAX_GALLERIES_BY_PLAN.PLUS,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PLUS,
    teamMembers: 2,
    profileLevel: 'standard',
    profileCarouselLimit: 1,
    profileListLimit: 20,
    removeBranding: false,
    canCaptureLeads: false,
    canExportLeads: false,
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
    keepOriginalFilenames: true,
    privacyLevel: 'private',
    customizationLevel: 'colors',
    canCustomCategories: true,
  },
  PRO: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.PRO,
    maxGalleries: MAX_GALLERIES_BY_PLAN.PRO,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PRO,
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
  },
  PREMIUM: {
    photoCredits: PHOTO_CREDITS_BY_PLAN.PREMIUM,
    maxGalleries: MAX_GALLERIES_BY_PLAN.PREMIUM,
    maxPhotosPerGallery: MAX_PHOTOS_PER_GALLERY_BY_PLAN.PREMIUM,
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
    privacyLevel: 'expiration',
    customizationLevel: 'full',
    canCustomCategories: true,
  },
};

// =============================================================================
// 📦 PLAN INFO — Informações de display por segmento
// =============================================================================

export interface PlanInfo {
  name: string;
  price: number;
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
      yearlyPrice: 0,
      maxGalleries: MAX_GALLERIES_BY_PLAN.FREE,
      icon: Zap,
      cta: 'Começar Grátis',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Start',
      price: 29,
      yearlyPrice: 24,
      maxGalleries: MAX_GALLERIES_BY_PLAN.START,
      icon: Rocket,
      cta: 'Evoluir',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Plus',
      price: 49,
      yearlyPrice: 39,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PLUS,
      icon: Star,
      cta: 'Crescer',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Pro',
      price: 89,
      yearlyPrice: 74,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Dominar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Premium',
      price: 119,
      yearlyPrice: 99,
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
      yearlyPrice: 0,
      maxGalleries: MAX_GALLERIES_BY_PLAN.FREE,
      icon: Zap,
      cta: 'Testar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Event',
      price: 99,
      yearlyPrice: 79,
      maxGalleries: MAX_GALLERIES_BY_PLAN.START,
      icon: Rocket,
      cta: 'Iniciar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Plus',
      price: 159,
      yearlyPrice: 129,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PLUS,
      icon: Star,
      cta: 'Expandir',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Club',
      price: 249,
      yearlyPrice: 199,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Assinar Club',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Enterprise',
      price: 499,
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
      yearlyPrice: 0,
      maxGalleries: MAX_GALLERIES_BY_PLAN.FREE,
      icon: Shield,
      cta: 'Começar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Bronze',
      price: 199,
      yearlyPrice: 159,
      maxGalleries: MAX_GALLERIES_BY_PLAN.START,
      icon: Medal,
      cta: 'Plano Bronze',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Prata',
      price: 399,
      yearlyPrice: 329,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PLUS,
      icon: Award,
      cta: 'Plano Prata',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Ouro',
      price: 799,
      yearlyPrice: 659,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Plano Ouro',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Majoritário',
      price: 1499,
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
      yearlyPrice: 0,
      maxGalleries: MAX_GALLERIES_BY_PLAN.FREE,
      icon: Layout,
      cta: 'Começar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Essential',
      price: 149,
      yearlyPrice: 119,
      maxGalleries: MAX_GALLERIES_BY_PLAN.START,
      icon: Rocket,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Advanced',
      price: 299,
      yearlyPrice: 249,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PLUS,
      icon: Star,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Mandato',
      price: 599,
      yearlyPrice: 499,
      maxGalleries: MAX_GALLERIES_BY_PLAN.PRO,
      icon: Crown,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Vanguard',
      price: 999,
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
    label: 'Galerias Ativas (máximo)',
    values: [
      '3 galerias',
      '10 galerias',
      '20 galerias',
      '50 galerias',
      '200 galerias',
    ],
    tooltip: 'Limite máximo de galerias simultâneas — trava ao atingir',
  },
  {
    group: 'Gestão',
    label: 'Fotos por Galeria (máximo)',
    values: [
      '300 fotos',
      '500 fotos',
      '1.000 fotos',
      '1.500 fotos',
      '3.000 fotos',
    ],
    tooltip: 'Limite por galeria individual — trava ao atingir',
  },
  {
    group: 'Gestão',
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
    label: 'Controle de Acesso',
    values: [
      'Link Público',
      'Link Privado',
      'Link Privado',
      '+ Proteção por Senha',
      '+ Link com Expiração',
    ],
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
// 📖 FEATURE DESCRIPTIONS — Labels e descrições para tooltips na UI
// Cole este bloco no seu plans.ts APÓS a interface PlanPermissions.
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
  customizationLevel: {
    label: 'Personalização Visual',
    description:
      'Controla o nível de customização da interface da galeria: tema padrão, cores do grid ou fundo personalizado completo.',
  },
  keepOriginalFilenames: {
    label: 'Nomes de Arquivo',
    description:
      'Preserva os nomes originais dos arquivos no download. Sem este recurso, os arquivos recebem nomes aleatórios.',
  },
  tagSelectionMode: {
    label: 'Modo de Seleção',
    description:
      'Define como as fotos podem ser selecionadas: manual (uma a uma), em lote (múltiplas de vez) ou automático por pastas do Drive.',
  },
};
