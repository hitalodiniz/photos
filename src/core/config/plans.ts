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
    const planPerms = PERMISSIONS_BY_PLAN[planKey];
    const currentPerms = PERMISSIONS_BY_PLAN[currentPlanKey];

    const nextValue = planPerms[featureName];
    const currentValue = currentPerms[featureName];

    if (typeof nextValue === 'boolean' && nextValue) return planKey;
    if (
      typeof nextValue === 'number' &&
      typeof currentValue === 'number' &&
      nextValue > currentValue
    )
      return planKey;
    if (nextValue === 'unlimited' && currentValue !== 'unlimited')
      return planKey;

    if (typeof nextValue === 'string' && typeof currentValue === 'string') {
      if ((levelWeights[nextValue] || 0) > (levelWeights[currentValue] || 0))
        return planKey;
    }
  }

  return 'PREMIUM';
}

/**
 * 🎨 Dicionário de labels e descrições amigáveis para o Upsell.
 */
export const FEATURE_DESCRIPTIONS: Record<
  keyof PlanPermissions,
  { label: string; description: string }
> = {
  maxGalleries: {
    label: 'Limite de Galerias',
    description:
      'Aumente o número de galerias ativas simultaneamente em sua conta.',
  },
  maxPhotosPerGallery: {
    label: 'Capacidade de Fotos',
    description: 'Aumente o limite de fotos permitidas em cada galeria.',
  },
  teamMembers: {
    label: 'Membros de Equipe',
    description:
      'Adicione colaboradores para gerenciar suas galerias com você.',
  },
  profileLevel: {
    label: 'Perfil Profissional',
    description:
      'Desbloqueie Bio, Cidades e Áreas de Atuação e ferramentas de SEO no seu perfil.',
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
    label: 'Remover Marca',
    description:
      'Remova a marca do app do rodapé da galeria e do seu perfil público.',
  },
  canCaptureLeads: {
    label: 'Cadastro de Visitantes',
    description:
      'Solicite nome, WhatsApp e e-mail dos visitantes antes de liberarem as fotos na galeria.',
  },
  canAccessStats: {
    label: 'Estatísticas da galeria',
    description:
      'Acesse as estatísticas da galeria para analisar o desempenho de suas fotos.',
  },
  canExportLeads: {
    label: 'Exportação de dados dos Visitantes',
    description: 'Exporte sua base de visitantes em CSV, Excel ou PDF.',
  },
  socialDisplayLevel: {
    label: 'Links de Contato',
    description:
      'Adicione botões diretos para seu WhatsApp, Instagram e Website.',
  },
  maxCoverPerGallery: {
    label: 'Fotos de Capa',
    description: 'Crie carrosséis de impacto na capa das suas galerias.',
  },
  canFavorite: {
    label: 'Sistema de Favoritos',
    description:
      'Permita que seus clientes selecionem e favoritem várias fotos de uma só vez, agilizando o processo de escolha.',
  },
  canDownloadFavoriteSelection: {
    label: 'Download de Seleção',
    description: 'Permita o download filtrado apenas das fotos favoritadas.',
  },
  canShowSlideshow: {
    label: 'Modo Slideshow',
    description: 'Habilite a apresentação automática de fotos em tela cheia.',
  },
  maxGridColumns: {
    label: 'Colunas da Grade',
    description:
      'Tenha mais liberdade para organizar o layout das fotos na galeria.',
  },
  canTagPhotos: {
    label: 'Marcações (tags)',
    description:
      'Crie marcações e filtros personalizados para organizar grandes galerias.',
  },
  tagSelectionMode: {
    label: 'Organização em Lote',
    description:
      'Organize suas fotos rapidamente através de pastas ou seleções em massa.',
  },
  zipSizeLimit: {
    label: 'Resolução de Download',
    description: 'Libere downloads em alta definição (HD) para seus clientes.',
  },
  maxExternalLinks: {
    label: 'Links de Entrega',
    description: 'Adicione botões externos para download de arquivos pesados.',
  },
  canCustomLinkLabel: {
    label: 'Nomes de Links Customizados',
    description: 'Dê nomes personalizados aos seus links de entrega externa.',
  },
  privacyLevel: {
    label: 'Proteção por Senha',
    description: 'Aumente a segurança das suas galerias com senhas.',
  },
  keepOriginalFilenames: {
    label: 'Preservar Nomes Originais',
    description: 'Mantenha os nomes originais dos arquivos durante o download.',
  },
  customizationLevel: {
    label: 'Personalização Visual',
    description:
      'Altere cores e fotos de fundo para criar galerias exclusivas.',
  },
  canCustomWhatsApp: {
    label: 'WhatsApp Customizado',
    description: 'Edite os templates das mensagens enviadas aos seus clientes.',
  },
  canCustomCategories: {
    label: 'Categorias Próprias',
    description: 'Crie nomes de categorias fora do padrão do sistema.',
  },
};

