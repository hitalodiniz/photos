// src/constants/messages.ts

export const GALLERY_MESSAGES = {
  LUXURY_SHARE: (
    clientName: string,
    title: string,
    date: string,
    url: string,
  ) => {
    return [
      'Olá! ✨',
      '',
      `As fotos do seu ensaio fotográfico *${title}* estão prontas! 📸`,
      '',
      'Preparamos uma galeria exclusiva para você visualizar e baixar suas fotos em alta qualidade.',
      '',
      '📍 *Acesse aqui:*',
      url,
      '',
      'Espero que goste! ✨',
      '---',
      '💎 _Sua Galeria_',
    ].join('\n');
  },
  CARD_SHARE: (clientName: string, title: string, url: string) => {
    // \u{2728} = ✨
    const saudacao = clientName
      ? `Olá, *${clientName}*! \u{2728}`
      : 'Olá! \u{2728}';

    return [
      saudacao,
      '',
      // \u{1F4F8} = 📸
      `As fotos do seu ensaio fotográfico *${title}* estão prontas! \u{1F4F8}`,
      '',
      'Preparamos uma galeria exclusiva para você visualizar e baixar suas fotos em alta qualidade.',
      '',
      // \u{1F4CD} = 📍
      '\u{1F4CD} *Acesse aqui:*',
      url,
      '',
      'Espero que goste! \u{2728}',
      '---',
      // \u{1F48E} = 💎
      '\u{1F48E} _Sua Galeria_',
    ].join('\n');
  },
  PHOTO_SHARE: (title: string, url: string) => {
    return [
      'Olá! ✨',
      '',
      '✨ *Um detalhe especial para você...*',
      '',
      `Selecionei esta foto da galeria *${title}* que acredito que você vai adorar! 📸`,
      '',
      '📍 *Visualize em alta qualidade aqui:*',
      url,
      '',
      '---',
      '💎 _Sua Galeria_',
    ].join('\n');
  },
  GUEST_SHARE: (title: string, url: string) => {
    return [
      'Olá! ✨',
      '',
      'Dê uma olhada nestas fotos incríveis! 📸',
      '',
      `A galeria de fotos *${title}* está disponível para visualização.`,
      '',
      '📍 *Acesse o link abaixo para conferir:*',
      url,
      '',
      'Espero que goste! ✨',
      '---',
      '💎 _Sua Galeria_',
    ].join('\n');
  },

  CONTACT_PHOTOGRAPHER: (galleryTitle: string) => {
    return `Olá! Vi seu trabalho na galeria "${galleryTitle}" através do aplicativo Sua Galeria. Gostaria de saber mais informações sobre o seu trabalho!`;
  },

  CONTACT_PHOTOGRAPHER_DIRETO: () => {
    return 'Olá! Vi seu perfil através do aplicativo Sua Galeria. Gostaria de saber mais informações sobre o seu trabalho!';
  },

  CONTACT_DEVELOPER: () => {
    return 'Olá! Gostaria de saber mais informações sobre o aplicativo Sua Galeria!';
  },
};
