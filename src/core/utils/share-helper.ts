// src/core/utils/share-helper.ts

/**
 * Lógica universal de compartilhamento (Mobile Share API ou WhatsApp Fallback)
 */
export const executeShare = async ({
  title,
  text,
  url, // Adicionamos a URL explicitamente
  phone = '',
}: {
  title: string;
  text: string;
  url?: string; // Opcional, mas recomendado para o card aparecer
  phone?: string;
}) => {
  const isMobile =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const cleanPhone = phone.replace(/\D/g, '');

  // 1. Tenta Share Nativo no Mobile
  if (isMobile && navigator.share) {
    try {
      // No Mobile, passar a URL separada do texto ajuda o SO a gerar a prévia
      await navigator.share({
        title,
        text: text,
        url: url, // O navegador anexa a URL ao final do texto automaticamente
      });
      return;
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Erro no Share nativo:', error);
    }
  }

  // 2. Fallback: WhatsApp (Desktop ou falha no Mobile)
  // No Fallback, garantimos que o link esteja na última linha para o WhatsApp ler os metadados
  const fullMessage = url ? `${text}\n\n${url}` : text;
  const encodedText = encodeURIComponent(fullMessage);

  const whatsappUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  window.open(whatsappUrl, '_blank');
};

/**
 * Limpa o slug para garantir que não tenha barras duplicadas
 */
export const getCleanSlug = (slug: string = '') => {
  return slug?.startsWith('/') ? slug.substring(1) : slug;
};
