'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { SegmentType } from '@/core/config/segments';

const SegmentContext = createContext<{ segment: SegmentType }>({
  segment:
    (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER',
});

export function SegmentProvider({ children }: { children: React.ReactNode }) {
  const [segment, setSegment] = useState<SegmentType>(
    (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER',
  );

  useEffect(() => {
    // Função para sincronizar o estado com o que o Switcher injetou no HTML
    const sync = () => {
      const active = document.documentElement.getAttribute(
        'data-segment',
      ) as SegmentType;
      if (active) setSegment(active);
    };

    sync();
    window.addEventListener('segment-change', sync); // Escuta o evento do ThemeSwitcher
    return () => window.removeEventListener('segment-change', sync);
  }, []);

  return (
    <SegmentContext.Provider value={{ segment }}>
      {children}
    </SegmentContext.Provider>
  );
}

export const useSegment = () => useContext(SegmentContext);
