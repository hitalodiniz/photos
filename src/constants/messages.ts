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
      `As fotos do seu ensaio fotográfico *${title}* estão prontas! 📸`,
      '',
      'Preparamos uma galeria exclusiva para você visualizar e baixar suas fotos em alta qualidade.',
      '',
      '📍 *Acesse aqui:*',
      url,
      '',
      'Espero que goste! ✨',
      '---',
      '💎 _Sua Galeria de Fotos_',
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
      '\u{1F48E} _Sua Galeria de Fotos_',
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
      '💎 _Sua Galeria de Fotos_',
    ].join('\n');
  },
};
