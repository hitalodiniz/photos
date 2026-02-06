import { SEGMENT_DICTIONARY, SegmentType } from '@/core/config/segments';

// 🎯 Resolve o segmento no lado do servidor para SEO
const segment =
  (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER';
const terms = SEGMENT_DICTIONARY[segment];

export const SEO_CONFIG = {
  brandName: terms.site_name,
  defaultTitle: `${terms.site_name} - ${terms.identity}`,
  defaultDescription: terms.site_description,
};

/**
 * Helper para formatar o título seguindo seu padrão editorial
 */
export const formatTitle = (pageName?: string) => {
  if (!pageName) return SEO_CONFIG.defaultTitle;
  return `${pageName} - ${SEO_CONFIG.brandName}`;
};
