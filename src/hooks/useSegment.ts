// hooks/useSegment.ts
import { SEGMENT_DICTIONARY, SegmentType } from '@/core/config/segments';

export function useSegment() {
  // 🎯 Busca a variável de ambiente com fallback seguro
  const segment =
    (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER';

  const terms = SEGMENT_DICTIONARY[segment];

  return {
    segment,
    terms,
    // 🎯 Exporta o ícone pronto para uso como componente
    SegmentIcon: terms.segment_icon,
    // 💡 Auxiliares booleanos para evitar verificações de string nos componentes
    isPhotographer: segment === 'PHOTOGRAPHER',
    isEvent: segment === 'EVENT',
    isCampaign: segment === 'CAMPAIGN',
    isOffice: segment === 'OFFICE',
  };
}
