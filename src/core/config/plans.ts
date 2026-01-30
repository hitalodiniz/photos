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

/**
 * Interface técnica para o motor de permissões.
 * Ajustada para refletir exatamente os novos grupos da tabela visual.
 */
export interface PlanPermissions {
  // Gestão
  maxGalleries: number;
  maxPhotosPerGallery: number; // implementado no google-drive.ts -> resolvePhotoLimitByPlan
  teamMembers: number;

  // Divulgação do Perfil
  profileLevel: 'basic' | 'standard' | 'advanced' | 'seo';
  profileCarouselLimit: number;
  profileListLimit: number | 'unlimited';
  removeBranding: boolean; // Atrelado ao Rodapé (Footer)

  // Cadastro de visitantes (Leads)
  canCaptureLeads: boolean;
  canExportLeads: boolean;

  // Galeria & Experiência
  socialDisplayLevel: 'minimal' | 'social' | 'full';
  canFavorite: boolean;
  canDownloadFavoriteSelection: boolean;
  canShowSlideshow: boolean;
  maxGridColumns: number;
  maxTags: number;
  tagSelectionMode: 'manual' | 'bulk' | 'drive';
  zipSizeLimit: string; // Ex: '500KB', '3MB' -- implementado no url-helpers.ts -> resolveResolutionByPlan
  maxExternalLinks: number;
  canCustomLinkLabel: boolean;

  // Segurança & Automação
  privacyLevel: 'public' | 'private' | 'password' | 'expiration';
  keepOriginalFilenames: boolean;
  customizationLevel: 'default' | 'colors' | 'full';

  // WhatsApp & Mensagens
  canCustomWhatsApp: boolean; //Permite editar os templates de GALLERY_MESSAGES

  // Categorias
  canCustomCategories: boolean; //Permite criar categorias fora da GALLERY_CATEGORIES
}

export interface PlanInfo {
  name: string;
  price: number; // Mensal
  yearlyPrice: number; // Valor da parcela no anual (com desconto)
  maxGalleries: number;
  icon: any;
  cta: string;
  permissions: PlanPermissions;
}

// --- MASTER PERMISSIONS MAP ---
// Revisado para total coerência com os grupos visuais