export interface PlanPermissions {
  maxGalleries: number;
  maxPhotosPerGallery: number;
  teamMembers: number;
  profileLevel: 'basic' | 'standard' | 'advanced' | 'seo';
  profileCarouselLimit: number;
  profileListLimit: number | 'unlimited';
  removeBranding: boolean;
  canCaptureLeads: boolean;
  canExportLeads: boolean;
  canAccessStats: boolean;
  socialDisplayLevel: 'minimal' | 'social' | 'full';
  maxCoverPerGallery: number;
  canFavorite: boolean;
  canDownloadFavoriteSelection: boolean;
  tagSelectionFavoriteMode: 'single' | 'multiple'; //não usada por enquanto
  canShowSlideshow: boolean;
  maxGridColumns: number;
  canTagPhotos: number;
  maxTags: number;
  tagSelectionMode: 'manual' | 'bulk' | 'drive';
  zipSizeLimit: string;
  maxExternalLinks: number;
  canCustomLinkLabel: boolean;
  privacyLevel: 'public' | 'password';
  keepOriginalFilenames: boolean;
  customizationLevel: 'default' | 'colors' | 'full';
  canCustomWhatsApp: boolean;
  canCustomCategories: boolean;
  isTrial?: boolean;
}

export interface PlanInfo {
  name: string;
  price: number;
  yearlyPrice: number;
  maxGalleries: number;
  icon: any;
  cta: string;
  permissions: PlanPermissions;
}

