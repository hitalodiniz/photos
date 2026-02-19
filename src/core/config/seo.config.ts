import { SEGMENT_DICTIONARY, SegmentType } from '@/core/config/segments';

/**
 * Retorna as configurações de SEO baseadas no segmento fornecido.
 * Útil tanto para o lado do servidor quanto para o cliente.
 */
export const getSEOBySegment = (segment?: SegmentType) => {
  const activeSegment =
    segment ||
    (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) ||
    'PHOTOGRAPHER';
  const terms = SEGMENT_DICTIONARY[activeSegment];

  return {
    brandName: terms.site_name,
    identity: terms.identity,
    defaultTitle: `${terms.site_name}`,
    defaultDescription: terms.site_description,
  };
};

/**
 * Helper para formatar o título seguindo o padrão editorial.
 * Agora aceita o brandName dinâmico.
 */
export const formatTitle = (
  pageName: string | undefined,
  brandName: string,
) => {
  if (!pageName || pageName === brandName) return brandName;
  return `${pageName} - ${brandName}`;
};
