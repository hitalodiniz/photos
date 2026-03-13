import { ExternalLink } from 'lucide-react';

// src/core/config/help-content.tsx

export const HELP_CONTENT = {
  // --- ARMAZENAMENTO E LIMITES (A BASE DO SEU SAAS) ---
  STORAGE: {
    GALLERIES: {
      title: 'Galerias disponíveis',
      /** Use {{hardCap}} e {{maxPhotosPerGallery}} para interpolar os limites do plano. */
      content:
        'Seu plano permite até {{hardCap}} galerias. O limite é dinâmico: os créditos restantes no seu pool definem quantas galerias você ainda pode criar — você pode distribuir esses créditos entre várias galerias ou usar tudo em uma só. Cada galeria deve respeitar sempre o limite máximo de {{maxPhotosPerGallery}} arquivos por galeria do plano.',
    },
    /** Texto do badge quando a cota está limitando o número de galerias (effectiveMax < hardCap). */
    POOL_LIMITING_LABEL: 'cota',
    POOL: {
      title: 'Cota de arquivos',
      /** Use {{maxPhotosPerGallery}} para interpolar o teto por galeria do plano. */
      content:
        'Limite total de fotos e vídeos que o sistema pode processar e exibir do seu Google Drive. Os arquivos permanecem no Drive; a cota é só o limite de exibição na plataforma. Os créditos restantes no pool são para as próximas galerias; o limite por galeria é dinâmico conforme o uso, sempre respeitando o máximo de {{maxPhotosPerGallery}} arquivos por galeria do plano.',
    },
    REMAINING: {
      title: 'Saldo Restante',
      content:
        'Quantidade de arquivos que você ainda pode vincular e exibir (a partir do Google Drive) antes de atingir o teto da sua cota no plano atual.',
    },
  },
  // --- CONFIGURAÇÕES BÁSICAS DA GALERIA ---
  GALLERY: {
    ACCESS: {
      title: 'Acesso restrito',
      content:
        'Para acessar uma galeria protegida por senha, o visitante deve informar a senha cadastrada nesta tela. Sem senha, qualquer pessoa com o link pode acessar.',
    },
    EXPIRATION: {
      title: 'Expiração',
      content:
        'Se ativada, a galeria ficará indisponível para acesso após esta data.',
    },
    PROFILE_LIST: {
      title: 'Listar no Perfil',
      content:
        'Se ativado, esta galeria será visível na sua página de perfil pública para todos os visitantes.',
    },
    RENAME_FILES: {
      title: 'Renomear fotos',
      content:
        'Se habilitado, padroniza o nome das fotos para "foto-1.jpg", "foto-2.jpg", etc. Ideal para manter a ordem no download do cliente.',
    },
  },

  // --- DESIGN E INTERFACE ---
  DESIGN: {
    BG_PHOTO: {
      title: 'Foto de fundo',
      content:
        'Usa a foto selecionada como fundo da grade de fotos da página da galeria acessada pelo visitante.',
    },
    BG_COLOR: {
      title: 'Cor de fundo',
      content:
        'Define a cor sólida do grid de fotos da página da galeria acessada pelo visitante.',
    },
    GRID: {
      title: 'Colunas do Grid',
      content:
        'Ajuste o número de colunas por dispositivo: Mobile, Tablet e Desktop para otimizar a visualização.',
    },
  },

  // --- INTERAÇÃO DO VISITANTE ---
  INTERACTION: {
    FAVORITES: {
      title: 'Sistema de Favoritos',
      content:
        'Permite que o visitante selecione fotos favoritas para baixar separadamente ou organizar sua seleção.',
    },
    SLIDESHOW: {
      title: 'Modo Slideshow',
      content:
        'Apresentação automática de fotos em tela cheia para uma experiência imersiva do cliente.',
    },
  },

  // --- RELATÓRIOS E MÉTRICAS ---
  REPORTS: {
    FULL_DOWNLOAD: {
      title: 'Downloads Completos',
      content:
        'Downloads de todas as fotos da galeria por arquivo ZIP, mesmo que sejam favoritas.',
    },
    FAV_DOWNLOAD: {
      title: 'Downloads Favoritas',
      content: 'Downloads de fotos favoritas do visitante por arquivo ZIP.',
    },
    SHARE: {
      title: 'Compartilhamentos',
      content:
        'Contabiliza quantas vezes o link da galeria foi compartilhado via WhatsApp.',
    },
  },
};