export const PERMISSIONS_BY_PLAN: Record<PlanKey, PlanPermissions> = {
  FREE: {
    maxGalleries: 2,
    maxPhotosPerGallery: 80,
    maxCoverPerGallery: 1,
    teamMembers: 0,
    profileLevel: 'basic',
    profileCarouselLimit: 0,
    profileListLimit: 1,
    removeBranding: false,
    canCaptureLeads: false,
    canExportLeads: false,
    canAccessStats: false,
    canCustomWhatsApp: false,
    socialDisplayLevel: 'minimal',
    canFavorite: false,
    canDownloadFavoriteSelection: false,
    canShowSlideshow: false,
    maxGridColumns: 3,
    canTagPhotos: 0,
    maxTags: 0,
    tagSelectionMode: 'manual',
    zipSizeLimit: '500KB',
    maxExternalLinks: 0,
    canCustomLinkLabel: false,
    privacyLevel: 'public',
    keepOriginalFilenames: false,
    customizationLevel: 'default',
    canCustomCategories: false,
    tagSelectionFavoriteMode: 'single',
  },
  START: {
    maxGalleries: 10,
    maxPhotosPerGallery: 200,
    maxCoverPerGallery: 1,
    teamMembers: 0,
    profileLevel: 'standard',
    profileCarouselLimit: 1,
    profileListLimit: 10,
    removeBranding: false,
    canCaptureLeads: false,
    canExportLeads: false,
    canAccessStats: false,
    canCustomWhatsApp: false,
    socialDisplayLevel: 'social',
    canFavorite: true,
    canDownloadFavoriteSelection: false,
    canShowSlideshow: false,
    maxGridColumns: 4,
    canTagPhotos: 0,
    maxTags: 0,
    tagSelectionMode: 'manual',
    zipSizeLimit: '1MB',
    maxExternalLinks: 1,
    canCustomLinkLabel: false,
    privacyLevel: 'password',
    keepOriginalFilenames: false,
    customizationLevel: 'default',
    canCustomCategories: false,
    tagSelectionFavoriteMode: 'single',
  },
  PLUS: {
    maxGalleries: 20,
    maxPhotosPerGallery: 400,
    maxCoverPerGallery: 2,
    teamMembers: 2,
    profileLevel: 'advanced',
    profileCarouselLimit: 1,
    profileListLimit: 20,
    removeBranding: false,
    canCaptureLeads: false,
    canExportLeads: false,
    canAccessStats: false,
    canCustomWhatsApp: false,
    socialDisplayLevel: 'social',
    canFavorite: true,
    canDownloadFavoriteSelection: true,
    canShowSlideshow: false,
    maxGridColumns: 5,
    canTagPhotos: 7,
    maxTags: 7,
    tagSelectionMode: 'manual',
    zipSizeLimit: '1.5MB',
    maxExternalLinks: 2,
    canCustomLinkLabel: false,
    privacyLevel: 'password',
    keepOriginalFilenames: true,
    customizationLevel: 'colors',
    canCustomCategories: true,
    tagSelectionFavoriteMode: 'single',
  },
  PRO: {
    maxGalleries: 50,
    maxPhotosPerGallery: 600,
    maxCoverPerGallery: 3,
    teamMembers: 5,
    profileLevel: 'seo',
    profileCarouselLimit: 3,
    profileListLimit: 'unlimited',
    removeBranding: false,
    canCaptureLeads: true,
    canExportLeads: true,
    canAccessStats: true,
    canCustomWhatsApp: true,
    socialDisplayLevel: 'full',
    canFavorite: true,
    canDownloadFavoriteSelection: true,
    canShowSlideshow: true,
    maxGridColumns: 8,
    canTagPhotos: 12,
    maxTags: 15,
    tagSelectionMode: 'bulk',
    zipSizeLimit: '2MB',
    maxExternalLinks: 5,
    canCustomLinkLabel: true,
    privacyLevel: 'password',
    keepOriginalFilenames: true,
    customizationLevel: 'colors',
    canCustomCategories: true,
    tagSelectionFavoriteMode: 'multiple',
  },
  PREMIUM: {
    maxGalleries: 9999,
    maxPhotosPerGallery: 1000,
    maxCoverPerGallery: 5,
    teamMembers: 99,
    profileLevel: 'seo',
    profileCarouselLimit: 5,
    profileListLimit: 'unlimited',
    removeBranding: true,
    canCaptureLeads: true,
    canExportLeads: true,
    canAccessStats: true,
    canCustomWhatsApp: true,
    socialDisplayLevel: 'full',
    canFavorite: true,
    canDownloadFavoriteSelection: true,
    canShowSlideshow: true,
    maxGridColumns: 8,
    canTagPhotos: 30,
    maxTags: 50,
    tagSelectionMode: 'drive',
    zipSizeLimit: '3MB',
    maxExternalLinks: 10,
    canCustomLinkLabel: true,
    privacyLevel: 'password',
    keepOriginalFilenames: true,
    customizationLevel: 'full',
    canCustomCategories: true,
    tagSelectionFavoriteMode: 'multiple',
  },
};

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
      price: 79,
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
      maxGalleries: 2,
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
      maxGalleries: 20,
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
      maxGalleries: 2,
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
      maxGalleries: 20,
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
      maxGalleries: 2,
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
      maxGalleries: 20,
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

