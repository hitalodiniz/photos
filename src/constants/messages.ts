// src/constants/messages.ts

export const GALLERY_MESSAGES = {
  LUXURY_SHARE: (
    clientName: string,
    title: string,
    date: string,
    url: string,
  ) => {
    const saudacao = clientName ? `Olá, *${clientName}*! ✨` : 'Olá! ✨';
    const dataFormatada = date ? ` em ${date}` : '';

    return `${saudacao}

É um prazer compartilhar o resultado da sua experiência fotográfica: *${title}*.

Cada detalhe foi capturado para preservar a essência deste momento único${dataFormatada}. 

Preparamos uma galeria premium exclusiva para você visualizar e baixar suas memórias com a máxima qualidade.

📍 *Acesse sua experiência personalizada aqui:*
${url}

Espero que se emocione ao reviver cada instante.`;
  },
};
