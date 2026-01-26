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
  Briefcase,
} from 'lucide-react';

export type SegmentType = 'PHOTOGRAPHER' | 'EVENT' | 'CAMPAIGN' | 'OFFICE';
export type PlanKey = 'FREE' | 'START' | 'PLUS' | 'PRO' | 'PREMIUM';

// 🎯 Planos individuais e nichados para cada segmento (5 por grupo)
export const PLANS_BY_SEGMENT: Record<SegmentType, Record<PlanKey, any>> = {
  PHOTOGRAPHER: {
    FREE: {
      name: 'Free',
      price: 0,
      maxGalleries: 1,
      icon: Zap,
      cta: 'Começar Grátis',
    },
    START: {
      name: 'Start',
      price: 29.0,
      maxGalleries: 10,
      icon: Rocket,
      cta: 'Evoluir',
    },
    PLUS: {
      name: 'Plus',
      price: 49.0,
      maxGalleries: 25,
      icon: Star,
      cta: 'Crescer',
    },
    PRO: {
      name: 'Pro',
      price: 89.0,
      maxGalleries: 50,
      icon: Crown,
      cta: 'Dominar',
    },
    PREMIUM: {
      name: 'Premium',
      price: 119.0,
      maxGalleries: Infinity,
      icon: Sparkles,
      cta: 'Elite',
    },
  },
  EVENT: {
    FREE: {
      name: 'Free Trial',
      price: 0,
      maxGalleries: 1,
      icon: Zap,
      cta: 'Testar',
    },
    START: {
      name: 'Event',
      price: 99.0,
      maxGalleries: 10,
      icon: Rocket,
      cta: 'Iniciar',
    },
    PLUS: {
      name: 'Plus',
      price: 159.0,
      maxGalleries: 25,
      icon: Star,
      cta: 'Expandir',
    },
    PRO: {
      name: 'Club',
      price: 249.0,
      maxGalleries: 50,
      icon: Crown,
      cta: 'Assinar Club',
    },
    PREMIUM: {
      name: 'Enterprise',
      price: 499.0,
      maxGalleries: Infinity,
      icon: Gem,
      cta: 'Experience',
    },
  },
  CAMPAIGN: {
    FREE: {
      name: 'Militante',
      price: 0,
      maxGalleries: 1,
      icon: Shield,
      cta: 'Começar',
    },
    START: {
      name: 'Bronze',
      price: 199.0,
      maxGalleries: 10,
      icon: Medal,
      cta: 'Plano Bronze',
    },
    PLUS: {
      name: 'Prata',
      price: 399.0,
      maxGalleries: 25,
      icon: Award,
      cta: 'Plano Prata',
    },
    PRO: {
      name: 'Ouro',
      price: 799.0,
      maxGalleries: 50,
      icon: Crown,
      cta: 'Plano Ouro',
    },
    PREMIUM: {
      name: 'Majoritário',
      price: 1499.0,
      maxGalleries: Infinity,
      icon: Sparkles,
      cta: 'Plano VIP',
    },
  },
  OFFICE: {
    FREE: {
      name: 'Básico',
      price: 0,
      maxGalleries: 1,
      icon: Layout,
      cta: 'Começar',
    },
    START: {
      name: 'Essential',
      price: 149.0,
      maxGalleries: 10,
      icon: Rocket,
      cta: 'Assinar',
    },
    PLUS: {
      name: 'Advanced',
      price: 299.0,
      maxGalleries: 25,
      icon: Star,
      cta: 'Assinar',
    },
    PRO: {
      name: 'Mandato',
      price: 599.0,
      maxGalleries: 50,
      icon: Crown,
      cta: 'Assinar',
    },
    PREMIUM: {
      name: 'Vanguard',
      price: 999.0,
      maxGalleries: Infinity,
      icon: Sparkles,
      cta: 'Assinar VIP',
    },
  },
};

