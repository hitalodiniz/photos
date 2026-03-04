'use client';

import { useEffect, useState } from 'react';

const segments = ['PHOTOGRAPHER', 'EVENT', 'OFFICE', 'CAMPAIGN'];
const visualThemes = [
  'DARK_CINEMA',
  'EDITORIAL_WHITE',
  'NATURE',
  'NOCTURNAL_LUXURY',
  'OFF_WHITE',
  'PLATINUM',
];

export function ThemeSwitcher() {
  const [activeSegment, setActiveSegment] = useState('');
  const [activeTheme, setActiveTheme] = useState('');

  useEffect(() => {
    const savedSeg = localStorage.getItem('debug-segment') || 'PHOTOGRAPHER';
    const savedTheme = localStorage.getItem('debug-theme') || '';

    document.documentElement.setAttribute('data-segment', savedSeg);
    if (savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme);

    setActiveSegment(savedSeg);
    setActiveTheme(savedTheme);
  }, []);

  const changeSegment = (seg: string) => {
    // Limpa tema ao trocar segmento
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('debug-theme');
    setActiveTheme('');

    document.documentElement.setAttribute('data-segment', seg);
    localStorage.setItem('debug-segment', seg);
    setActiveSegment(seg);
    window.dispatchEvent(new Event('segment-change'));
  };

  const changeTheme = (theme: string) => {
    if (activeTheme === theme) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('debug-theme');
      setActiveTheme('');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('debug-theme', theme);
      setActiveTheme(theme);
    }
    window.dispatchEvent(new Event('segment-change'));
  };

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed top-0 right-1/3 z-[9999] bg-[#052633] border border-white/10 border-t-0 rounded-b-lg p-2 flex flex-col gap-2 shadow-xl">
      {/* Segmentos */}
      <div className="flex gap-1">
        {segments.map((seg) => (
          <button
            key={seg}
            onClick={() => changeSegment(seg)}
            className={`px-2 py-1 text-[9px] font-bold rounded transition-all border ${
              activeSegment === seg
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-transparent text-white/50 border-white/10 hover:bg-white/5'
            }`}
          >
            {seg}
          </button>
        ))}
      </div>

      {/* Divisor */}
      <div className="h-px bg-white/10" />

      {/* Temas visuais */}
      <div className="flex flex-wrap gap-1">
        {visualThemes.map((theme) => (
          <button
            key={theme}
            onClick={() => changeTheme(theme)}
            className={`px-2 py-1 text-[9px] font-bold rounded transition-all border ${
              activeTheme === theme
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-white/40 border-white/10 hover:bg-white/5'
            }`}
          >
            {theme.replace(/_/g, ' ')}
          </button>
        ))}
        {activeTheme && (
          <button
            onClick={() => changeTheme(activeTheme)}
            className="px-2 py-1 text-[9px] text-white/30 hover:text-white/60 transition-colors"
          >
            ✕ limpar
          </button>
        )}
      </div>
    </div>
  );
}
