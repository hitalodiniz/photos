// src/constants/messages.ts

//Mensagens de compartilhamento de galeria do botão do card da galeria no Espaço de Galerias
export const GALLERY_MESSAGES = {
  CARD_SHARE: (
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
      ' ',
      '💎 Sua Galeria',
    ].join('\n');
  },
  //Mensagens de compartilhamento de foto única do botão de compartilhamento no visualizador de fotos da galeria acessada pelo visitante
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
      ' ',
      '💎 Sua Galeria',
    ].join('\n');
  },
  //Mensagens de compartilhamento no botão de compartilhamento na grade de fotos da galeria acessada pelo visitante
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
      ' ',
      '💎 Sua Galeria',
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
