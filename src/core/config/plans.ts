import { PlanGuard } from '@/components/auth/PlanGuard';
import { a } from 'framer-motion/client';
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
import { boolean } from 'zod';
import { de, no, da } from 'zod/locales';

export type SegmentType = 'PHOTOGRAPHER' | 'EVENT' | 'CAMPAIGN' | 'OFFICE';
export type PlanKey = 'FREE' | 'START' | 'PLUS' | 'PRO' | 'PREMIUM';

export const planOrder: PlanKey[] = ['FREE', 'START', 'PLUS', 'PRO', 'PREMIUM'];

export function findNextPlanWithFeature(
  currentPlanKey: PlanKey,
  featureName: keyof PlanPermissions,
  segment: SegmentType,
): PlanKey {
  const currentPlanIndex = planOrder.indexOf(currentPlanKey);
  if (currentPlanIndex === -1) return 'PREMIUM'; // Fallback se a chave atual não for encontrada

  // Percorre os planos a partir do plano atual
  for (let i = currentPlanIndex + 1; i < planOrder.length; i++) {
    const planKey = planOrder[i];
    const planPermissions = PERMISSIONS_BY_PLAN[planKey];
    const featureValue = planPermissions[featureName];

    let isFeatureAvailable = false;

    // Lógica para determinar se a feature está "disponível" neste plano
    if (typeof featureValue === 'boolean') {
      isFeatureAvailable = featureValue === true;
    } else if (typeof featureValue === 'number') {
      isFeatureAvailable = featureValue > 0;
    } else if (featureValue === 'unlimited') {
      isFeatureAvailable = true;
    } else if (typeof featureValue === 'string') {
      // Para as strings (e.g., profileLevel, socialDisplayLevel), consideramos "disponível"
      // se o valor do recurso for diferente do plano FREE,
      // indicando uma melhoria ou ativação do recurso.
      const freePlanFeatureValue = PERMISSIONS_BY_PLAN.FREE[featureName];
      isFeatureAvailable = featureValue !== freePlanFeatureValue;
    }

    if (isFeatureAvailable) {
      return planKey;
    }
  }

  return 'PREMIUM'; // Se não encontrar em nenhum plano superior, sugere o PREMIUM
}

/**
 * 🎨 Dicionário de labels e descrições amigáveis para o Upsell.
 * Serve para que o PlanGuard e o UpgradeModal saibam explicar o valor da feature.
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
      'Desbloqueie Bio, Localização e ferramentas de SEO no seu perfil.',
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
      'Permita que seus clientes selecionem e marquem as fotos favoritas.',
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
  maxTags: {
    label: 'Categorias e Filtros',
    description:
      'Crie categorias personalizadas para organizar grandes eventos.',
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
// Pendencias
// teamMembers	Tela de Configurações de Time / Convite de Colaboradores.
// profileLevel	Tela de Edição de Perfil (campos de Bio, Localização e SEO).
// profileCarouselLimit	Upload de fotos de capa no Perfil Profissional.
// removeBranding	Componente de Footer das galerias públicas.
// canExportLeads	Botão de "Exportar CSV" na listagem de contatos.
// canFavorite	Toggle de habilitar favoritos na galeria e exibição no front público.
//
// canCustomWhatsApp	Tela de edição de templates de mensagens de WhatsApp.

/**
 * Interface técnica para o motor de permissões.
 * Ajustada para refletir exatamente os novos grupos da tabela visual.
 */
export interface PlanPermissions {
  // Gestão
  maxGalleries: number; // implementado no galeria.actions.ts -> syncUserGalleriesAction
  maxPhotosPerGallery: number; // implementado no google-drive.ts -> resolvePhotoLimitByPlan - LimitUpgradeModal e GaleriaDriveSection
  teamMembers: number;

  // Divulgação do Perfil
  profileLevel: 'basic' | 'standard' | 'advanced' | 'seo';
  profileCarouselLimit: number;
  profileListLimit: number | 'unlimited'; // BT listar galeria no pefil travado
  removeBranding: boolean; // Atrelado ao Rodapé (Footer) -- Implementado