export const PERMISSIONS_BY_PLAN: Record<PlanKey, PlanPermissions> = {
  FREE: {
    maxGalleries: 2,
    maxPhotosPerGallery: 80,
    teamMembers: 0,
    profileLevel: 'basic', // Avatar + Nome
    profileCarouselLimit: 0, // Imagem Padrão
    profileListLimit: 1, // Exibir 1 galeria
    removeBranding: false, // Marca do App
    canCaptureLeads: false,
    canExportLeads: false,
    canCustomWhatsApp: false, // Templates Padrão
    socialDisplayLevel: 'minimal', // Apenas Avatar
    canFavorite: false,
    canDownloadFavoriteSelection: false,
    canShowSlideshow: false,
    maxGridColumns: 3, // Fixo (3 colunas)
    maxTags: 0, // Categorias Padrão
    tagSelectionMode: 'manual',
    zipSizeLimit: '500KB',
    maxExternalLinks: 0,
    canCustomLinkLabel: false,
    privacyLevel: 'public', // Link Público
    keepOriginalFilenames: false, // Nomes Aleatórios
    customizationLevel: 'default', // Tema Editorial
    canCustomCategories: false, // Categorias Padrão
  },
  START: {
    maxGalleries: 10,
    maxPhotosPerGallery: 200,
    teamMembers: 0,
    profileLevel: 'standard', // + Bio + Localização
    profileCarouselLimit: 1, // 1 Foto Personalizada
    profileListLimit: 10, // Exibir até 10
    removeBranding: false,
    canCaptureLeads: false,
    canExportLeads: false,
    canCustomWhatsApp: false,
    socialDisplayLevel: 'social', // + Atalho WhatsApp
    canFavorite: true, // + Favoritar (Coração)
    canDownloadFavoriteSelection: false,
    canShowSlideshow: false,
    maxGridColumns: 4, // Escolha (3 ou 4)
    maxTags: 0, // Categorias Padrão
    tagSelectionMode: 'manual',
    zipSizeLimit: '1MB',
    maxExternalLinks: 1, // 1 Link Direto
    canCustomLinkLabel: false,
    privacyLevel: 'private', // Link Privado
    keepOriginalFilenames: false,
    customizationLevel: 'default',
    canCustomCategories: false,
  },
  PLUS: {
    maxGalleries: 20,
    maxPhotosPerGallery: 400,
    teamMembers: 2, // + 2 Colaboradores
    profileLevel: 'standard', // + Áreas de Atuação
    profileCarouselLimit: 1,
    profileListLimit: 20, // Exibir até 20
    removeBranding: false,
    canCaptureLeads: false,
    canExportLeads: false,
    canCustomWhatsApp: false,
    socialDisplayLevel: 'social', // + Link Instagram
    canFavorite: true,
    canDownloadFavoriteSelection: true, // + Baixar seleção (Filtro)
    canShowSlideshow: false,
    maxGridColumns: 5, // Escolha (3 a 5)
    maxTags: 7, // + Categorias Próprias
    tagSelectionMode: 'manual',
    zipSizeLimit: '1.5MB',
    maxExternalLinks: 2, // 2 Links Diretos
    canCustomLinkLabel: false,
    privacyLevel: 'private',
    keepOriginalFilenames: true, // Nomes Originais
    customizationLevel: 'colors', // + Cores do Grid
    canCustomCategories: true, // + Categorias Próprias
  },
  PRO: {
    maxGalleries: 50,
    maxPhotosPerGallery: 600,
    teamMembers: 5, // + 5 Colaboradores
    profileLevel: 'advanced', // + Subdomínio + SEO
    profileCarouselLimit: 3, // + Carrossel (3 fotos)
    profileListLimit: 'unlimited', // Portfólio Completo
    removeBranding: false,
    canCaptureLeads: true, // Coleta de Leads (Whats)
    canExportLeads: true, // Exportação (CSV/XLS)
    canCustomWhatsApp: true, // + Edição Customizada
    socialDisplayLevel: 'full', // + Link Perfil Full
    canFavorite: true,
    canDownloadFavoriteSelection: true,
    canShowSlideshow: true, // + Modo Slideshow
    maxGridColumns: 6, // Até 6 colunas
    maxTags: 12, // + Filtros por Tags
    tagSelectionMode: 'bulk', // + Seleção em Lote
    zipSizeLimit: '2MB',
    maxExternalLinks: 5, // Até 5 Links (Custom)
    canCustomLinkLabel: true,
    privacyLevel: 'password', // + Proteção por Senha
    keepOriginalFilenames: true,
    customizationLevel: 'colors',
    canCustomCategories: true,
  },
  PREMIUM: {
    maxGalleries: 9999,
    maxPhotosPerGallery: 1000,
    teamMembers: 99, // Acessos Ilimitados
    profileLevel: 'seo', // + Subdomínio + SEO (Nível Máximo)
    profileCarouselLimit: 5, // + Carrossel (5 fotos)
    profileListLimit: 'unlimited',
    removeBranding: true, // White Label (Sem Marca)
    canCaptureLeads: true,
    canExportLeads: true,
    canCustomWhatsApp: true,
    socialDisplayLevel: 'full', // + Website Direto
    canFavorite: true,
    canDownloadFavoriteSelection: true,
    canShowSlideshow: true,
    maxGridColumns: 8, // Até 8 colunas
    maxTags: 30, // + Auto-Tags (Pastas)
    tagSelectionMode: 'drive',
    zipSizeLimit: '3MB',
    maxExternalLinks: 10, // Até 10 Links (Custom)
    canCustomLinkLabel: true,
    privacyLevel: 'expiration', // + Link com Expiração
    keepOriginalFilenames: true,
    customizationLevel: 'full', // + Fundo Personalizado
    canCustomCategories: true,
  },
};

