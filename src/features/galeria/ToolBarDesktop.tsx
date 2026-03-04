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
  Zap,
  FileCheck,
  Smartphone,
  Tablet,
  TagIcon,
  X,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

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
  getGalleryPermission, // ← Nova prop necessária
}: any) => {
  const [copied, setCopied] = useState(false);
  const [showTagsMenu, setShowTagsMenu] = useState(false);

  const isCompact = false;

  const menuRef = useRef<HTMLDivElement>(null);
  const [showGridMenu, setShowGridMenu] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

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

  const maxGridColumns = useMemo(() => {
    const permission = getGalleryPermission?.(galeria, 'maxGridColumns');
    return typeof permission === 'number' ? permission : 2;
  }, [galeria, getGalleryPermission]);

  // 🎯 Extrai as tags únicas diretamente do objeto galeria
  // Depois — lê photo_tags, e cai para gallery_tags se vazio
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

    // 1. Tenta extrair tags únicas do photo_tags
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
        // continua para fallback
      }
    }

    // 2. Fallback: usa gallery_tags (lista de nomes)
    if (galeria?.gallery_tags) {
      try {
        const parsed = parsePossiblySerializedJson(galeria.gallery_tags);
        if (Array.isArray(parsed)) {
          return parsed.filter((tag) => tag && typeof tag === 'string').sort();
        }
      } catch {
        // retorna vazio
      }
    }

    return [];
  }, [galeria?.photo_tags, galeria?.gallery_tags]);

  const hasTags = galleryTags.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowTagsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  //activeTag agora é esperado como string[] (ex: ['Tag1', 'Tag2'])
  const toggleTag = (tag: string) => {
    if (tag === '') {
      setActiveTag([]); // Limpa tudo
      return;
    }

    const isSelected = activeTag.includes(tag);

    if (isSelected) {
      // Remove a tag se já estiver selecionada
      setActiveTag(activeTag.filter((t: string) => t !== tag));
    } else {
      // Adiciona apenas se houver menos de 3 selecionadas
      if (activeTag.length < 3) {
        setActiveTag([...activeTag, tag]);
      } else {
        // Opcional: Feedback visual de que atingiu o limite
        setToast?.({
          message: 'Selecione no máximo 3 marcações.',
          type: 'error',
        });
      }
    }
  };

  return (
    <div className="hidden md:block z-[100] sticky top-0 w-full pointer-events-none">
      <div className="mx-auto transition-all duration-500 ease-out pointer-events-auto relative w-full bg-petroleum backdrop-blur-md border-b border-white/10 shadow-2xl overflow-visible">
        <div className="flex items-center w-full max-w-[1600px] px-6 gap-3 h-12 mx-auto min-w-0">
          {/* 1. FERRAMENTAS + COLUNAS - Dropdown padronizado com Marcações */}

          <div className="flex items-center gap-4 shrink-0 overflow-visible">
            {/* Container com largura ajustada ao conteúdo (inline-block) para alinhamento perfeito */}
            <div className="relative inline-block" ref={menuRef}>
              <button
                onClick={() => {
                  setShowTagsMenu(false); // Fecha o de tags se abrir este
                  setShowGridMenu(!showGridMenu);
                }}
                className={`flex items-center gap-2 h-8 rounded-md  transition-all duration-300                   text-white `}
              >
                <Wand2 size={16} className="text-champagne" strokeWidth={2.5} />
                <span className="text-[10px] uppercase font-semibold tracking-[0.15em]">
                  Layout
                </span>
                {/* Badge discreto com o número atual */}
                <div
                  className={` rounded text-[10px] font-semibold text-champagne`}
                >
                  {columns.desktop} colunas
                </div>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-500 ${showGridMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {/* LISTA DROP DOWN GRID - Alinhada à esquerda do botão */}
              {showGridMenu && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-48 bg-petroleum backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 animate-in fade-in zoom-in-95 duration-200 z-[120] overflow-hidden">
                  <div className="px-3 py-2">
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-white/40">
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
                                setColumns((p: any) => ({
                                  ...p,
                                  [d.k]: num,
                                }));
                                setShowGridMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                                columns[d.k] === num
                                  ? 'bg-champagne text-black shadow-md'
                                  : 'text-white/90 hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <d.i size={12} className="opacity-50" />
                                <span>{num} Colunas</span>
                              </div>
                              {columns[d.k] === num && <Check size={14} />}
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

          {/* 2. MEIO: CATEGORIAS/TAGS - Verifica permissão E se há tags */}
          {hasTags && canUseTags ? (
            <div className="flex-1 flex justify-start items-center gap-2 border-l border-white/10 ml-1">
              {/* 1. SELETOR DE MARCAÇÕES (DROPDOWN) */}
              <div className="relative inline-block" ref={menuRef}>
                <button
                  onClick={() => setShowTagsMenu(!showTagsMenu)}
                  className={`flex items-center gap-2 px-3 h-8 rounded-md  transition-all duration-300 
                                        
                      text-white/90 
                  `}
                >
                  <TagIcon
                    size={14}
                    className="text-champagne"
                    strokeWidth={2.5}
                  />
                  <span className="text-[10px] uppercase font-semibold tracking-[0.15em]">
                    {activeTag.length > 0
                      ? `Marcações (${activeTag.length})`
                      : 'Marcações'}
                  </span>
                  {activeTag.length === 0 && (
                    <span className="text-[10px] font-medium">
                      ({tags.length - 1})
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-500 ${showTagsMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown de tags */}
                {showTagsMenu && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-64 bg-petroleum backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200 z-[120]">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          toggleTag('');
                          setActiveTag([]);
                          setShowTagsMenu(false);
                        }}
                        className={`flex items-center justify-between px-4 py-1 rounded-lg text-[10px] font-semibold uppercase 
                          tracking-wider transition-colors ${activeTag.length === 0 ? 'bg-champagne text-black' : 'text-white hover:bg-white/5'}`}
                      >
                        <span>Todas as fotos</span>
                        {activeTag.length === 0 && <Check size={14} />}
                      </button>

                      <div className="h-px bg-white/5 my-1 mx-2" />

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
                                  ? 'bg-champagne text-black shadow-md'
                                  : isDisabled
                                    ? 'opacity-20 cursor-not-allowed'
                                    : 'text-white/90 hover:bg-white/5'
                              }`}
                            >
                              <span className="truncate">{tag}</span>
                              {isSelected && <Check size={14} />}
                            </button>
                          );
                        })}
                      </div>

                      {activeTag.length >= 3 && (
                        <p className="text-[8px] text-center text-champagne/50 uppercase mt-2 font-semibold tracking-widest">
                          Limite de 3 seleções atingido
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ✅ 2. ÁREA DE BADGES MÚLTIPLOS */}
              <div className="flex items-center gap-1.5 overflow-hidden">
                {activeTag.map((tag: string) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 px-3 h-8 bg-champagne border border-champagne text-petroleum rounded-md animate-in fade-in slide-in-from-left-2 duration-300 shrink-0"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">
                      {tag}
                    </span>
                    <button
                      onClick={() => toggleTag(tag)}
                      className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {/* BOTÃO LIMPAR TUDO (Só aparece se tiver algo filtrado) */}
                {activeTag.length > 0 && (
                  <button
                    onClick={() => setActiveTag([])}
                    className="flex items-center gap-1.5 px-3 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-all group shrink-0"
                    title="Limpar todos os filtros"
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-white/90 group-hover:text-white">
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
            {/* FILTRO DE FAVORITOS - Verifica permissão do plano E configuração da galeria */}
            {canUseFavorites && (
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`flex items-center justify-center rounded-md h-8 border transition-all duration-300 w-32 gap-2 ${
                  showOnlyFavorites
                    ? galeria.has_contracting_client === 'ES'
                      ? 'bg-gold border-gold text-black shadow-lg' // Estilo Selecionado no Ensaio
                      : 'bg-red-600 border-red-600 text-white shadow-lg' // Estilo Favoritos padrão
                    : 'bg-white/5 border-white/10 text-white hover:text-white'
                }`}
              >
                {galeria.has_contracting_client === 'ES' ? (
                  <>
                    {showOnlyFavorites ? (
                      <Check size={16} strokeWidth={3} />
                    ) : (
                      <Filter size={16} className="text-gold" />
                    )}
                    <span className="text-editorial-label">
                      {showOnlyFavorites ? 'Selecionadas' : 'Selecionadas'}
                    </span>
                  </>
                ) : (
                  <>
                    <Filter size={16} className="text-champagne" />
                    <span className="text-editorial-label">Favoritos</span>
                  </>
                )}
              </button>
            )}

            {/* WHATSAPP */}
            <button
              onClick={handleShare}
              className="flex items-center justify-center rounded-md h-8 border border-white/10 bg-white/5 text-white hover:bg-green-600 hover:text-white transition-all w-28 gap-2"
            >
              <WhatsAppIcon className="w-[16px] h-[16px] text-champagne" />
              <span className="text-editorial-label">Whatsapp</span>
            </button>

            {/* COPIAR LINK */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center justify-center rounded-md h-8 border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black transition-all w-24 gap-2"
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <LinkIcon size={16} className="text-champagne " />
              )}
              <span className="text-editorial-label">Link</span>
            </button>

            {/* DOWNLOAD — abre a central de download direto */}
            <div className="relative pl-2 border-l border-white/10 ml-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadAllAsZip();
                  }}
                  disabled={isDownloading}
                  className="flex items-center justify-center rounded-md bg-champagne text-black h-8 font-semibold shadow-xl hover:bg-white transition-all disabled:opacity-50 w-32 gap-2 px-4"
                >
                  {isDownloading ? (
                    <div className="loading-luxury w-4 h-4 border-black/30 border-t-black" />
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
