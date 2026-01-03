// src/constants/messages.ts

export const GALLERY_MESSAGES = {
  LUXURY_SHARE: (
    clientName: string,
    title: string,
    date: string,
    url: string,
  ) => {
    const saudacao = clientName ? `Olá, *${clientName}*! ✨` : 'Olá! ✨';

    return [
      saudacao,
      '',
      `Sua experiência fotográfica *${title}* está pronta! 📸`,
      '',
      'Preparamos uma galeria exclusiva para você visualizar e baixar suas memórias em alta qualidade.',
      '',
      '📍 *Acesse aqui:*',
      url,
      '',
      'Espero que goste! ✨',
    ].join('\n');
  },
};
