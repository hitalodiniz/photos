'use client';
import React, { useState } from 'react';
import {
  Instagram,
  Globe,
  MapPin,
  Link as LinkIcon,
  Check,
  Contact2,
  ChevronDown,
} from 'lucide-react';
import WhatsAppIcon from '../ui/WhatsAppIcon';

export const PhotographerInfoBar = ({
  phone,
  instagram,
  website,
  cities = [],
  isScrolled,
  isHovered,
}: any) => {
  // 1. ESTADO DA GAVETA
  const [showCitiesDrawer, setShowCitiesDrawer] = useState(false);
  const [copied, setCopied] = useState(false);

  const isCompact = isScrolled && !isHovered;
  const hasCities = cities.length > 0;

  // 2. LÓGICA DE EXIBIÇÃO (IGUAL ÀS TAGS)
  // No modo compacto (scroll), esconde tudo e deixa apenas o botão "Cidades"
  // No modo normal, mostra até 2 cidades e o excedente no botão +N
  const limit = isCompact ? 0 : 2;
  const visibleCities = cities.slice(0, limit);
  const hiddenCitiesCount = cities.length - limit;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="hidden md:block z-[100] sticky top-0 w-full pointer-events-auto">
      <div
        className={`
          mx-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
          overflow-hidden
          ${
            isCompact
              ? 'w-[65%] max-w-[1100px] mt-4 bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[0.5rem]'
              : 'w-full max-w-none mt-0 bg-[#1E293B] border-b border-white/20 rounded-none'
          }
        `}
      >
        <div className="flex items-center w-full max-w-[1600px] px-6 gap-3 h-14 mx-auto min-w-0">
          {/* SEÇÃO ESQUERDA: CIDADES */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 border-r border-white/10 pr-4 shrink-0">
              <MapPin size={18} className="text-[#F3E5AB]" />
              {!isCompact && (
                <span className="text-[10px] text-white/70 uppercase font-semibold tracking-widest hidden lg:block">
                  Atuação
                </span>
              )}
            </div>

            <nav className="flex items-center gap-2 flex-1 min-w-0">
              {/* Renderiza cidades visíveis */}
              {visibleCities.map((city: string) => (
                <span
                  key={city}
                  className="px-4 py-1.5 rounded-[0.5rem] text-[11px] font-semibold uppercase bg-white/5 text-white/50 border border-white/10 h-9 flex items-center shrink-0 italic"
                >
                  {city}
                </span>
              ))}

              {/* GATILHO DA GAVETA (O BOTÃO +2) */}
              {(hiddenCitiesCount > 0 || isCompact) && (
                <button
                  onClick={() => setShowCitiesDrawer(!showCitiesDrawer)}
                  className="flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-[0.5rem] text-[11px] font-semibold uppercase shrink-0 border border-[#F3E5AB]/30 text-[#F3E5AB] hover:bg-[#F3E5AB]/10 transition-all active:scale-95"
                >
                  <span>{isCompact ? `Cidades` : `+${hiddenCitiesCount}`}</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-500 ${showCitiesDrawer ? 'rotate-180' : ''}`}
                  />
                </button>
              )}
            </nav>
          </div>

          {/* SEÇÃO DIREITA: CONTATOS */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {!isCompact && (
              <div className="flex items-center gap-2 border-r border-white/10 pr-4 mr-2">
                <Contact2 size={18} className="text-[#F3E5AB]" />
                <span className="text-[10px] text-white/70 uppercase font-semibold tracking-widest hidden lg:block">
                  Contatos
                </span>
              </div>
            )}

            {/* BOTÕES DE REDE SOCIAL */}
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                className={`flex items-center justify-center rounded-[0.5rem] h-10 border border-white/10 bg-[#1A1A1A] text-white hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] transition-all ${isCompact ? 'w-10' : 'px-4 gap-2'}`}
              >
                <Instagram size={16} />
                {!isCompact && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    Instagram
                  </span>
                )}
              </a>
            )}

            <button
              onClick={handleCopyLink}
              className={`flex items-center justify-center rounded-[0.5rem] h-10 border border-white/10 bg-[#1A1A1A] text-white hover:bg-slate-700 transition-all ${isCompact ? 'w-10' : 'px-4 gap-2'}`}
            >
              {copied ? (
                <Check size={16} className="text-[#25D366]" />
              ) : (
                <LinkIcon size={16} />
              )}
              {!isCompact && (
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  Perfil
                </span>
              )}
            </button>

            {phone && (
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                className={`flex items-center justify-center rounded-[0.5rem] bg-[#25D366] text-white h-10 font-semibold shadow-xl hover:bg-white hover:text-black transition-all ${isCompact ? 'w-10' : 'px-6 gap-2'}`}
              >
                <WhatsAppIcon className="w-[18px] h-[18px]" />
                {!isCompact && (
                  <span className="text-[11px] uppercase tracking-wide">
                    WhatsApp
                  </span>
                )}
              </a>
            )}
          </div>
        </div>

        {/* 3. A GAVETA (IGUAL AO PAINEL DE FILTROS) */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out w-full border-t border-white/10 bg-[#0F172A]/95 backdrop-blur-2xl ${
            showCitiesDrawer
              ? 'max-h-[500px] opacity-100'
              : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex flex-wrap items-center justify-center gap-3 py-8 px-10">
            {cities.map((city: string) => (
              <div
                key={city}
                className="px-5 py-2.5 rounded-[0.5rem] text-[11px] font-semibold uppercase border border-[#F3E5AB]/20 text-white/70 bg-white/5 hover:border-[#F3E5AB]/40 transition-colors"
              >
                {city}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
