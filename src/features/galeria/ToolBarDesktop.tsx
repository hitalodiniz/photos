'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Filter,
  Download,
  ChevronDown,
  Monitor,
  Tag,
  Link as LinkIcon,
  Check,
  Wand2,
  Tablet,
  TagIcon,
  X,
  MapPin,
  Calendar,
  ImageIcon,
  Video,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { useSegment } from '@/hooks/useSegment';

export const ToolBarDesktop = ({
  showOnlyFavorites,
  setShowOnlyFavorites,
  downloadAllAsZip,
  isDownloading,
  activeTag,
  setActiveTag,
  columns,
  setColumns,
  tags = [],
  handleShare,
  handleExternalDownload,
  galeria,
  externalLinks = [],
  setUpsellFeature,
  getGalleryPermission,
  themeKey,
}: any) => {
  const { SegmentIcon } = useSegment();
  const [copied, setCopied] = useState(false);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const tagsMenuRef = useRef<HTMLDivElement>(null);
  const tagsButtonRef = useRef<HTMLButtonElement>(null);

  const [showGridMenu, setShowGridMenu] = useState(false);
  const gridMenuRef = useRef<HTMLDivElement>(null);
  const gridButtonRef = useRef<HTMLButtonElement>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const canUseFavorites = useMemo(() => {
    const planAllows = !!getGalleryPermission?.(galeria, 'canFavorite');
    const isEnabledOnGallery = !!galeria?.enable_favorites;
    return planAllows && isEnabledOnGallery;
  }, [galeria, getGalleryPermission]);

  const canUseTags = useMemo(() => {
    return !!getGalleryPermission?.(galeria, 'canTagPhotos');
  }, [galeria, getGalleryPermission]);

  const maxGridColumns = useMemo(() => {
    const permission = getGalleryPermission?.(galeria, 'maxGridColumns');
    return typeof permission === 'number' ? permission : 2;
  }, [galeria, getGalleryPermission]);

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

  const hasTags = galleryTags.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Fecha o menu de Grid
      if (
        gridMenuRef.current &&
        !gridMenuRef.current.contains(event.target as Node) &&
        gridButtonRef.current &&
        !gridButtonRef.current.contains(event.target as Node)
      ) {
        setShowGridMenu(false);
      }
      // Fecha o menu de Tags
      if (
        tagsMenuRef.current &&
        !tagsMenuRef.current.contains(event.target as Node) &&
        tagsButtonRef.current &&
        !tagsButtonRef.current.contains(event.target as Node)
      ) {
        setShowTagsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTag = (tag: string) => {
    if (tag === '') {
      setActiveTag([]);
      return;
    }
    const isSelected = activeTag.includes(tag);
    if (isSelected) {
      setActiveTag(activeTag.filter((t: string) => t !== tag));
    } else {
      if (activeTag.length < 3) {
        setActiveTag([...activeTag, tag]);
      } else {
        setToast?.({
          message: 'Selecione no máximo 3 marcações.',
          type: 'error',
        });
      }
    }
  };

  return (
    <div
      className="hidden md:block z-[100] sticky top-0 w-full pointer-events-none"
      {...(themeKey ? { 'data-theme': themeKey } : {})}
    >
      <div className="mx-auto transition-all duration-500 ease-out pointer-events-auto relative w-full pub-bar-bg border-b pub-bar-border-b shadow-2xl overflow-visible">
        <div className="flex items-center w-full max-w-[1600px] px-6 gap-3 h-11 mx-auto min-w-0">
          {/* 0. TÍTULO DA GALERIA — contexto ao scroll, popover com detalhes */}
          <div className="relative group shrink-0 hidden md:flex items-center">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 max-w-[180px] xl:max-w-[240px]"
            >
              <SegmentIcon size={18} className="pub-bar-icon" />
              <span className="text-[11px] font-semibold pub-bar-text uppercase tracking-wide truncate leading-none">
                {galeria.title}
              </span>
            </a>

            {/* Popover ao hover */}
            <div
              className="absolute top-[calc(100%+10px)] left-0 w-64 pub-bar-drawer border pub-bar-drawer-border rounded-xl shadow-2xl p-4 z-[130]
              opacity-0 pointer-events-none translate-y-1
              group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0
              transition-all duration-200 ease-out"
            >
              <p className="text-[11px] font-semibold pub-bar-text leading-tight mb-3">
                {galeria.title}
              </p>
              <div className="flex flex-col gap-1.5">
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

            {/* Separador após o título */}
            <div className="h-5 w-[1px] pub-bar-divider ml-3 shrink-0" />
          </div>

          {/* 1. LAYOUT / COLUNAS */}
          <div className="flex items-center gap-4 shrink-0 overflow-visible">
            <div className="relative inline-block">
              <button
                ref={gridButtonRef}
                onClick={() => {
                  setShowTagsMenu(false);
                  setShowGridMenu(!showGridMenu);
                }}
                className="flex items-center gap-2 h-8 rounded-md transition-all duration-300 pub-bar-text"
              >
                <Wand2 size={16} className="pub-bar-icon" />
                <span className="text-[11px] uppercase font-semibold tracking-wide">
                  Layout
                </span>
                <div className="rounded text-[11px] font-semibold uppercase tracking-wide pub-bar-text">
                  {columns.desktop} colunas
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-500 pub-bar-icon ${showGridMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showGridMenu && (
                <div
                  ref={gridMenuRef}
                  className="absolute top-[calc(100%+8px)] left-0 w-48 pub-bar-drawer border pub-bar-drawer-border rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 animate-in fade-in zoom-in-95 duration-200 z-[120] overflow-hidden"
                >
                  <div className="px-3 py-2">
                    <span className="text-[9px] font-semibold uppercase tracking-widest pub-bar-muted">
                      Colunas no Grid
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {[
                      {
                        k: 'tablet',
                        i: Tablet,
                        options: [2, 3, 4, 5, 6],
                        display: 'hidden md:flex lg:hidden',
                      },
                      {
                        k: 'desktop',
                        i: Monitor,
                        options: [3, 4, 5, 6, 8],
                        display: 'hidden lg:flex',
                      },
                    ].map((d: any) => {
                      const availableOptions = d.options.filter(
                        (num: number) => num <= maxGridColumns,
                      );
                      if (availableOptions.length === 0) return null;
                      return (
                        <div
                          key={d.k}
                          className={`${d.display} flex-col gap-1`}
                        >
                          {availableOptions.map((num: number) => (
                            <button
                              key={num}
                              onClick={() => {
                                setColumns((p: any) => ({ ...p, [d.k]: num }));
                                setShowGridMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                                columns[d.k] === num
                                  ? 'pub-bar-btn-cta shadow-md'
                                  : 'pub-bar-text hover:pub-bar-btn border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <d.i size={12} className="opacity-50" />
                                <span>{num} Colunas</span>
                              </div>
                              {columns[d.k] === num && <Check size={16} />}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. TAGS */}
          {hasTags && canUseTags ? (
            <div className="flex-1 flex justify-start items-center gap-2 border-l pub-bar-drawer-border ml-1">
              <div className="relative inline-block">
                <button
                  ref={tagsButtonRef}
                  onClick={() => setShowTagsMenu(!showTagsMenu)}
                  className="flex items-center gap-2 px-3 h-8 rounded-md transition-all duration-300 pub-bar-text"
                >
                  <TagIcon size={16} className="pub-bar-icon" />
                  <span className="text-[11px] uppercase font-semibold tracking-wide">
                    {activeTag.length > 0
                      ? `Marcações (${activeTag.length})`
                      : 'Marcações'}
                  </span>
                  {activeTag.length === 0 && (
                    <span className="text-[11px] font-medium pub-bar-muted">
                      ({tags.length - 1})
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-500 pub-bar-icon ${showTagsMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {showTagsMenu && (
                  <div
                    ref={tagsMenuRef}
                    className="absolute top-[calc(100%+8px)] left-0 w-64 pub-bar-drawer border pub-bar-drawer-border rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200 z-[120]"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="relative flex items-center pr-8">
                        <button
                          onClick={() => {
                            toggleTag('');
                            setActiveTag([]);
                            setShowTagsMenu(false);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                            activeTag.length === 0
                              ? 'pub-bar-btn-cta'
                              : 'pub-bar-text hover:pub-bar-btn border-transparent'
                          }`}
                        >
                          <span>Exibir todas as fotos</span>
                          {activeTag.length === 0 && <Check size={16} />}
                        </button>
                        <button
                          onClick={() => setShowTagsMenu(false)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 p-2"
                        >
                          <X size={16} className="pub-bar-icon" />
                        </button>
                      </div>
                      <div className="h-px pub-bar-divider my-1 mx-2" />
                      <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1">
                        {galleryTags.map((tag: string) => {
                          const isSelected = activeTag.includes(tag);
                          const isDisabled =
                            !isSelected && activeTag.length >= 3;
                          return (
                            <button
                              key={tag}
                              disabled={isDisabled}
                              onClick={() => toggleTag(tag)}
                              className={`w-full flex items-center justify-between px-4 py-2.5 mt-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${
                                isSelected
                                  ? 'pub-bar-btn-cta shadow-md'
                                  : isDisabled
                                    ? 'opacity-20 cursor-not-allowed'
                                    : 'pub-bar-text hover:pub-bar-btn border-transparent'
                              }`}
                            >
                              <span className="truncate">{tag}</span>
                              {isSelected && <Check size={16} />}
                            </button>
                          );
                        })}
                      </div>
                      {activeTag.length >= 3 && (
                        <p className="text-[8px] text-center pub-bar-muted uppercase mt-2 font-semibold tracking-widest">
                          Limite de 3 seleções atingido
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* BADGES DE TAGS ATIVAS */}
              <div className="flex items-center gap-1.5 overflow-hidden">
                {activeTag.map((tag: string) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 px-3 h-8 pub-bar-btn-cta border rounded-md animate-in fade-in slide-in-from-left-2 duration-300 shrink-0"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">
                      {tag}
                    </span>
                    <button
                      onClick={() => toggleTag(tag)}
                      className="hover:opacity-70 rounded-full p-0.5 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {activeTag.length > 0 && (
                  <button
                    onClick={() => setActiveTag([])}
                    className="flex items-center gap-1.5 px-3 h-8 pub-bar-btn border rounded-md transition-all group shrink-0"
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-widest">
                      Limpar
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* 3. AÇÕES */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* FILTRO FAVORITOS */}
            {canUseFavorites && (
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`flex items-center justify-center rounded-md h-8 border transition-all duration-300 w-28 gap-2 ${
                  showOnlyFavorites
                    ? galeria.has_contracting_client === 'ES'
                      ? 'bg-gold border-gold text-black shadow-lg'
                      : 'bg-red-600 border-red-600 text-white shadow-lg'
                    : 'pub-bar-btn border'
                }`}
              >
                {galeria.has_contracting_client === 'ES' ? (
                  <>
                    {showOnlyFavorites ? (
                      <Check size={16} strokeWidth={3} />
                    ) : (
                      <Filter size={16} className="pub-bar-icon" />
                    )}
                    <span className="text-editorial-label">Selecionadas</span>
                  </>
                ) : (
                  <>
                    <Filter size={16} className="pub-bar-icon" />
                    <span className="text-editorial-label">Favoritos</span>
                  </>
                )}
              </button>
            )}

            {/* WHATSAPP */}
            <button
              onClick={handleShare}
              className="flex items-center justify-center rounded-md h-8 border pub-bar-btn transition-all w-28 gap-2 hover:bg-green-600 hover:text-white hover:border-green-600"
            >
              <WhatsAppIcon className="w-[16px] h-[16px] pub-bar-icon" />
              <span className="text-editorial-label">Whatsapp</span>
            </button>

            {/* COPIAR LINK */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center justify-center rounded-md h-8 border pub-bar-btn transition-all w-28 gap-2 hover:bg-white hover:text-black hover:border-white"
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <LinkIcon size={16} className="pub-bar-icon" />
              )}
              <span className="text-editorial-label">Copiar Link</span>
            </button>

            {/* DOWNLOAD CTA */}
            <div className="relative pl-2 border-l pub-bar-drawer-border ml-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadAllAsZip();
                }}
                disabled={isDownloading}
                className="flex items-center justify-center rounded-md pub-bar-btn-cta h-8 font-semibold shadow-xl transition-all disabled:opacity-50 w-28 gap-2 px-4 border"
              >
                {isDownloading ? (
                  <div className="loading-luxury w-4 h-4" />
                ) : (
                  <Download size={16} />
                )}
                <span className="text-editorial-label">Baixar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
