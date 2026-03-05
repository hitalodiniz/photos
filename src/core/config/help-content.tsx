import { ExternalLink } from 'lucide-react';

// src/core/config/help-content.tsx

export const HELP_CONTENT = {
  // --- ARMAZENAMENTO E LIMITES (A BASE DO SEU SAAS) ---
  STORAGE: {
    GALLERIES: {
      title: 'Galerias disponíveis',
      content:
        'Número total de galerias ativas permitidas no seu plano. Se atingir o limite, você pode arquivar ou apagar galerias antigas para liberar novas vagas.',
    },
    POOL: {
      title: 'Arquivos publicados',
      content:
        "É o seu 'estoque' total de fotos e vídeos. Esse limite é compartilhado entre todas as suas galerias. Se você apagar arquivos de uma galeria, o espaço volta para o seu estoque imediatamente.",
    },
    REMAINING: {
      title: 'Saldo Restante',
      content:
        'Quantidade de arquivos que você ainda pode publicar antes de atingir o teto do seu plano atual.',
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
