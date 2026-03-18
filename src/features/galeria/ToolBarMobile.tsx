'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Filter,
  Download,
  Tag,
  Monitor,
  Link as LinkIcon,
  Check,
  Share2,
  MapPin,
  Calendar,
  ImageIcon,
  Video,
  X,
} from 'lucide-react';
import { useSegment } from '@/hooks/useSegment';
import { usePlan } from '@/core/context/PlanContext';
import { useShare } from '@/hooks/useShare';

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
      style={
        position === 'left' ? { left: '0', transform: 'translateX(0)' } : {}
      }
    >
      <div className="pub-bar-btn-cta text-[9px] font-bold px-2.5 py-1.5 rounded-luxury shadow-2xl whitespace-nowrap relative ring-1 ring-black/10 uppercase tracking-luxury">
        {text}
        <div
          className={`absolute -top-1 ${arrowClasses[position]} w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[5px]`}
          style={{ borderBottomColor: 'rgb(var(--pub-bar-accent))' }}
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
  getGalleryPermission,
  themeKey,
}: any) => {
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const { SegmentIcon } = useSegment();
  const [copied, setCopied] = useState(false);
  const [hintStep, setHintStep] = useState(0);

  const canUseFavorites = useMemo(() => {
    const planAllows = !!getGalleryPermission?.(galeria, 'canFavorite');
    const isEnabledOnGallery = !!galeria?.enable_favorites;
    return planAllows && isEnabledOnGallery;
  }, [galeria, getGalleryPermission]);

  const canUseTags = useMemo(() => {
    return !!getGalleryPermission?.(galeria, 'canTagPhotos');
  }, [galeria, getGalleryPermission]);

  const [isVisible, setIsVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    if (barRef.current) observer.observe(barRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleTag = (tag: string) => {
    if (tag === '') {
      setActiveTag([]);
      return;
    }
    const isSelected = activeTag.includes(tag);
    if (isSelected) {
      setActiveTag(activeTag.filter((t: string) => t !== tag));
    } else if (activeTag.length < 3) {
      setActiveTag([...activeTag, tag]);
    }
  };

  const galleryTags = useMemo(() => {
    const parsePossiblySerializedJson = (input: unknown): unknown => {
      let current = input;
      for (let i = 0; i < 3; i++) {
        if (typeof current !== 'string') break;
        const trimmed = current.trim();
        if (!trimmed) return [];
        try {
          current = JSON.parse(trimmed);
        } catch {
          break;
        }
      }
      return current;
    };
    if (galeria?.photo_tags) {
      try {
        const parsed = parsePossiblySerializedJson(galeria.photo_tags);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const uniqueTags = Array.from(
            new Set(parsed.map((item: any) => item.tag)),
          ).filter((tag) => tag && typeof tag === 'string') as string[];
          if (uniqueTags.length > 0) return uniqueTags.sort();
        }
      } catch {
        /* fallback */
      }
    }
    if (galeria?.gallery_tags) {
      try {
        const parsed = parsePossiblySerializedJson(galeria.gallery_tags);
        if (Array.isArray(parsed)) {
          return parsed.filter((tag) => tag && typeof tag === 'string').sort();
        }
      } catch {
        /* empty */
      }
    }
    return [];
  }, [galeria?.photo_tags, galeria?.gallery_tags]);

  const hasMultipleTags = galleryTags.length > 0 && canUseTags;

  useEffect(() => {
    if (!isVisible) {
      setHintStep(0);
      return;
    }
    const steps = [
      { step: 1, text: 'Informações' },
      { step: 2, text: 'Layout' },
      { step: 3, text: 'Marcações', condition: hasMultipleTags },
      { step: 4, text: 'Compartilhar' },
      { step: 5, text: 'Copiar Link' },
      { step: 6, text: 'Favoritos', condition: canUseFavorites },
      { step: 7, text: 'Baixar' },
    ];
    const timers: NodeJS.Timeout[] = [];
    let delay = 1000;
    steps.forEach((s) => {
      if (s.condition === undefined || s.condition) {
        timers.push(
          setTimeout(() => {
            setHintStep(s.step);
          }, delay),
        );
        delay += 1500;
      }
    });
    timers.push(setTimeout(() => setHintStep(0), delay));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [isVisible, hasMultipleTags, canUseFavorites]);

  const { copyLink, shareAsGuest } = useShare({ galeria });

  const handleCopyLink = () => copyLink();

  const handleNativeShare = async () => {
    if (handleShare) {
      handleShare();
    } else {
      await shareAsGuest();
    }
  };

  const closeAllPanels = () => {
    setShowTagsPanel(false);
    setShowColumnsPanel(false);
    setShowInfoPanel(false);
  };

  const togglePanel = (panel: string) => {
    setShowTagsPanel(panel === 'tags' ? !showTagsPanel : false);
    setShowColumnsPanel(panel === 'columns' ? !showColumnsPanel : false);
    setShowInfoPanel(panel === 'info' ? !showInfoPanel : false);
    setHintStep(0);
  };

  return (
    <div
      ref={barRef}
      className="w-full z-[110] sticky top-0 md:hidden pointer-events-auto overflow-visible"
      {...(themeKey ? { 'data-theme': themeKey } : {})}
    >
      {/* OVERLAY */}
      {(showTagsPanel || showColumnsPanel) && (
        <div
          className="fixed inset-0 z-[112] bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-300"
          onClick={closeAllPanels}
        />
      )}

      {/* BARRA PRINCIPAL */}
      <div
        className={`flex items-center justify-between h-12 px-4 border-b pub-bar-border-b transition-all duration-500 relative z-[120] overflow-visible pub-bar-bg`}
      >
        {/* ESQUERDA: CONTROLES DE EXIBIÇÃO */}
        <div className="flex items-center gap-2 overflow-visible">
          <div className="relative overflow-visible">
            <button
              className={`h-9 w-9 rounded-luxury flex items-center justify-center transition-all ${
                showInfoPanel ? 'pub-bar-control-active' : 'pub-bar-btn border'
              }`}
              onClick={() => togglePanel('info')}
            >
              <SegmentIcon size={18} className="pub-bar-icon" />
            </button>
            {hintStep === 1 && <Tooltip text="Informações" />}
          </div>
          <div className="relative overflow-visible">
            <button
              className={`h-9 w-9 rounded-luxury flex items-center justify-center transition-all ${
                showColumnsPanel
                  ? 'pub-bar-control-active'
                  : 'pub-bar-btn border'
              }`}
              onClick={() => togglePanel('columns')}
            >
              <Monitor size={17} className="pub-bar-icon" />
            </button>
            {hintStep === 2 && <Tooltip text="Layout" />}
          </div>
          {hasMultipleTags && (
            <div className="relative overflow-visible">
              <button
                className={`h-9 w-9 rounded-luxury flex items-center justify-center transition-all relative ${
                  showTagsPanel || activeTag.length > 0
                    ? 'pub-bar-control-active'
                    : 'pub-bar-btn border'
                }`}
                onClick={() => togglePanel('tags')}
              >
                <Tag size={16} className="pub-bar-icon" />
                {activeTag.length > 0 && !showTagsPanel && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in">
                    {activeTag.length}
                  </span>
                )}
              </button>
              {hintStep === 3 && <Tooltip text="Marcações" />}
            </div>
          )}
        </div>

        {/* DIREITA: AÇÕES */}
        <div className="flex items-center gap-1.5 overflow-visible">
          <div className="relative overflow-visible">
            <button
              onClick={handleNativeShare}
              className="w-9 h-9 rounded-luxury flex items-center justify-center pub-bar-btn border active:opacity-70"
            >
              <Share2 size={18} className="pub-bar-icon" />
            </button>
            {hintStep === 4 && <Tooltip text="Compartilhar" position="right" />}
          </div>
          <div className="relative overflow-visible">
            <button
              onClick={handleCopyLink}
              className="w-9 h-9 rounded-luxury flex items-center justify-center pub-bar-btn border active:opacity-70"
            >
              {copied ? (
                <Check size={16} className="text-green-400" />
              ) : (
                <LinkIcon size={16} className="pub-bar-icon" />
              )}
            </button>
            {hintStep === 5 && <Tooltip text="Copiar Link" position="right" />}
          </div>
          {canUseFavorites && (
            <div className="relative">
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`w-9 h-9 rounded-luxury flex items-center justify-center transition-all border ${
                  showOnlyFavorites
                    ? galeria.has_contracting_client === 'ES'
                      ? 'bg-gold border-gold text-black shadow-lg shadow-gold/20'
                      : 'bg-red-600 border-red-600 text-white shadow-lg'
                    : 'pub-bar-btn border'
                }`}
              >
                {showOnlyFavorites &&
                galeria.has_contracting_client === 'ES' ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <Filter size={15} className="pub-bar-icon" />
                )}
              </button>
              {hintStep === 6 && <Tooltip text="Favoritos" position="right" />}
            </div>
          )}
          <div className="relative overflow-visible pl-1.5 border-l pub-bar-drawer-border ml-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadAllAsZip();
              }}
              disabled={isDownloading}
              className="w-9 h-9 rounded-luxury flex items-center justify-center pub-bar-btn-cta active:scale-90 shadow-xl transition-all border"
            >
              {isDownloading ? (
                <div className="loading-luxury w-4 h-4" />
              ) : (
                <Download size={16} />
              )}
            </button>
            {hintStep === 7 && <Tooltip text="Baixar" position="right" />}
          </div>
        </div>
      </div>

      {/* PAINÉIS DE EXPANSÃO */}
      <div className="absolute top-full left-0 w-full z-[115]">
        {/* INFORMAÇÕES */}
        <div
          className={`overflow-hidden transition-all duration-500 pub-bar-drawer border-b pub-bar-drawer-border ${
            showInfoPanel
              ? 'max-h-48 opacity-100'
              : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="p-4 flex flex-col gap-2 relative">
            <button
              onClick={closeAllPanels}
              className="absolute top-3 right-3 p-1"
            >
              <X size={16} className="pub-bar-icon" />
            </button>
            <p className="text-[11px] font-semibold pub-bar-text leading-tight mb-1 pr-6">
              {galeria.title}
            </p>
            {galeria.location && (
              <div className="flex items-center gap-2">
                <MapPin size={12} className="pub-bar-icon" />
                <span className="text-[11px] pub-bar-text font-medium">
                  {galeria.location}
                </span>
              </div>
            )}
            {galeria.date && (
              <div className="flex items-center gap-2">
                <Calendar size={12} className="pub-bar-icon" />
                <span className="text-[11px] pub-bar-text font-medium">
                  {new Date(galeria.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* COLUNAS */}
        <div
          className={`overflow-hidden transition-all duration-500 pub-bar-drawer border-b pub-bar-drawer-border ${
            showColumnsPanel
              ? 'max-h-20 opacity-100'
              : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-center gap-4 h-12 relative">
            <button
              onClick={closeAllPanels}
              className="absolute top-1/2 -translate-y-1/2 right-3 p-1"
            >
              <X size={16} className="pub-bar-icon" />
            </button>
            {[1, 2].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setColumns((prev: any) => ({ ...prev, mobile: num }));
                  setShowColumnsPanel(false);
                }}
                className={`px-6 py-2 rounded-luxury text-editorial-label transition-all border ${
                  columns.mobile === num
                    ? 'pub-bar-btn-cta shadow-lg'
                    : 'pub-bar-btn border'
                }`}
              >
                {num} {num === 1 ? 'Coluna' : 'Colunas'}
              </button>
            ))}
          </div>
        </div>

        {/* TAGS */}
        {canUseTags && (
          <div
            className={`overflow-hidden transition-all duration-500 pub-bar-drawer border-b pub-bar-drawer-border ${
              showTagsPanel
                ? 'max-h-[70vh] opacity-100'
                : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            <div className="px-6 py-4 flex flex-col gap-4 relative">
              <button
                onClick={closeAllPanels}
                className="absolute top-3 right-3 p-1"
              >
                <X size={16} className="pub-bar-icon" />
              </button>
              <div className="flex items-center justify-between">
                <span className="text-editorial-label pub-bar-text font-bold uppercase text-[10px] tracking-widest">
                  Marcações {activeTag.length > 0 && `(${activeTag.length}/3)`}
                </span>
                {activeTag.length > 0 && (
                  <button
                    onClick={() => setActiveTag([])}
                    className="text-[9px] pub-bar-accent font-bold uppercase tracking-luxury pr-5"
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
                      ? 'pub-bar-btn-cta border-current shadow-lg'
                      : 'pub-bar-btn border-transparent'
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
                          ? 'pub-bar-btn-cta border-current shadow-lg'
                          : isLimitReached
                            ? 'opacity-10 cursor-not-allowed pub-bar-btn border-transparent'
                            : 'pub-bar-btn border pub-bar-text'
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