// --- SEGMENTED PLANS ---
// Injeta automaticamente as permissões baseadas na PlanKey

export const PLANS_BY_SEGMENT: Record<
  SegmentType,
  Record<PlanKey, PlanInfo>
> = {
  PHOTOGRAPHER: {
    FREE: {
      name: 'Free',
      price: 0,
      yearlyPrice: 0,
      maxGalleries: 2,
      icon: Zap,
      cta: 'Começar Grátis',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Start',
      price: 29,
      yearlyPrice: 24,
      maxGalleries: 10,
      icon: Rocket,
      cta: 'Evoluir',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Plus',
      price: 49,
      yearlyPrice: 39,
      maxGalleries: 20,
      icon: Star,
      cta: 'Crescer',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Pro',
      price: 89,
      yearlyPrice: 74,
      maxGalleries: 50,
      icon: Crown,
      cta: 'Dominar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Premium',
      price: 119,
      yearlyPrice: 99,
      maxGalleries: 9999,
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
      maxGalleries: 1,
      icon: Zap,
      cta: 'Testar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Event',
      price: 99,
      yearlyPrice: 79,
      maxGalleries: 10,
      icon: Rocket,
      cta: 'Iniciar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Plus',
      price: 159,
      yearlyPrice: 129,
      maxGalleries: 25,
      icon: Star,
      cta: 'Expandir',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Club',
      price: 249,
      yearlyPrice: 199,
      maxGalleries: 50,
      icon: Crown,
      cta: 'Assinar Club',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Enterprise',
      price: 499,
      yearlyPrice: 399,
      maxGalleries: 9999,
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
      maxGalleries: 1,
      icon: Shield,
      cta: 'Começar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Bronze',
      price: 199,
      yearlyPrice: 159,
      maxGalleries: 10,
      icon: Medal,
      cta: 'Plano Bronze',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Prata',
      price: 399,
      yearlyPrice: 329,
      maxGalleries: 25,
      icon: Award,
      cta: 'Plano Prata',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Ouro',
      price: 799,
      yearlyPrice: 659,
      maxGalleries: 50,
      icon: Crown,
      cta: 'Plano Ouro',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Majoritário',
      price: 1499,
      yearlyPrice: 1249,
      maxGalleries: 9999,
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
      maxGalleries: 1,
      icon: Layout,
      cta: 'Começar',
      permissions: PERMISSIONS_BY_PLAN.FREE,
    },
    START: {
      name: 'Essential',
      price: 149,
      yearlyPrice: 119,
      maxGalleries: 10,
      icon: Rocket,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.START,
    },
    PLUS: {
      name: 'Advanced',
      price: 299,
      yearlyPrice: 249,
      maxGalleries: 25,
      icon: Star,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PLUS,
    },
    PRO: {
      name: 'Mandato',
      price: 599,
      yearlyPrice: 499,
      maxGalleries: 50,
      icon: Crown,
      cta: 'Assinar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Vanguard',
      price: 999,
      yearlyPrice: 829,
      maxGalleries: 9999,
      icon: Sparkles,
      cta: 'Assinar VIP',
      permissions: PERMISSIONS_BY_PLAN.PREMIUM,
    },
  },
};

// --- VISUAL FEATURES (UI TABLE) ---
// Mantido para renderização da tabela de preços (Landing Page)
export const COMMON_FEATURES = [
  // --- GESTÃO ---
  { group: 'Gestão', label: 'Galerias Ativas', key: 'maxGalleries' },
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
  {
    group: 'Gestão',
    label: 'Capacidade por Galeria',
    values: ['80 fotos', '200 fotos', '400 fotos', '600 fotos', '1000 fotos'],
  },

  // --- IDENTIDADE & DIVULGAÇÃO ---
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

  // --- LEADS & RELACIONAMENTO ---
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

  // --- EXPERIÊNCIA DA GALERIA ---
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

  // --- ENTREGA & SEGURANÇA ---
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

  return {
    ...config,
    plans: PLANS_BY_SEGMENT[config.segment as SegmentType],
  };
}
