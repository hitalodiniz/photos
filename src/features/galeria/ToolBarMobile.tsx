'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Filter,
  Download,
  Tag,
  Monitor,
  Link as LinkIcon,
  Check,
  FileCheck,
  Zap,
  Share2,
} from 'lucide-react';
import { usePlan } from '@/core/context/PlanContext';
import { GALLERY_MESSAGES } from '@/core/config/messages';

// Componente do Balão de Dica (Padronizado para mobile)
const Tooltip = ({
  text,
  position = 'center',
}: {
  text: string;
  position?: 'left' | 'right' | 'center';
}) => {
  const containerClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  const arrowClasses = {
    left: 'left-3',
    right: 'right-3',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`absolute -bottom-11 ${containerClasses[position]} z-[130] animate-in fade-in zoom-in slide-in-from-top-2 duration-500 pointer-events-none`}
      style={{
        ...(position === 'left' && {
          left: '0',
          transform: 'translateX(0)',
        }),
      }}
    >
      <div className="bg-champagne text-black text-[9px] font-bold px-2.5 py-1.5 rounded-luxury shadow-2xl whitespace-nowrap relative ring-1 ring-black/10 uppercase tracking-luxury">
        {text}
        <div
          className={`absolute -top-1 ${arrowClasses[position]} w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[5px] border-b-gold`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export const ToolBarMobile = ({
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
  galeria,
  handleExternalDownload,
  externalLinks = [],
  getGalleryPermission, // ← Nova prop necessária
}: any) => {
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hintStep, setHintStep] = useState(0);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [linksStatus, setLinksStatus] = useState<Record<number, boolean>>({});

  // 🎯 Lógica de Favoritos: Verifica permissão do plano E configuração da galeria
  const canUseFavorites = useMemo(() => {
    const planAllows = !!getGalleryPermission?.(galeria, 'canFavorite');
    const isEnabledOnGallery = !!galeria?.enable_favorites;
    return planAllows && isEnabledOnGallery;
  }, [galeria, getGalleryPermission]);

  // 🎯 Lógica de Tags: Verifica permissão do plano
  const canUseTags = useMemo(() => {
    return !!getGalleryPermission?.(galeria, 'canTagPhotos');
  }, [galeria, getGalleryPermission]);

  // 🎯 Lógica de Download de Favoritos: Verifica permissão do plano
  const canDownloadFavorites = useMemo(() => {
    return !!getGalleryPermission?.(galeria, 'canDownloadFavoriteSelection');
  }, [galeria, getGalleryPermission]);

  const [isVisible, setIsVisible] = useState(false); // Novo estado de visibilidade real
  const barRef = useRef<HTMLDivElement>(null); // Referência para observar a barra

  // 🎯 Observador de Interseção: Detecta quando a barra entra na tela
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }, // Dispara quando 10% da barra estiver visível
    );

    if (barRef.current) {
      observer.observe(barRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Valida links externos
  useEffect(() => {
    const validateLinks = async () => {
      const check = async (url: string) => {
        if (!url) return false;
        try {
          const res = await fetch(
            `/api/validate-link?url=${encodeURIComponent(url)}`,
          );
          const data = await res.json();
          return data.valid;
        } catch {
          return false;
        }
      };

      const status: Record<number, boolean> = {};
      for (let i = 0; i < externalLinks.length; i++) {
        const linkParaValidar = externalLinks[i].url;
        status[i] = await check(linkParaValidar);
      }
      setLinksStatus(status);
    };

    if (externalLinks.length > 0) {
      validateLinks();
    }
  }, [externalLinks]);
  // 🎯 Lógica de Toggle para Múltiplas Tags (Até 3)
  const toggleTag = (tag: string) => {
    if (tag === '') {
      setActiveTag([]); // Reset para todas
      return;
    }

    const isSelected = activeTag.includes(tag);
    if (isSelected) {
      setActiveTag(activeTag.filter((t: string) => t !== tag));
    } else if (activeTag.length < 3) {
      setActiveTag([...activeTag, tag]);
    }
  };

  // 🎯 Extrai as tags únicas diretamente do objeto galeria
  const galleryTags = useMemo(() => {
    if (!galeria?.photo_tags) return [];
    try {
      const parsed =
        typeof galeria.photo_tags === 'string'
          ? JSON.parse(galeria.photo_tags)
          : galeria.photo_tags;
      if (!Array.isArray(parsed)) return [];
      const uniqueTags = Array.from(
        new Set(parsed.map((item: any) => item.tag)),
      ).filter((tag) => tag && typeof tag === 'string') as string[];
      return uniqueTags.sort();
    } catch (err) {
      return [];
    }
  }, [galeria?.photo_tags]);

  const hasMultipleTags = galleryTags.length > 0 && canUseTags;

  // Ciclo de dicas de ajuda (Hints)
  useEffect(() => {
    // Se a barra não está visível no scroll, reseta e para
    if (!isVisible) {
      setHintStep(0);
      return;
    }

    // Sequência de exibição (Inicia 1s após a barra aparecer)
    const timers = [
      setTimeout(() => setHintStep(1), 1000), // 1. Layout
      setTimeout(() => hasMultipleTags && setHintStep(2), 2500), // 2. Marcações (Se houver)
      setTimeout(() => setHintStep(3), 4000), // 3. Compartilhar
      setTimeout(() => setHintStep(4), 5500), // 4. Link
      setTimeout(() => canUseFavorites && setHintStep(5), 7000), // 5. Favoritos
      setTimeout(() => setHintStep(6), 8500), // 6. Baixar
      setTimeout(() => setHintStep(0), 11000), // Encerra ciclo
    ];

    return () => timers.forEach((t) => clearTimeout(t));
  }, [isVisible, hasMultipleTags, canUseFavorites]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (handleShare) {
      handleShare();
    } else {
      const title = galeria?.title || 'Galeria de Fotos';
      const url = window.location.href;
      const shareText = GALLERY_MESSAGES.GUEST_SHARE(title, url);
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url });
      } else {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const closeAllPanels = () => {
    setShowTagsPanel(false);
    setShowColumnsPanel(false);
    setShowDownloadMenu(false);
  };

  const togglePanel = (panel: string) => {
    if (panel === 'tags') {
      setShowTagsPanel(!showTagsPanel);
      setShowColumnsPanel(false);
    } else if (panel === 'columns') {
      setShowColumnsPanel(!showColumnsPanel);
      setShowTagsPanel(false);
    }
    setHintStep(0);
  };

  return (
    <div
      ref={barRef}
      className="w-full z-[110] sticky top-0 md:hidden pointer-events-auto overflow-visible"
    >
      {/* OVERLAY DE FECHAMENTO */}
      {(showTagsPanel || showColumnsPanel || showDownloadMenu) && (
        <div
          className="fixed inset-0 z-[112] bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-300"
          onClick={closeAllPanels}
        />
      )}

      <div
        className={`flex items-center justify-between h-14 px-4 border-b transition-all duration-500 relative z-[120] overflow-visible
        ${isScrolled ? ' bg-petroleum backdrop-blur-md border-white/10 shadow-lg' : ' bg-petroleum border-white/20'}`}
      >
        {/* ESQUERDA: TAGS E COLUNAS */}
        <div className="flex items-center gap-2 overflow-visible">
          <div className="relative overflow-visible">
            <button
              className={`h-9 w-9 rounded-luxury flex items-center justify-center transition-all ${showColumnsPanel ? 'bg-champagne text-black' : 'bg-white/5 text-gold border border-white/10'}`}
              onClick={() => togglePanel('columns')}
            >
              <Monitor
                size={17}
                className="text-champagne hover:text-petroleum"
              />
            </button>
            {hintStep === 1 && <Tooltip text="Layout" position="left" />}
          </div>

          {/* Tags - Só exibe se tiver permissão E tags */}
          {hasMultipleTags && (
            <div className="relative overflow-visible">
              {/* Indicador visual de quantidade de tags no botão */}
              <button
                className={`h-9 w-9 rounded-luxury flex items-center justify-center transition-all relative ${showTagsPanel || activeTag.length > 0 ? 'bg-champagne text-black' : 'bg-white/5 text-gold border border-white/10'}`}
                onClick={() => togglePanel('tags')}
              >
                <Tag
                  size={16}
                  className={
                    showTagsPanel || activeTag.length > 0
                      ? 'text-petroleum'
                      : 'text-champagne'
                  }
                />
                {activeTag.length > 0 && !showTagsPanel && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in">
                    {activeTag.length}
                  </span>
                )}
              </button>
              {hintStep === 2 && <Tooltip text="Marcações" position="left" />}
            </div>
          )}
        </div>

        {/* DIREITA: AÇÕES */}
        <div className="flex items-center gap-1.5 overflow-visible">
          <div className="relative overflow-visible">
            <button
              onClick={handleNativeShare}
              className="w-9 h-9 rounded-luxury flex items-center justify-center bg-white/5 text-white border border-white/10 active:bg-white/10"
            >
              <Share2 size={18} className="text-champagne" />
            </button>
            {hintStep === 3 && (
              <Tooltip text="Compartilhar" position="center" />
            )}
          </div>

          <div className="relative overflow-visible">
            <button
              onClick={handleCopyLink}
              className="w-9 h-9 rounded-luxury flex items-center justify-center bg-white/5 text-white border border-white/10 active:bg-white/10"
            >
              {copied ? (
                <Check size={16} className="text-green-400" />
              ) : (
                <LinkIcon size={16} className="text-champagne" />
              )}
            </button>
            {hintStep === 4 && <Tooltip text="Copiar Link" position="center" />}
          </div>

          {/* Favoritos - Só exibe se tiver permissão */}
          {canUseFavorites && (
            <div className="relative overflow-visible">
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`w-9 h-9 rounded-luxury flex items-center justify-center transition-all border ${showOnlyFavorites ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-white/5 border-white/10 text-white'}`}
              >
                <Filter size={15} className="text-champagne" />
              </button>
              {hintStep === 5 && <Tooltip text="Favoritos" position="center" />}
            </div>
          )}

          <div className="relative overflow-visible pl-1.5 border-l border-white/10 ml-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDownloadMenu(!showDownloadMenu);
              }}
              disabled={isDownloading}
              className="w-9 h-9 rounded-luxury flex items-center justify-center bg-champagne text-black active:scale-90 shadow-xl transition-all"
            >
              {isDownloading ? (
                <div className="loading-luxury w-4 h-4 border-black/30 border-t-black" />
              ) : (
                <Download size={16} />
              )}
            </button>
            {hintStep === 6 && <Tooltip text="Baixar" position="right" />}

            {/* MENU DE DOWNLOAD MOBILE */}
            {showDownloadMenu && (
              <>
                <div
                  className="fixed inset-0 z-[190]"
                  onClick={() => setShowDownloadMenu(false)}
                />

                <div className="absolute top-full mt-3 right-0 w-[75vw] max-w-[280px] bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-luxury shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 z-[200] overflow-hidden">
                  <div className="p-1.5 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        downloadAllAsZip();
                        setShowDownloadMenu(false);
                      }}
                      className="flex items-center gap-3 p-3 rounded-luxury bg-white/5 active:bg-white/10 text-left"
                    >
                      <Zap size={18} className="text-gold shrink-0" />
                      <div>
                        <p className="text-white text-editorial-label">
                          Fotos Otimizadas
                        </p>
                        <p className="text-white/90 text-[9px] leading-tight font-medium italic">
                          Ideal para celular e postagens.
                        </p>
                      </div>
                    </button>

                    {/* Links Externos */}
                    {externalLinks.map((linkObj: any, index: number) => {
                      if (!linksStatus[index]) return null;

                      return (
                        <button
                          key={index}
                          onClick={() => {
                            setShowDownloadMenu(false);
                            handleExternalDownload(
                              linkObj.url,
                              `${galeria.title}_${linkObj.label.replace(/\s+/g, '_')}.zip`,
                            );
                          }}
                          className="w-full flex items-start gap-3 p-3 rounded-luxury hover:bg-white/10 transition-all text-left group border-t border-white/5"
                        >
                          <FileCheck
                            size={18}
                            className="text-gold mt-0.5 group-hover:scale-110 transition-transform"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-editorial-label uppercase tracking-wider">
                              {linkObj.label}
                            </p>
                            <p className="text-white/90 text-[9px] leading-tight truncate italic font-medium mt-0.5">
                              {linkObj.url}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* PAINÉIS DE EXPANSÃO */}
      <div className="absolute top-full left-0 w-full z-[115]">
        <div
          className={`overflow-hidden transition-all duration-500 bg-petroleum backdrop-blur-xl border-b border-white/10 ${showColumnsPanel ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
        >
          <div className="flex items-center justify-center gap-4 h-14">
            {[1, 2].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setColumns((prev: any) => ({ ...prev, mobile: num }));
                  setShowColumnsPanel(false);
                }}
                className={`px-6 py-2 rounded-luxury text-editorial-label transition-all border ${columns.mobile === num ? 'bg-champagne text-black border-gold shadow-lg' : 'bg-white/5 text-white border border-white/10'}`}
              >
                {num} {num === 1 ? 'Coluna' : 'Colunas'}
              </button>
            ))}
          </div>
        </div>

        {/* Painel de Tags - Só renderiza se tiver permissão */}
        {canUseTags && (
          <div
            className={`overflow-hidden transition-all duration-500 bg-petroleum backdrop-blur-xl border-b border-white/10 ${showTagsPanel ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-editorial-label text-white/90 font-bold uppercase text-[10px] tracking-widest">
                  Marcações {activeTag.length > 0 && `(${activeTag.length}/3)`}
                </span>
                {activeTag.length > 0 && (
                  <button
                    onClick={() => setActiveTag([])}
                    className="text-[9px] text-champagne font-bold uppercase tracking-luxury"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pb-4">
                <button
                  onClick={() => toggleTag('')}
                  className={`px-4 py-2 rounded-full text-[10px] uppercase font-semibold transition-all border-2 ${
                    activeTag.length === 0
                      ? 'bg-champagne border-champagne text-black shadow-lg'
                      : 'bg-white/5 text-white/50 border-white/10'
                  }`}
                >
                  Todas
                </button>

                {galleryTags.map((tag: string) => {
                  const isSelected = activeTag.includes(tag);
                  const isLimitReached = activeTag.length >= 3 && !isSelected;

                  return (
                    <button
                      key={tag}
                      disabled={isLimitReached}
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-2 rounded-full text-[10px] uppercase font-semibold transition-all border-2 flex items-center gap-2 ${
                        isSelected
                          ? 'bg-champagne border-champagne text-black shadow-lg'
                          : isLimitReached
                            ? 'bg-transparent border-white/5 text-white/10'
                            : 'bg-white/5 text-white border-white/10'
                      }`}
                    >
                      {tag}
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
