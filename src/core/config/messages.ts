// src/constants/messages.ts
import { SEGMENT_DICTIONARY, SegmentType } from '@/core/config/segments';

// 1. Função interna de detecção (Pega do HTML se estiver no browser ou do .env no server)
const getActiveTerms = () => {
  if (typeof window !== 'undefined') {
    const active = document.documentElement.getAttribute(
      'data-segment',
    ) as SegmentType;
    if (active) return SEGMENT_DICTIONARY[active];
  }
  const segment =
    (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER';
  return SEGMENT_DICTIONARY[segment];
};

export const GALLERY_MESSAGES = {
  // Mensagens de compartilhamento de galeria
  CARD_SHARE: (galeria_titulo: string, galeria_link: string) => {
    const terms = getActiveTerms();
    const itemTerm = terms.item === 'foto' ? 'ensaio fotográfico' : terms.item;
    return [
      'Olá! ✨',
      '',
      `As ${terms.items} do seu ${itemTerm} *${galeria_titulo}* estão prontas! 📸`,
      '',
      `Preparamos uma galeria exclusiva para você visualizar e baixar suas ${terms.items} em alta qualidade.`,
      '',
      '📍 *Acesse aqui:*',
      galeria_link,
      '',
      'Espero que goste! ✨',
      ' ',
      `💎 ${terms.site_name}`,
    ].join('\n');
  },

  // Mensagens de compartilhamento de item único
  PHOTO_SHARE: (galeria_titulo: string, galeria_link: string) => {
    const terms = getActiveTerms();
    return [
      'Olá! ✨',
      '',
      '✨ *Um detalhe especial para você...*',
      '',
      `Selecionei esta ${terms.item} da galeria *${galeria_titulo}* que acredito que você vai adorar! 📸`,
      '',
      '📍 *Visualize em alta qualidade aqui:*',
      galeria_link,
      '',
      ' ',
      `💎 ${terms.site_name}`,
    ].join('\n');
  },

  // Mensagens de compartilhamento da grade/galeria por visitantes
  GUEST_SHARE: (galeria_titulo: string, galeria_link: string) => {
    const terms = getActiveTerms();
    return [
      'Olá! ✨',
      '',
      `Dê uma olhada nestas ${terms.items} incríveis! 📸`,
      '',
      `A galeria de ${terms.items} *${galeria_titulo}* está disponível para visualização.`,
      '',
      '📍 *Acesse o link abaixo para conferir:*',
      galeria_link,
      '',
      'Espero que goste! ✨',
      ' ',
      `💎 ${terms.site_name}`,
    ].join('\n');
  },

  CONTACT_PHOTOGRAPHER: (galeria_titulo: string) => {
    const terms = getActiveTerms();
    return `Olá! Vi seu trabalho na galeria "${galeria_titulo}" através do aplicativo ${terms.site_name}. Gostaria de saber mais informações sobre o seu trabalho!`;
  },

  CONTACT_PHOTOGRAPHER_DIRETO: () => {
    const terms = getActiveTerms();
    return `Olá! Vi seu perfil através do aplicativo ${terms.site_name}. Gostaria de saber mais informações sobre o seu trabalho!`;
  },

  CONTACT_DEVELOPER: () => {
    const terms = getActiveTerms();
    return `Olá! Gostaria de saber mais informações sobre o aplicativo ${terms.site_name}!`;
  },
};
