'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  Instagram,
  Globe,
  MapPin,
  Link as LinkIcon,
  Check,
  ChevronDown,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

export const PhotographerInfoBar = ({
  phone,
  instagram,
  website,
  cities = [],
}: any) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shouldHideToDrawer, setShouldHideToDrawer] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && contentRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const contentWidth = contentRef.current.scrollWidth;
        const isMobile = window.innerWidth < 768;
        const overflowed = contentWidth > containerWidth;
        setShouldHideToDrawer(overflowed || (isMobile && cities.length > 1));
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [cities]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="z-[100] sticky top-0 w-full pointer-events-auto font-sans">
      {/* 🎯 Barra Fixa: Removida a variação de largura por scroll/hover para manter consistência editorial */}
      <div
        className="mx-auto transition-all duration-700 bg-petroleum overflow-hidden pointer-events-auto w-full max-w-none mt-0 border-b border-white/10 rounded-none shadow-2xl"
      >
        <div className="flex flex-row items-center w-full max-w-[1600px] px-3 md:px-6 h-14 mx-auto gap-2 md:gap-4">
          {/* SEÇÃO CIDADES */}
          {cities && cities.length > 0 && (
            <div className="flex items-center gap-1.5 md:gap-3 flex-1 min-w-0 animate-in fade-in duration-500">
              <MapPin size={16} className="text-[#F3E5AB] shrink-0" />
              <div ref={containerRef} className="flex items-center gap-2 flex-1 min-w-0">
                {!shouldHideToDrawer ? (
                  <div ref={contentRef} className="flex items-center gap-2">
                    {cities.map((city: string) => (
                      <a
                        key={city}
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 rounded-luxury text-[12px] font-semibold text-white/90 bg-white/5 border border-white/10 h-9 flex items-center shrink-0 italic hover:bg-white/10 hover:border-[#F3E5AB]/50 transition-all"
                      >
                        {city}
                      </a>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    className="flex items-center justify-between px-4 py-1.5 w-[155px] h-8 rounded-luxury bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-all shrink-0"
                  >
                    <span className="text-[11px] font-medium tracking-tight">
                      {isDrawerOpen ? 'Fechar cidades' : 'Cidades de atuação'}
                    </span>
                    <ChevronDown size={14} className={`text-[#F3E5AB] transition-transform duration-500 ${isDrawerOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* BOTÕES DE CONTATO */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                className="flex items-center justify-center rounded-lg h-9 w-9 md:h-10 md:w-auto md:px-4 border border-white/10 bg-slate-800 text-white hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] transition-all"
              >
                <Instagram size={16} />
                <span className="text-[11px] font-semibold uppercase hidden md:block ml-2">Instagram</span>
              </a>
            )}
            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                className="flex items-center justify-center rounded-lg h-9 w-9 md:h-10 md:w-auto md:px-4 border border-white/10 bg-slate-800 text-white hover:bg-white hover:text-black transition-all"
              >
                <Globe size={16} />
                <span className="text-[11px] font-semibold uppercase hidden md:block ml-2">Website</span>
              </a>
            )}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center rounded-lg h-9 w-9 md:h-10 md:w-auto md:px-4 border border-white/10 bg-slate-800 text-white hover:bg-slate-700 transition-all"
            >
              {copied ? <Check size={16} className="text-[#25D366]" /> : <LinkIcon size={16} />}
              <span className="text-[11px] font-semibold uppercase hidden md:block ml-2">Perfil</span>
            </button>
            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                target="_blank"
                // 🎯 WhatsApp: Fundo Slate-800 padrão, tornando-se verde apenas no HOVER conforme solicitado
                className="flex items-center justify-center rounded-lg h-9 w-9 md:h-10 md:w-auto md:px-5 border border-white/10 bg-slate-800 text-white hover:bg-[#25D366] hover:shadow-lg active:scale-95 transition-all group"
              >
                <WhatsAppIcon className="w-5 h-5 md:w-[18px] md:h-[18px]" />
                <span className="text-[11px] font-semibold uppercase hidden md:block ml-2">WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        {/* GAVETA */}
        <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] w-full border-t border-white/10 bg-petroleum/95 backdrop-blur-2xl ${isDrawerOpen && shouldHideToDrawer ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="flex flex-wrap items-center justify-center gap-2 py-2 px-2">
            {cities.map((city: string) => (
              <a
                key={city}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-luxury text-[12px] font-semibold text-white/90 bg-white/5 border border-white/10 h-9 flex items-center shrink-0 italic hover:bg-white/10 hover:border-[#F3E5AB]/50 transition-all"
              >
                {city}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};