// 🎯 Recursos mapeados para os 5 planos (Arrays de 5 posições)
export const COMMON_FEATURES = [
  { group: 'Gestão', label: 'Galerias Ativas', key: 'maxGalleries' },
  {
    group: 'Gestão',
    label: 'Equipe',
    values: ['Apenas Dono', '+1 Chave', '+3 Chaves', '+5 Chaves', 'Ilimitadas'],
  },
  // {
  //   group: 'Gestão',
  //   label: 'Sync Google Drive',
  //   values: [
  //     'Manual',
  //     'Automática (1h)',
  //     'Automática (30m)',
  //     'Automática (15min)',
  //     'Real-time',
  //   ],
  // },
  {
    group: 'Gestão',
    label: 'Status da Galeria',
    values: [
      false,
      'Ativa/Lix',
      'Ativa/Arq/Lix',
      'Ativa/Arq/Lix',
      '+Agendamento',
    ],
  },

  {
    group: 'Divulgação',
    label: 'Perfil Público',
    values: [
      'Básico',
      'Full (Bio+Cidades)',
      'Full (Bio+Cidades+Áreas)',
      '+ Subdomínio + SEO Básico',
      '+SEO Otimizado',
    ],
  },
  {
    group: 'Divulgação',
    label: 'Capa do Perfil',
    values: [
      'Foto aleatória',
      '1 Foto própria',
      '1 Foto própria',
      'Até 3 fotos carrossel',
      'Até 5 fotos carrossel',
    ],
  },
  {
    group: 'Divulgação',
    label: 'Listagem no Perfil',
    values: [
      'Apenas Recente',
      'Até 10',
      'Até 20',
      'Todas (Categ)',
      'Busca + Filtros',
    ],
  },

  {
    group: 'Cadastro de visitantes',
    label: 'Cadastro Visitante',
    values: [
      false,
      false,
      'Nome/e-mail',
      'Nome/e-mail/Whatsapp',
      '+Customização (LGPD)',
    ],
  },
  {
    group: 'Cadastro de visitantes',
    label: 'Exportação Dados',
    values: [false, false, 'CSV/XLS/PDF', 'CSV/XLS/PDF', 'CSV/XLS/PDF'],
  },

  {
    group: 'Galeria de fotos',
    label: 'Exibição de perfil',
    values: [
      'Nome+Avatar',
      '+Whatsapp',
      '+Instagram',
      '+Link Perfil',
      '+WebSite',
    ],
  },
  {
    group: 'Galeria de fotos',
    label: 'Seleção / Prova',
    values: [
      'Visualização',
      'Like (Coração)',
      'Seleção p/ Download',
      'Seleção p/ Download',
      'Seleção + Prova',
    ],
  },
  {
    group: 'Galeria de fotos',
    label: 'Layout do Grid',
    values: [
      'Fixo (3 col)',
      'Escolha (3 ou 4)',
      'Escolha (3 ou 5)',
      'Até 6 colunas',
      'Até 8 colunas',
    ],
  },
  {
    group: 'Galeria de fotos',
    label: 'Download fotos ZIP',
    values: [false, 'Sim', 'Sim', 'Sim', 'Alta Resolução'],
  },
  {
    group: 'Galeria de fotos',
    label: 'Download fotos alta resolção link externo',
    values: [false, '1 link', '2 links', '5 links', '10 links'],
  },

  {
    group: 'Branding',
    label: 'Identidade Visual',
    values: [
      'Padrão App',
      'Cores Cliente',
      'Cores + Logo',
      'Cores + Logo',
      'White Label (Total)',
    ],
  },
  {
    group: 'Branding',
    label: 'Rodapé (Footer)',
    values: [
      'Marca App',
      'Créditos Simples',
      "Marca d'água",
      "Marca d'água",
      'Sem Marcas',
    ],
  },

  {
    group: 'Dados',
    label: 'Analytics',
    values: [false, 'Global', 'Top 10 Fotos', 'Dashboard', 'Completo + Logs'],
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