  // Cadastro de visitantes (Leads)
  canCaptureLeads: boolean; //Implementado no GaleriaFormContent através do PlanGuard envolvendo toda a seção de "Cadastro de Visitante"
  canExportLeads: boolean; //Não utilizado, pois o canCaptureLeads já bloqueia tudo, não tem a opção de ver

  // Galeria & Experiência
  socialDisplayLevel: 'minimal' | 'social' | 'full';
  maxCoverPerGallery: number;
  canFavorite: boolean;
  canDownloadFavoriteSelection: boolean;
  canShowSlideshow: boolean;
  maxGridColumns: number; //implementado no GalleryDesingFields.tsx
  maxTags: number;
  tagSelectionMode: 'manual' | 'bulk' | 'drive';
  zipSizeLimit: string; // Ex: '500KB', '3MB' -- implementado no url-helpers.ts -> resolveResolutionByPlan
  maxExternalLinks: number; //Implementado na sidebar de links; o botão "adicionar novo" bloqueia e abre o UpgradeModal ao atingir o limite
  canCustomLinkLabel: boolean; //Implementado com o overlay de cadeado (Lock) e desabilitação do input de label nos links de entrega.

  // Segurança & Automação
  privacyLevel: 'public' | 'password' | 'password' | 'password' | 'password'; //Implementado	Trava para as opções de "Senha" e "Expiração" no seletor de privacidade.
  keepOriginalFilenames: boolean; //Implementado através do PlanGuard envolvendo a seção de "Renomear arquivos" no formulário da galeria
  customizationLevel: 'default' | 'colors' | 'full'; //Implementado através do PlanGuard protegendo os seletores de "Cor de Fundo" e "Foto de Fundo" no design da galeria.

  // WhatsApp & Mensagens
  canCustomWhatsApp: boolean; //Permite editar os templates de GALLERY_MESSAGES

  // Categorias
  canCustomCategories: boolean; //Permite criar categorias fora da GALLERY_CATEGORIES implementado no CategorySelect.tsx -> handleOpenModal - Implementado no GalleryDesignFields
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
    maxCoverPerGallery: 1,
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
    maxCoverPerGallery: 1,
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
    privacyLevel: 'password', // Link Privado
    keepOriginalFilenames: false,
    customizationLevel: 'default',
    canCustomCategories: false,
  },
  PLUS: {
    maxGalleries: 20,
    maxPhotosPerGallery: 400,
    maxCoverPerGallery: 2,
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
    privacyLevel: 'password',
    keepOriginalFilenames: true, // Nomes Originais
    customizationLevel: 'colors', // + Cores do Grid
    canCustomCategories: true, // + Categorias Próprias
  },
  PRO: {
    maxGalleries: 50,
    maxPhotosPerGallery: 600,
    maxCoverPerGallery: 3,
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
    maxCoverPerGallery: 5,
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
    privacyLevel: 'password', // + Link com Expiração
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
      price: 79,
      yearlyPrice: 74,
      maxGalleries: 50,
      icon: Crown,
      cta: 'Dominar',
      permissions: PERMISSIONS_BY_PLAN.PRO,
    },
    PREMIUM: {
      name: 'Premium',
      price: 109,
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
    group: 'Perfil Público',
    label: 'Tamanho da Biográfia',
    values: [
      false,
      '150 caracteres',
      '250 caracteres',
      '400 caracteres',
      '400 caracteres',
    ],
  },
  {
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
    group: 'Experiência do Visitante',
    label: 'Contato no Visualizador',
    values: [
      'Avatar + Link Perfil',
      '+ Atalho WhatsApp',
      '+ Link Instagram',
      '+ Website Direto',
      '+ Website Direto',
    ],
  },
  {
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
    group: 'Experiência do Visitante',
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
    group: 'Experiência do Visitante',
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
    group: 'Experiência do Visitante',
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
      'Sequênciais númericos',
      'Sequênciais númericos',
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
