'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Filter,
  Download,
  ChevronDown,
  Monitor,
  Link as LinkIcon,
  Check,
  Tablet,
  TagIcon,
  X,
  MapPin,
  Calendar,
  ImageIcon,
  Video,
  Wand2,
  Instagram,
  Globe,
  User,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { useSegment } from '@/hooks/useSegment';
import { getCreatorProfileUrl } from '@/core/utils/url-helper';

export const ToolBarDesktop = ({
  openDrawer,
  setOpenDrawer,
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
  galeria,
  getGalleryPermission,
  themeKey,
  photos = [],
}: any) => {
  const { SegmentIcon } = useSegment();
  const [copied, setCopied] = useState(false);

  const barRef = useRef<HTMLDivElement>(null);

  const canUseFavorites = useMemo(
    () =>
      !!getGalleryPermission?.(galeria, 'canFavorite') &&
      !!galeria?.enable_favorites,
    [galeria, getGalleryPermission],
  );

  const canUseTags = useMemo(
    () => !!getGalleryPermission?.(galeria, 'canTagPhotos'),
    [galeria, getGalleryPermission],
  );

  const maxGridColumns = useMemo(() => {
    const p = getGalleryPermission?.(galeria, 'maxGridColumns');
    return typeof p === 'number' ? p : 2;
  }, [galeria, getGalleryPermission]);

  const galleryTags = useMemo(() => {
    const parse = (input: unknown): unknown => {
      let cur = input;
      for (let i = 0; i < 3; i++) {
        if (typeof cur !== 'string') break;
        const t = cur.trim();
        if (!t) return [];
        try {
          cur = JSON.parse(t);
        } catch {
          break;
        }
      }
      return cur;
    };
    if (galeria?.photo_tags) {
      try {
        const p = parse(galeria.photo_tags);
        if (Array.isArray(p) && p.length > 0) {
          const u = Array.from(new Set(p.map((x: any) => x.tag))).filter(
            (t): t is string => !!t && typeof t === 'string',
          );
          if (u.length) return u.sort();
        }
      } catch {
        /* fallback */
      }
    }
    if (galeria?.gallery_tags) {
      try {
        const p = parse(galeria.gallery_tags);
        if (Array.isArray(p))
          return p
            .filter((t): t is string => !!t && typeof t === 'string')
            .sort();
      } catch {
        /* empty */
      }
    }
    return [];
  }, [galeria?.photo_tags, galeria?.gallery_tags]);

  const hasTags = galleryTags.length > 0 && canUseTags;

  const { photoCount, videoCount } = useMemo(() => {
    const list = Array.isArray(photos) ? photos : [];
    let p = 0,
      v = 0;
    list.forEach((x: any) => {
      if (x?.type === 'video' || x?.mimeType?.startsWith?.('video/')) v++;
      else p++;
    });
    return { photoCount: p, videoCount: v };
  }, [photos]);

  const photographer = galeria?.photographer;
  const profileUrl = photographer ? getCreatorProfileUrl(photographer) : '#';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node))
        setOpenDrawer(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleDrawer = (name: 'info' | 'layout' | 'tags') =>
    setOpenDrawer((prev) => (prev === name ? null : name));

  const toggleTag = (tag: string) => {
    if (tag === '') {
      setActiveTag([]);
      return;
    }
    const sel = activeTag.includes(tag);
    if (sel) setActiveTag(activeTag.filter((t: string) => t !== tag));
    else if (activeTag.length < 3) setActiveTag([...activeTag, tag]);
  };

  const btnBase =
    'flex items-center gap-2 h-8 px-3 rounded-md transition-all duration-200';

  return (
    <div
      ref={barRef}
      className="hidden md:block z-[100] sticky top-0 w-full pointer-events-none"
      {...(themeKey ? { 'data-theme': themeKey } : {})}
    >
      <div className="pointer-events-auto relative w-full pub-bar-bg border-b pub-bar-border-b shadow-2xl">
        {/* ── BARRA ── */}
        <div className="flex items-center w-full max-w-[1600px] h-10 mx-auto gap-1 px-3">
          <button
            onClick={() => toggleDrawer('info')}
            className={`${btnBase} max-w-[220px] xl:max-w-[300px] shrink-0 ${openDrawer === 'info' ? 'pub-bar-active border' : 'pub-bar-text'}`}
          >
            <SegmentIcon size={15} className="pub-bar-icon shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-wide truncate leading-none">
              {galeria.title}
            </span>
            <ChevronDown
              size={16}
              className={`pub-bar-icon shrink-0 transition-transform duration-300 ${openDrawer === 'info' ? 'rotate-180' : ''}`}
            />
          </button>

          <div className="h-5 w-[1px] pub-bar-divider mx-1 shrink-0" />

          <button
            onClick={() => toggleDrawer('layout')}
            className={`${btnBase} shrink-0 ${openDrawer === 'layout' ? 'pub-bar-active border' : 'pub-bar-text'}`}
          >
            <Wand2 size={15} className="pub-bar-icon" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">
              Layout
            </span>
            <span className="text-[11px] pub-bar-text font-medium">
              {columns.desktop} col
            </span>
            <ChevronDown
              size={16}
              className={`pub-bar-icon transition-transform duration-300 ${openDrawer === 'layout' ? 'rotate-180' : ''}`}
            />
          </button>

          {hasTags && (
            <>
              <div className="h-5 w-[1px] pub-bar-divider mx-1 shrink-0" />

              <button
                onClick={() => toggleDrawer('tags')}
                className={`${btnBase} shrink-0 ${openDrawer === 'tags' ? 'pub-bar-active border' : 'pub-bar-text'}`}
              >
                <TagIcon size={15} className="pub-bar-icon" />
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  Marcações
                </span>
                {activeTag.length > 0 ? (
                  <span className="flex items-center justify-center rounded-full text-[10px] font-bold min-w-[16px] h-4 px-1 pub-bar-btn-cta">
                    {activeTag.length}
                  </span>
                ) : (
                  <span className="text-[11px] pub-bar-text font-medium">
                    ({galleryTags.length})
                  </span>
                )}
                <ChevronDown
                  size={16}
                  className={`pub-bar-icon transition-transform duration-300 ${openDrawer === 'tags' ? 'rotate-180' : ''}`}
                />
              </button>
            </>
          )}

          {activeTag.length > 0 && (
            <>
              <div className="h-5 w-[1px] pub-bar-divider mx-1 shrink-0" />
              <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
                {activeTag.map((tag: string) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 px-2.5 h-6 pub-bar-btn-cta border rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0 animate-in fade-in duration-200"
                  >
                    {tag}
                    <button
                      onClick={() => toggleTag(tag)}
                      className="opacity-60 hover:opacity-100 ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setActiveTag([])}
                  className="text-[10px] pub-bar-text hover:pub-bar-muted uppercase tracking-wide font-semibold shrink-0 transition-colors ml-1"
                >
                  Limpar
                </button>
              </div>
            </>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2 shrink-0">
            {canUseFavorites && (
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`flex items-center justify-center rounded-md h-8 border transition-all w-28 gap-2 ${
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
                      <Check size={15} strokeWidth={3} />
                    ) : (
                      <Filter size={15} className="pub-bar-icon" />
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-wide">
                      Selecionadas
                    </span>
                  </>
                ) : (
                  <>
                    <Filter size={15} className="pub-bar-icon" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">
                      Favoritos
                    </span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleShare}
              className="flex items-center justify-center rounded-md h-8 border pub-bar-btn w-28 gap-2 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all"
            >
              <WhatsAppIcon className="w-[15px] h-[15px] pub-bar-icon" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                Whatsapp
              </span>
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center justify-center rounded-md h-8 border pub-bar-btn w-28 gap-2 hover:bg-white hover:text-black hover:border-white transition-all"
            >
              {copied ? (
                <Check size={15} className="text-green-500" />
              ) : (
                <LinkIcon size={15} className="pub-bar-icon" />
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                Copiar Link
              </span>
            </button>

            <div className="pl-2 border-l pub-bar-drawer-border ml-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadAllAsZip();
                }}
                disabled={isDownloading}
                className="flex items-center justify-center rounded-md pub-bar-btn-cta h-8 shadow-xl transition-all disabled:opacity-50 w-28 gap-2 px-4 border"
              >
                {isDownloading ? (
                  <div className="loading-luxury w-4 h-4" />
                ) : (
                  <Download size={15} />
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  Baixar
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── GAVETA ──
            Transparente — herda pub-bar-bg do pai .pub-bar-bg acima.
            Usa o mesmo wrapper max-w-[1600px] px-6 mx-auto da barra,
            garantindo recuo esquerdo idêntico ao título.
            w-fit no conteúdo limita a largura ao necessário.
        */}
        <div
          className={`border-t pub-bar-drawer-border transition-all duration-300 ${openDrawer ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'}`}
        >
          <div className="max-w-[1600px] px-6 mx-auto py-4">
            <div className="w-fit max-w-[700px]">
              {/* GAVETA INFO */}
              {openDrawer === 'info' && (
                <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-[10px] font-semibold uppercase tracking-widest pub-bar-text whitespace-nowrap">
                      Detalhes da galeria
                    </span>
                    <button
                      onClick={() => setOpenDrawer(null)}
                      className="flex items-center gap-1 pub-bar-btn border px-2 py-1.5 rounded-md text-[9px] font-semibold uppercase tracking-widest transition-colors hover:pub-bar-accent"
                    >
                      <X size={12} />
                      Fechar
                    </button>
                  </div>
                  <div className="flex items-start gap-8">
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <p className="text-[12px] font-semibold pub-bar-text leading-tight whitespace-nowrap">
                        {galeria.title}
                      </p>
                      {galeria.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={11} className="pub-bar-icon shrink-0" />
                          <span className="text-[11px] pub-bar-text whitespace-nowrap">
                            {galeria.location}
                          </span>
                        </div>
                      )}
                      {galeria.date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar
                            size={11}
                            className="pub-bar-icon shrink-0"
                          />
                          <span className="text-[11px] pub-bar-text whitespace-nowrap">
                            {new Date(galeria.date).toLocaleDateString(
                              'pt-BR',
                              {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              },
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {photographer && (
                      <div className="flex flex-col gap-2 border-l pub-bar-drawer-border pl-6 shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 bg-white/10">
                            {photographer.profile_picture_url ? (
                              <img
                                src={photographer.profile_picture_url}
                                alt={photographer.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-[12px] font-semibold pub-bar-text">
                                  {photographer.full_name
                                    ?.charAt(0)
                                    ?.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] pub-bar-text font-medium uppercase tracking-wide whitespace-nowrap">
                              Registrado por
                            </span>
                            <a
                              href={profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[12px] font-semibold pub-bar-text hover:pub-bar-accent transition-colors uppercase tracking-tight leading-none block whitespace-nowrap"
                            >
                              {photographer.full_name}
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {photographer.phone_contact &&
                            photographer.show_phone_on_public_profile !==
                              true && (
                              <a
                                href={(() => {
                                  const phone =
                                    photographer.phone_contact.replace(
                                      /\D/g,
                                      '',
                                    );
                                  const siteUrl =
                                    process.env.NEXT_PUBLIC_BASE_URL ||
                                    process.env.NEXT_PUBLIC_MAIN_DOMAIN ||
                                    '';
                                  const msg = `Olá! Vi seu trabalho na galeria "${galeria?.title || ''}" através do ${siteUrl} e gostaria de saber mais sobre seus serviços. Poderia me passar mais informações?`;
                                  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                                })()}
                                target="_blank"
                                className="flex items-center gap-1.5 px-2.5 h-7 pub-bar-btn border rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all hover:bg-green-600 hover:text-white hover:border-green-600 whitespace-nowrap"
                              >
                                <WhatsAppIcon className="w-[12px] h-[12px]" />
                                WhatsApp
                              </a>
                            )}
                          {photographer.instagram_link && (
                            <a
                              href={`https://instagram.com/${photographer.instagram_link.replace('@', '')}`}
                              target="_blank"
                              className="flex items-center gap-1.5 px-2.5 h-7 pub-bar-btn border rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white hover:border-transparent whitespace-nowrap"
                            >
                              <Instagram size={12} />
                              Instagram
                            </a>
                          )}
                          <a
                            href={profileUrl}
                            target="_blank"
                            className="flex items-center gap-1.5 px-2.5 h-7 pub-bar-btn border rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all whitespace-nowrap"
                          >
                            <User size={12} />
                            Perfil
                          </a>
                          {photographer.website && (
                            <a
                              href={
                                photographer.website.startsWith('http')
                                  ? photographer.website
                                  : `https://${photographer.website}`
                              }
                              target="_blank"
                              className="flex items-center gap-1.5 px-2.5 h-7 pub-bar-btn border rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all hover:text-blue-400 whitespace-nowrap"
                            >
                              <Globe size={12} />
                              Site
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* GAVETA LAYOUT */}
              {openDrawer === 'layout' && (
                <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-[10px] font-semibold uppercase tracking-widest pub-bar-text whitespace-nowrap">
                      Colunas no grid
                    </span>
                    <button
                      onClick={() => setOpenDrawer(null)}
                      className="flex items-center gap-1 pub-bar-btn border px-2 py-1.5 rounded-md text-[9px] font-semibold uppercase tracking-widest transition-colors hover:pub-bar-accent"
                    >
                      <X size={12} />
                      Fechar
                    </button>
                  </div>
                  <div className="flex gap-6">
                    {[
                      {
                        k: 'tablet',
                        i: Tablet,
                        options: [2, 3, 4, 5, 6],
                        label: 'Tablet',
                        display: 'flex lg:hidden',
                      },
                      {
                        k: 'desktop',
                        i: Monitor,
                        options: [3, 4, 5, 6, 8],
                        label: 'Desktop',
                        display: 'hidden lg:flex',
                      },
                    ].map((d: any) => {
                      const opts = d.options.filter(
                        (n: number) => n <= maxGridColumns,
                      );
                      if (!opts.length) return null;
                      return (
                        <div
                          key={d.k}
                          className={`${d.display} flex-col gap-2`}
                        >
                          <div className="flex items-center justify-between gap-4 w-full">
                            {/* Rótulo e Ícone */}
                            <div className="flex items-center gap-2 shrink-0">
                              <d.i size={12} className="pub-bar-icon" />
                              <span className="text-[10px] pub-bar-text uppercase tracking-widest font-bold whitespace-nowrap">
                                {d.label}
                              </span>
                            </div>

                            {/* Grupo de Botões */}
                            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                              {opts.map((num: number) => (
                                <button
                                  key={num}
                                  onClick={() =>
                                    setColumns((p: any) => ({
                                      ...p,
                                      [d.k]: num,
                                    }))
                                  }
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all border whitespace-nowrap ${
                                    columns[d.k] === num
                                      ? 'pub-bar-btn-cta border-current'
                                      : 'pub-bar-btn border-white/10'
                                  }`}
                                >
                                  {num} col
                                  {columns[d.k] === num && (
                                    <Check size={11} strokeWidth={3} />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* GAVETA TAGS */}
              {openDrawer === 'tags' && (
                <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-[10px] font-semibold uppercase tracking-widest pub-bar-text whitespace-nowrap">
                      Filtrar por marcação
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      {activeTag.length > 0 && (
                        <button
                          onClick={() => setActiveTag([])}
                          className="text-[10px] font-semibold uppercase tracking-wide pub-bar-accent hover:pub-bar-muted transition-colors whitespace-nowrap"
                        >
                          Limpar ({activeTag.length})
                        </button>
                      )}
                      <button
                        onClick={() => setOpenDrawer(null)}
                        className="flex items-center gap-1 pub-bar-btn border px-2 py-1.5 rounded-md text-[9px] font-semibold uppercase tracking-widest transition-colors hover:pub-bar-accent"
                      >
                        <X size={12} />
                        Fechar
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setActiveTag([])}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all border whitespace-nowrap ${activeTag.length === 0 ? 'pub-bar-btn-cta border-current' : 'pub-bar-btn border'}`}
                    >
                      Todas{activeTag.length === 0 && <Check size={11} />}
                    </button>
                    {galleryTags.map((tag: string) => {
                      const sel = activeTag.includes(tag);
                      const disabled = !sel && activeTag.length >= 3;
                      return (
                        <button
                          key={tag}
                          disabled={disabled}
                          onClick={() => toggleTag(tag)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all border whitespace-nowrap ${
                            sel
                              ? 'pub-bar-btn-cta border-current'
                              : disabled
                                ? 'opacity-25 cursor-not-allowed pub-bar-btn border'
                                : 'pub-bar-btn border'
                          }`}
                        >
                          {tag}
                          {sel && <Check size={11} />}
                        </button>
                      );
                    })}
                  </div>
                  {activeTag.length >= 3 && (
                    <p className="text-[10px] pub-bar-text uppercase tracking-widest font-semibold">
                      Máximo 3 marcações
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
