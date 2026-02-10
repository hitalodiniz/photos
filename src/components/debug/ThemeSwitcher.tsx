'use client';

import { useEffect, useState } from 'react';

const segments = ['PHOTOGRAPHER', 'EVENT', 'OFFICE', 'CAMPAIGN'];

export function ThemeSwitcher() {
  const [active, setActive] = useState('');

  useEffect(() => {
    // 1. Busca do atributo HTML ou do LocalStorage
    const saved = localStorage.getItem('debug-segment');
    const initial =
      saved ||
      document.documentElement.getAttribute('data-segment') ||
      'PHOTOGRAPHER';

    if (saved) {
      document.documentElement.setAttribute('data-segment', saved);
    }
    setActive(initial);
  }, []);

  const changeSegment = (seg: string) => {
    // 2. Aplica visualmente via CSS
    document.documentElement.setAttribute('data-segment', seg);

    // 3. Persiste para futuros carregamentos
    localStorage.setItem('debug-segment', seg);
    setActive(seg);

    // 4. Notifica o restante da aplicação (útil para hooks e imagens)
    window.dispatchEvent(new Event('segment-change'));
  };

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed top-0 right-28 z-[9999] flex gap-2 bg-petroleum p-2 rounded-luxury border border-white/10 backdrop-blur-md">
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
