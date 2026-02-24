// src/core/utils/share-helper.ts

/**
 * Limpa o slug para garantir que não tenha barras duplicadas
 */
export const getCleanSlug = (slug: string = '') => {
  return slug?.startsWith('/') ? slug.substring(1) : slug;
};
