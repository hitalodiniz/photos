export const SEO_CONFIG = {
  brandName: 'Sua Galeria',
  defaultTitle: 'Sua Galeria - O portal das suas lembranças',
  defaultDescription: 'Gerencie e exiba suas fotos de forma autor.',
};

/**
 * Helper para formatar o título seguindo seu padrão editorial
 */
export const formatTitle = (pageName?: string) => {
  if (!pageName) return SEO_CONFIG.defaultTitle;
  return `${pageName} - ${SEO_CONFIG.brandName}`;
};