export const COMMON_FEATURES = [
  // --- GESTÃO ---
  {
    key: 'maxGalleries', // 🎯 Ajustado: era 'active-galleries'
    group: 'Gestão',
    label: 'Galerias Ativas',
    values: ['2', '10', '20', '50', 'Ilimitadas'],
  },
  {
    key: 'canAccessStats', // 🎯 Ajustado: era 'access-stats'
    group: 'Gestão',
    label: 'Estatísticas da galeria',
    values: [false, false, false, true, true],
  },
  {
    key: 'teamMembers', // 🎯 Ajustado: era 'team-members-ui'
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
    key: 'maxPhotosPerGallery', // 🎯 Ajustado: era 'photo-capacity'
    group: 'Gestão',
    label: 'Capacidade por Galeria',
    values: ['80 fotos', '200 fotos', '400 fotos', '600 fotos', '1000 fotos'],
  },

  // --- IDENTIDADE & DIVULGAÇÃO ---
  {
    key: 'profileLevel', // 🎯 Ajustado: era 'professional-profile'
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
    key: 'profileCarouselLimit', // 🎯 Ajustado: era 'profile-cover'
    group: 'Perfil Público',
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
    key: 'profileListLimit', // 🎯 Ajustado: era 'gallery-catalog'
    group: 'Perfil Público',
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
    key: 'removeBranding', // 🎯 Ajustado: era 'branding-footer'
    group: 'Perfil Público',
    label: 'Branding (Rodapé)',
    values: [
      'Marca do App',
      'Marca do App',
      'Identidade do Autor',
      'Identidade do Autor',
      'Identidade do Autor',
    ],
  },

  // --- LEADS & RELACIONAMENTO ---
  {
    key: 'canCaptureLeads', // 🎯 Ajustado: era 'access-form'
    group: 'Cadastro de visitantes',
    label: 'Formulário de Acesso',
    values: [
      false,
      false,
      false,
      'Nome, e-Mail e Whatsapp',
      'Nome, e-Mail e Whatsapp',
    ],
  },
  {
    key: 'canExportLeads', // 🎯 Ajustado: era 'lead-management'
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
    key: 'canCustomWhatsApp', // 🎯 Ajustado: era 'whatsapp-messages'
    group: 'Cadastro de visitantes',
    label: 'Mensagens de WhatsApp',
    values: [
      'Templates Padrão',
      'Templates Padrão',
      '+ Edição Customizada',
      '+ Edição Customizada',
      '+ Edição Customizada',
    ],
  },

  // --- EXPERIÊNCIA DA GALERIA ---
  {
    key: 'socialDisplayLevel', // 🎯 Ajustado: era 'viewer-contact'
    group: 'Experiência do Visitante',
    label: 'Contato no avatar profissional',
    values: [
      'Avatar + Link Perfil',
      '+ Atalho WhatsApp',
      '+ Link Instagram',
      '+ Website Direto',
      '+ Website Direto',
    ],
  },
  {
    key: 'maxCoverPerGallery', // 🎯 Ajustado: era 'gallery-cover'
    group: 'Experiência do Visitante',
    label: 'Capa da galeria',
    values: [
      '1 Foto',
      '1 Foto',
      'Carrossel (2 fotos)',
      'Carrossel (3 fotos)',
      'Carrossel (5 fotos)',
    ],
  },
  {
    key: 'canFavorite', // 🎯 Ajustado: era 'photo-interaction'
    group: 'Experiência do Visitante',
    label: 'Interação com Fotos',
    values: [
      'Visualização',
      '+ Favoritar (Coração)',
      '+ Filtro de Favoritas',
      '+ Filtro de Favoritas',
      '+ Filtro de Favoritas',
    ],
  },
  {
    key: 'canShowSlideshow', // 🎯 Ajustado: era 'slider-features'
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
    key: 'canTagPhotos', // 🎯 Ajustado: era 'org-tags'
    group: 'Experiência do Visitante',
    label: 'Organização de fotos',
    values: [
      false,
      false,
      false,
      'Organização por marcações (tags)',
      'Organização por marcações (tags)',
    ],
  },
  {
    key: 'maxGridColumns', // 🎯 Ajustado: era 'grid-custom'
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
    key: 'customizationLevel', // 🎯 Ajustado: era 'interface-design'
    group: 'Experiência do Visitante',
    label: 'Design da Interface',
    values: [
      'Tema Editorial',
      'Tema Editorial',
      '+ Cores do Grid',
      '+ Cores do Grid',
      '+ Cores do Grid',
    ],
  },

  // --- ENTREGA & SEGURANÇA ---
  {
    key: 'zipSizeLimit', // 🎯 Ajustado: era 'zip-limit-ui'
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
    key: 'maxExternalLinks', // 🎯 Ajustado: era 'external-links-ui'
    group: 'Entrega de Arquivos',
    label: 'Links de Download Externos',
    values: [
      false,
      '1 Link Direto',
      '2 Links Diretos',
      'Até 5 Links',
      'Até 10 Links',
    ],
  },
  {
    key: 'keepOriginalFilenames', // 🎯 Ajustado: era 'data-preservation'
    group: 'Entrega de Arquivos',
    label: 'Preservação de Dados',
    values: [
      'Sequenciais',
      'Sequenciais',
      'Nomes Originais',
      'Nomes Originais',
      'Nomes Originais',
    ],
  },
  {
    key: 'privacyLevel', // 🎯 Ajustado: era 'access-control'
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
