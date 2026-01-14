'use client';
import React, { useState, useMemo } from 'react';
import {
  Filter,
  Download,
  Loader2,
  ChevronDown,
  Monitor,
  Tag,
  Link as LinkIcon,
  Check,
  Wand2,
} from 'lucide-react';
import WhatsAppIcon from '../ui/WhatsAppIcon';

export const InfoBarDesktop = ({
  showOnlyFavorites,
  setShowOnlyFavorites,
  downloadAllAsZip,
  isScrolled,
  isHovered,
  isDownloading,
  activeTag,
  setActiveTag,
  columns,
  setColumns,
  tags = [],
  handleShare,
}: any) => {
  const [showFilters, setShowFilters] = useState(false);
  const [copied, setCopied] = useState(false);

  const isCompact = isScrolled && !isHovered;
  const hasTags = tags.length > 1;

  const { visibleTags, hiddenTags } = useMemo(() => {
    const limit = isCompact ? 0 : 4;
    let sortedTags = [...tags];

    if (activeTag && activeTag !== '' && activeTag !== 'Todas') {
      sortedTags = [activeTag, ...tags.filter((t) => t !== activeTag)];
    }

    return {
      visibleTags: sortedTags.slice(0, limit),
      hiddenTags: sortedTags.slice(limit),
    };
  }, [tags, activeTag, isCompact]);

  return (
    <div className="hidden md:block z-[100] sticky top-0 w-full pointer-events-none">
      <div
        className={`
          mx-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
          pointer-events-auto overflow-hidden
          ${
            isCompact
              ? 'w-[60%] max-w-[1100px] mt-4 bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[0.5rem]'
              : 'w-full max-w-none mt-0 bg-[#1E293B] border-b border-white/20 rounded-none'
          }
        `}
      >
        <div className="flex items-center w-full max-w-[1600px] px-6 gap-3 h-14 mx-auto min-w-0">
          {/* 1. ÍCONE INDICATIVO DE FERRAMENTAS + COLUNAS (ESQUERDA) */}
          <div className="flex items-center gap-4 border-r border-white/10 pr-4 shrink-0">
            <div className="flex items-center gap-2">
              <Wand2 size={18} className="text-[#F3E5AB]" />
              {!isCompact && (
                <span className="text-[10px] text-white/70 uppercase font-semibold tracking-widest hidden lg:block">
                  Ferramentas
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 bg-white/5 rounded-[0.5rem] px-1.5 h-10 border border-white/10">
              <Monitor size={14} className="text-[#F3E5AB] mx-1" />
              {[3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  onClick={() =>
                    setColumns((p: any) => ({ ...p, desktop: num }))
                  }
                  className={`w-7 h-7 rounded-[0.2rem] text-[10px] font-semibold transition-all ${
                    columns.desktop === num
                      ? 'bg-[#F3E5AB] text-black'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* 2. MEIO: CATEGORIAS/TAGS */}
          {hasTags ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center shrink-0 ml-2">
                <Tag size={16} className="text-[#F3E5AB]" />
              </div>
              <nav className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar scroll-smooth">
                {visibleTags.map((tag: string) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag === activeTag ? '' : tag)}
                    className={`px-4 py-1.5 rounded-[0.5rem] text-[11px] font-semibold uppercase transition-all shrink-0 border h-9 ${
                      activeTag === tag
                        ? 'bg-[#F3E5AB] text-black border-[#F3E5AB]'
                        : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {(hiddenTags.length > 0 || isCompact) && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-[0.5rem] text-[11px] font-semibold uppercase shrink-0 border border-[#F3E5AB]/30 text-[#F3E5AB] hover:bg-[#F3E5AB]/10"
                  >
                    <span>{isCompact ? `Tags` : `+${hiddenTags.length}`}</span>
                    <ChevronDown
                      size={12}
                      className={showFilters ? 'rotate-180' : ''}
                    />
                  </button>
                )}
              </nav>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* 3. DIREITA: AÇÕES (Favoritos -> WhatsApp -> Link -> Download) */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* FAVORITOS */}
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`flex items-center justify-center rounded-[0.5rem] h-10 border transition-all duration-300 ${
                showOnlyFavorites
                  ? 'bg-[#E67E70] border-[#E67E70] text-white shadow-lg'
                  : 'bg-[#1A1A1A] border-white/10 text-white'
              } ${isCompact ? 'w-10' : 'w-28 gap-2'}`}
            >
              <Filter size={16} />
              {!isCompact && (
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  Favoritos
                </span>
              )}
            </button>

            {/* WHATSAPP */}
            <button
              onClick={handleShare}
              className={`flex items-center justify-center rounded-[0.5rem] h-10 border border-white/10 bg-[#1A1A1A] text-white hover:bg-[#25D366] hover:border-[#25D366] transition-all ${isCompact ? 'w-10' : 'w-28 gap-2'}`}
            >
              <WhatsAppIcon className="text-white w-[16px] h-[16px]" />
              {!isCompact && (
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  Whatsapp
                </span>
              )}
            </button>

            {/* LINK */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`flex items-center justify-center rounded-[0.5rem] h-10 border border-white/10 bg-[#1A1A1A] text-white hover:bg-white hover:text-black transition-all ${isCompact ? 'w-10' : 'w-24 gap-2'}`}
            >
              {copied ? (
                <Check size={16} className="text-[#25D366]" />
              ) : (
                <LinkIcon size={16} />
              )}
              {!isCompact && (
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  Link
                </span>
              )}
            </button>

            {/* DOWNLOAD (Padronizado h-10) */}
            <button
              onClick={downloadAllAsZip}
              disabled={isDownloading}
              className={`flex items-center justify-center rounded-[0.5rem] bg-[#F3E5AB] text-black h-10 font-semibold shadow-xl hover:bg-white transition-all disabled:opacity-50 ${isCompact ? 'w-10' : 'w-28 gap-2'}`}
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {!isCompact && (
                <span className="text-[11px] uppercase tracking-wide">
                  Baixar
                </span>
              )}
            </button>
          </div>
        </div>

        {/* PAINEL DE FILTROS */}
        <div
          className={`overflow-hidden transition-all duration-500 w-full border-t border-white/10 bg-black/95 backdrop-blur-2xl ${showFilters ? 'max-h-[50vh] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="flex flex-wrap items-center justify-center gap-3 py-8 px-10">
            {tags.map((tag: string) => (
              <button
                key={tag}
                onClick={() => {
                  setActiveTag(tag);
                  setShowFilters(false);
                }}
                className={`px-5 py-2.5 rounded-[0.5rem] text-[11px] font-semibold uppercase border ${activeTag === tag ? 'bg-[#F3E5AB] text-black border-[#F3E5AB]' : 'text-white/50 border-white/10 hover:text-white'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
