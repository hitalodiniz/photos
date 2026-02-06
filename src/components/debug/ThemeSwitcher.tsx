// src/components/debug/ThemeSwitcher.tsx
'use client';

import { useEffect, useState } from 'react';

// Atualizado para refletir as classes CSS: bg-petroleum, font-gold, font-champagne
const segments = ['PHOTOGRAPHER', 'EVENT', 'OFFICE', 'CAMPAIGN'];

export function ThemeSwitcher() {
  const [active, setActive] = useState('');

  useEffect(() => {
    const initial =
      document.documentElement.getAttribute('data-segment') || 'PHOTOGRAPHER';
    setActive(initial);
  }, []);

  const changeSegment = (seg: string) => {
    document.documentElement.setAttribute('data-segment', seg);
    setActive(seg);
  };

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex gap-2 bg-petroleum p-2 rounded-luxury border border-white/10 backdrop-blur-md">
      {segments.map((seg) => (
        <button
          key={seg}
          onClick={() => changeSegment(seg)}
          className={`px-3 py-1 text-[10px] font-bold rounded-luxury-sm transition-all border ${
            active === seg
              ? 'bg-champagne text-petroleum border-gold'
              : 'bg-transparent text-white/60 border-white/10 hover:bg-white/5'
          }`}
        >
          {seg}
        </button>
      ))}
    </div>
  );
}
