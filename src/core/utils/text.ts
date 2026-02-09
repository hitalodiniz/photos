import { SegmentType } from '../config/plans';
import { SEGMENT_DICTIONARY } from '../config/segments';

export const capitalize = (s: string) =>
  s && s.charAt(0).toUpperCase() + s.slice(1);

/**
 * 🎯 Recupera os termos de forma dinâmica.
 * Se estiver no navegador, prioriza o atributo do HTML (injetado pelo ThemeSwitcher).
 * Se estiver no servidor, usa a variável de ambiente.
 */
export const getSegmentTerms = () => {
  if (typeof window !== 'undefined') {
    const active = document.documentElement.getAttribute(
      'data-segment',
    ) as SegmentType;
    if (active && SEGMENT_DICTIONARY[active]) {
      return SEGMENT_DICTIONARY[active];
    }
  }

  const segment =
    (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER';
  return SEGMENT_DICTIONARY[segment];
};

/**
 * 💡 Helper adicional para pluralização dinâmica simples
 */
export const getPluralTerm = (count: number) => {
  const terms = getSegmentTerms();
  return count === 1 ? terms.item : terms.items;
};
