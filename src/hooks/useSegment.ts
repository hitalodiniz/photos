// hooks/useSegment.ts
import { SEGMENT_DICTIONARY, SegmentType } from '@/core/config/segments';
import { useState, useEffect } from 'react';

export function useSegment() {
  // 1. Estado inicial baseado no .env ou no atributo já presente no HTML
  const [currentSegment, setCurrentSegment] = useState<SegmentType>(() => {
    if (typeof window !== 'undefined') {
      const saved = document.documentElement.getAttribute(
        'data-segment',
      ) as SegmentType;
      if (saved) return saved;
    }
    return (
      (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER'
    );
  });

  useEffect(() => {
    // 2. Listener para reagir ao evento disparado pelo ThemeSwitcher
    const handleSegmentChange = () => {
      const active = document.documentElement.getAttribute(
        'data-segment',
      ) as SegmentType;
      if (active) setCurrentSegment(active);
    };

    window.addEventListener('segment-change', handleSegmentChange);
    return () =>
      window.removeEventListener('segment-change', handleSegmentChange);
  }, []);

  // 3. Retorna os termos e ícones injetados dinamicamente
  const terms = SEGMENT_DICTIONARY[currentSegment];

  return {
    segment: currentSegment,
    terms,
    // 🎯 Exporta o ícone pronto para uso como componente
    SegmentIcon: terms.segment_icon,
    // 💡 Auxiliares booleanos para evitar verificações de string nos componentes
    isPhotographer: currentSegment === 'PHOTOGRAPHER',
    isEvent: currentSegment === 'EVENT',
    isCampaign: currentSegment === 'CAMPAIGN',
    isOffice: currentSegment === 'OFFICE',
  };
}
