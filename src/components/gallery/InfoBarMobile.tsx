'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Filter,
  Download,
  Loader2,
  MessageCircle,
  User,
  Tag,
  Monitor,
  Link as LinkIcon,
  Check,
} from 'lucide-react';

// Componente do Balão de Dica com animação de pulo
const Tooltip = ({
  text,
  position = 'center',
}: {
  text: string;
  position?: 'left' | 'right' | 'center';
}) => (
  <div
    className={`absolute -bottom-10 ${position === 'left' ? 'left-0' : position === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'} z-[130] animate-in fade-in zoom-in slide-in-from-top-2 duration-500`}
  >
    <div className="bg-[#F3E5AB] text-black text-[9px] font-semibold px-2 py-1 rounded shadow-xl whitespace-nowrap relative ring-1 ring-black/10">
      {text}
      <div
        className={`absolute -top-1 ${position === 'left' ? 'left-3' : position === 'right' ? 'right-3' : 'left-1/2 -translate-x-1/2'} border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-[#F3E5AB]`}
      />
    </div>
  </div>
);

export const InfoBarMobile = ({
  showOnlyFavorites,
  setShowOnlyFavorites,
  downloadAllAsZip,
  isDownloading,
  isScrolled,
  activeTag,
  setActiveTag,
  columns,
  setColumns,
  tags = [],
  handleShare,
}: any) => {
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hintStep, setHintStep] = useState(0);

  // Variável de controle para saber se devemos exibir filtros
  const hasMultipleTags = tags.length > 1;

  useEffect(() => {
    const timers = [
      setTimeout(() => hasMultipleTags && setHintStep(1), 5800), // Categorias
      setTimeout(() => setHintStep(2), 7300), // Layout
      setTimeout(() => setHintStep(3), 8800), // Link
      setTimeout(() => setHintStep(4), 10300), // WhatsApp
      setTimeout(() => setHintStep(5), 11800), // Favoritos
      setTimeout(() => setHintStep(6), 13300), // Baixar Tudo
      setTimeout(() => setHintStep(0), 17000), // Limpa
    ];

    return () => timers.forEach((t) => clearTimeout(t));
  }, [hasMultipleTags]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePanel = (panel: string) => {
    setShowTagsPanel(panel === 'tags' ? !showTagsPanel : false);
    setShowColumnsPanel(panel === 'columns' ? !showColumnsPanel : false);
    setHintStep(0);
  };

  return (
    <div className="w-full z-[110] sticky top-0 md:hidden pointer-events-auto">
      <div
        className={`flex items-center justify-between h-14 px-4 border-b transition-all duration-500 relative z-[120]
        ${isScrolled ? ' bg-slate-800 border-white/10' : ' bg-slate-800 border-white/20'}`}
      >
        {/* ESQUERDA: FILTROS E LAYOUT */}
        <div className="flex items-center gap-2">
          {hasMultipleTags && (
            <div className="relative">
              <button
                className={`h-9 w-9 rounded-[0.5rem] flex items-center justify-center transition-all ${showTagsPanel ? 'bg-[#F3E5AB] text-black' : 'bg-white/5 text-[#F3E5AB]'}`}
                onClick={() => togglePanel('tags')}
              >
                <Tag size={16} />
              </button>
              {hintStep === 1 && (
                <Tooltip text="Fotos por categoria" position="left" />
              )}
            </div>
          )}

          <div className="relative">
            <button
              className={`h-9 w-9 rounded-[0.5rem] flex items-center justify-center transition-all ${showColumnsPanel ? 'bg-[#F3E5AB] text-black' : 'bg-white/5 text-[#F3E5AB]'}`}
              onClick={() => togglePanel('columns')}
            >
              <Monitor size={17} />
            </button>
            {hintStep === 2 && (
              <Tooltip text="Mudar layout" position="center" />
            )}
          </div>
        </div>

        {/* DIREITA: SHARE, FAVORITOS E DOWNLOAD */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`w-9 h-9 rounded-[0.5rem] flex items-center justify-center transition-all border ${showOnlyFavorites ? 'bg-[#E67E70] border-[#E67E70] text-white' : 'bg-white/5 border-white/10 text-white/60'}`}
            >
              <Filter size={15} />
            </button>
            {hintStep === 3 && (
              <Tooltip text="Ver fotos favoritas" position="center" />
            )}
          </div>

          <div className="relative">
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-[0.5rem] flex items-center justify-center bg-white/5 text-[#25D366] active:bg-white/20"
            >
              <MessageCircle size={18} />
            </button>
            {hintStep === 4 && (
              <Tooltip text="Compartilhar por WhatsApp" position="center" />
            )}
          </div>
          <div className="relative">
            <button
              onClick={handleCopyLink}
              className="w-9 h-9 rounded-[0.5rem] flex items-center justify-center bg-white/5 text-white/60 active:bg-white/20"
            >
              {copied ? (
                <Check size={16} className="text-green-400" />
              ) : (
                <LinkIcon size={16} />
              )}
            </button>
            {hintStep === 5 && (
              <Tooltip text="Copiar link da galeria" position="center" />
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => !isDownloading && downloadAllAsZip()}
              className="w-9 h-9 rounded-[0.5rem] flex items-center justify-center bg-[#F3E5AB] text-black active:scale-90 transition-all ml-0.5"
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
            </button>
            {hintStep === 6 && (
              <Tooltip text="Baixar todas as fotos" position="right" />
            )}
          </div>
        </div>
      </div>

      {/* PAINÉIS DE EXPANSÃO */}
      <div className="absolute top-full left-0 w-full z-[115]">
        {/* COLUNAS PANEL */}
        <div
          className={`overflow-hidden transition-all duration-500 bg-[#1A1A1A] border-b border-white/10 ${showColumnsPanel ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
        >
          <div className="flex items-center justify-center gap-4 h-14">
            {[1, 2].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setColumns((prev: any) => ({ ...prev, mobile: num }));
                  setShowColumnsPanel(false);
                }}
                className={`px-6 py-2 rounded-[0.5rem] text-[11px] font-semibold transition-all ${columns.mobile === num ? 'bg-[#F3E5AB] text-black' : 'bg-white/5 text-white/40 border border-white/10'}`}
              >
                {num} {num === 1 ? 'Coluna' : 'Colunas'}
              </button>
            ))}
          </div>
        </div>

        {/* TAGS PANEL */}
        <div
          className={`overflow-hidden transition-all duration-500 bg-[#1A1A1A] border-b border-white/10 ${showTagsPanel ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
        >
          <div className="p-6 flex flex-col gap-4">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Categorias
            </span>
            <div className="flex flex-wrap gap-2 pb-2">
              {tags.map((tag: string) => (
                <button
                  key={tag}
                  onClick={() => {
                    setActiveTag(tag);
                    setShowTagsPanel(false);
                  }}
                  className={`px-4 py-2 rounded-[0.5rem] text-[10px] font-semibold uppercase transition-all border ${activeTag === tag ? 'bg-[#F3E5AB] text-black border-[#F3E5AB]' : 'bg-white/5 text-white/50 border border-white/10'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
