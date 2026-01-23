/**
 * Normaliza uma string removendo acentos, convertendo para minúsculas e removendo espaços extras.
 * Útil para filtros e buscas.
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
