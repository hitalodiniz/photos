'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Instagram,
  Globe,
  MapPin,
  Tag,
  Link as LinkIcon,
  Check,
  ChevronDown,
  X,
  Compass,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { PlanGuard } from '@/components/auth/PlanGuard';

export const ProfileToolBar = ({
  phone,
  instagram,
  website,
  cities = [],
  specialties = [],
  onFilterChange,
  activeFilter,
  categories = [],
}: any) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const check = () =>
      setIsNarrow(typeof window !== 'undefined' && window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [mounted]);

  const { barCities, barSpecs, uniqueCategories } = useMemo(() => {
    const shuffleArray = (array: any[]) => {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };

    const maxCitiesOnBar = 2;
    const maxSpecsOnBar = 2;

    const shuffledCities = shuffleArray(cities);
    const shuffledSpecs = shuffleArray(specialties);

    return {
      barCities: shuffledCities.slice(0, maxCitiesOnBar),
      barSpecs: shuffledSpecs.slice(0, maxSpecsOnBar),
      uniqueCategories: Array.from(new Set(categories)).filter(Boolean),
    };
  }, [cities, specialties, categories]);

  const needsCollapse =
    cities.length > barCities.length || specialties.length > barSpecs.length;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFilter = (val: string) => {
    const newVal = activeFilter === val ? 'all' : val;
    onFilterChange?.(newVal);
    setIsDrawerOpen(false);
  };

  const { categoryCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((cat: string) => {
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return {
      categoryCounts: counts,
      uniqueCatList: Object.keys(counts).sort(),
    };
  }, [categories]);

  if (!mounted) return null;

  return (
    <div className="z-[110] sticky top-0 w-full font-sans">
      <div className="mx-auto pub-bar-bg w-full border-b pub-bar-border-b shadow-2xl relative">
        {/* ── BARRA PRINCIPAL ── */}
        <div className="flex flex-row items-center w-full max-w-[1600px] px-3 h-10 mx-auto gap-1">
          {/* ESQUERDA */}
          <div className="flex-1 min-w-0 flex items-center overflow-hidden">
            <PlanGuard feature="profileLevel" variant="mini">
              <div className="flex items-center gap-1 overflow-hidden min-w-0">
                <div
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsDrawerOpen(!isDrawerOpen);
                    }
                  }}
                  className={`flex items-center gap-1 shrink-0 group h-7 px-3 rounded-md transition-all cursor-pointer ${
                    isDrawerOpen && isNarrow
                      ? 'pub-bar-active'
                      : isNarrow
                        ? 'border pub-bar-btn'
                        : ''
                  }`}
                >
                  {isNarrow ? (
                    // ── MOBILE: botão "Explorar" com borda e chevron ──
                    <>
                      <span className="text-[10px] font-semibold uppercase tracking-wide pub-bar-text">
                        Explorar
                      </span>
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-300 pub-bar-icon ${
                          isDrawerOpen ? 'rotate-180' : ''
                        }`}
                      />
                      {/* BOTÃO LIMPAR FILTRO (MOBILE) */}
                      {activeFilter !== 'all' && (
                        <div className="pl-2 border-l pub-bar-drawer-border ml-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Evita abrir a gaveta
                              onFilterChange?.('all');
                            }}
                            className={`text-[9px] font-medium uppercase px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors pub-bar-btn border hover:pub-bar-accent`}
                          >
                            <X size={13} />
                            Limpar filtro
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    // ── DESKTOP ──
                    <>
                      {/* CIDADES */}
                      {barCities.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0 ">
                          <span className="text-[10px] font-semibold uppercase tracking-widest pub-bar-text flex items-center transition-colors group-hover:pub-bar-accent">
                            <MapPin
                              size={14}
                              className="mr-1.5 pub-bar-icon transition-colors group-hover:pub-bar-accent"
                            />
                            <span className="hidden xl:inline-block">
                              Cidades:
                            </span>
                          </span>
                          <div className="flex items-center gap-2">
                            {barCities.map((city: string, i: number) => (
                              <React.Fragment key={city}>
                                <span className="text-[11px] font-medium pub-bar-text uppercase whitespace-nowrap transition-colors group-hover:pub-bar-accent">
                                  {city}
                                </span>
                                {i < barCities.length - 1 && (
                                  <span className="pub-bar-muted text-[12px] transition-colors group-hover:pub-bar-accent">
                                    |
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                      {(() => {
                        const hidden = cities.length - barCities.length;
                        if (hidden <= 0) return null;
                        return (
                          <>
                            <div className="px-2 flex items-center gap-1">
                              <span className="text-[11px] font-medium pub-bar-text whitespace-nowrap">
                                +{hidden}
                              </span>
                              <ChevronDown
                                size={16}
                                className={`transition-transform duration-300 pub-bar-icon group-hover:pub-bar-accent ${
                                  isDrawerOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          </>
                        );
                      })()}

                      {/* SEPARADOR */}
                      {barCities.length > 0 && barSpecs.length > 0 && (
                        <div className="h-5 w-[1px] pub-bar-divider shrink-0 mx-1" />
                      )}

                      {/* ESPECIALIDADES */}
                      {barSpecs.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0 pl-3">
                          <span className="text-[10px] font-semibold uppercase tracking-widest pub-bar-text flex items-center gap-1.5 transition-colors group-hover:pub-bar-accent">
                            <Tag
                              size={14}
                              className="pub-bar-icon transition-colors group-hover:pub-bar-accent"
                            />
                            <span className="hidden xl:inline-block">
                              Especialidades:
                            </span>
                          </span>
                          <div className="flex items-center gap-2">
                            {barSpecs.map((spec: string, i: number) => (
                              <React.Fragment key={spec}>
                                <span
                                  className={`text-[11px] font-medium uppercase transition-all ${
                                    activeFilter === spec
                                      ? 'pub-bar-accent'
                                      : 'pub-bar-text group-hover:pub-bar-accent'
                                  }`}
                                >
                                  {spec}
                                </span>
                                {i < barSpecs.length - 1 && (
                                  <span className="pub-bar-muted text-[13px] transition-colors group-hover:pub-bar-accent">
                                    |
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                      {specialties.length > barSpecs.length && (
                        <span className="text-[11px] font-medium pub-bar-text whitespace-nowrap px-2">
                          +{specialties.length - barSpecs.length}
                        </span>
                      )}

                      {/* CHEVRON desktop — dentro do botão com borda */}
                      {(cities.length > 0 || specialties.length > 0) && (
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-300 pub-bar-icon group-hover:pub-bar-accent ${
                            isDrawerOpen ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                      {/* BOTÃO VER TODAS / LIMPAR FILTRO (DESKTOP) */}
                      {activeFilter !== 'all' && (
                        <div className="pl-3 border-l pub-bar-drawer-border ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Evita abrir a gaveta
                              onFilterChange?.('all');
                            }}
                            className={`text-[10px] font-medium uppercase px-2 py-1 rounded-full flex items-center gap-1.5 transition-colors pub-bar-btn border hover:pub-bar-accent`}
                          >
                            {' '}
                            <X size={13} />
                            Limpar Filtro
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </PlanGuard>
          </div>

          {/* DIREITA: contatos */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-auto">
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                className="flex items-center justify-center rounded-md h-8 w-8 md:w-28 md:px-2 border pub-bar-btn transition-all hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white hover:border-transparent"
              >
                <Instagram size={15} className="pub-bar-icon" />
                <span className="text-[10px] font-semibold uppercase hidden lg:block ml-2">
                  Instagram
                </span>
              </a>
            )}
            {website && (
              <a
                href={
                  website.startsWith('http') ? website : `https://${website}`
                }
                target="_blank"
                className="flex items-center justify-center rounded-md h-8 w-8 md:w-28 md:px-2 border pub-bar-btn transition-all"
              >
                <Globe size={15} className="pub-bar-icon" />
                <span className="text-[10px] font-semibold uppercase hidden lg:block ml-2">
                  Abrir Site
                </span>
              </a>
            )}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center rounded-md h-8 w-8 md:w-28 md:px-2 border pub-bar-btn transition-all"
            >
              {copied ? (
                <Check size={15} className="text-green-500" />
              ) : (
                <LinkIcon size={15} className="pub-bar-icon" />
              )}
              <span className="text-[10px] font-semibold uppercase hidden lg:block ml-2">
                Copiar Link
              </span>
            </button>
            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                target="_blank"
                className="flex shrink-0 items-center justify-center rounded-md h-8 w-8 md:w-28 md:px-2 bg-[#25D366] text-white shadow-lg shadow-green-500/10"
              >
                <WhatsAppIcon className="w-4 h-4 flex-shrink-0" />
                <span className="text-[10px] font-semibold uppercase hidden md:block ml-2 whitespace-nowrap">
                  WhatsApp
                </span>
              </a>
            )}
          </div>
        </div>

        {/* ── GAVETA ── */}
        <div
          className={`overflow-hidden transition-all duration-300 border-t pub-bar-drawer-border ${
            isDrawerOpen
              ? 'max-h-[600px] opacity-100'
              : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="max-w-[1600px] mx-auto px-3 md:px-6 py-3 relative">
            {/* Botão fechar */}
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="absolute top-2 right-4 md:right-6 pub-bar-muted hover:pub-bar-text transition-colors p-1"
            >
              <X size={13} />
            </button>

            <div className="flex flex-col md:flex-row gap-4 md:gap-8 pr-6">
              {/* CIDADES */}
              {cities.length > 0 && (
                <div className="flex flex-col gap-2 w-full md:w-1/4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest pub-bar-text flex items-center gap-1.5">
                    <MapPin size={15} className="pub-bar-icon" /> Cidades
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {cities.map((city: string) => (
                      <a
                        key={`city-${city}`}
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-medium uppercase pub-bar-btn border px-3 py-1.5 rounded-full transition-colors hover:pub-bar-accent"
                      >
                        {city}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ESPECIALIDADES */}
              {specialties.length > 0 && (
                <div className="flex flex-col gap-2 w-full md:w-1/4 border-t md:border-t-0 md:border-l pub-bar-drawer-border pt-3 md:pt-0 md:pl-6">
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest pub-bar-text flex items-center gap-1.5">
                    <Tag size={15} className="pub-bar-icon" /> Especialidades
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {specialties.map((spec: string) => (
                      <button
                        key={`spec-${spec}`}
                        onClick={() => toggleFilter(spec)}
                        className={`text-[10px] font-medium uppercase px-3 py-1.5 rounded-full transition-colors ${
                          activeFilter === spec
                            ? 'pub-bar-active'
                            : 'pub-bar-btn border hover:pub-bar-accent'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CATEGORIAS */}
              {uniqueCategories.length > 0 && (
                <div className="flex flex-col gap-2 w-full md:w-1/2 border-t md:border-t-0 md:border-l pub-bar-drawer-border pt-3 md:pt-0 md:pl-6">
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest pub-bar-text flex items-center gap-1.5">
                    <Compass size={15} className="pub-bar-icon" /> Categorias
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        onFilterChange?.('all');
                        setIsDrawerOpen(false);
                      }}
                      className={`text-[10px] font-medium uppercase px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors ${
                        activeFilter === 'all'
                          ? 'pub-bar-active'
                          : 'pub-bar-btn border hover:pub-bar-accent'
                      }`}
                    >
                      Ver Todas
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full pub-bar-btn border">
                        {categories.length}
                      </span>
                    </button>
                    {(uniqueCategories as string[]).map((cat: string) => (
                      <button
                        key={cat}
                        onClick={() => toggleFilter(cat)}
                        className={`text-[10px] font-medium uppercase px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors ${
                          activeFilter === cat
                            ? 'pub-bar-active'
                            : 'pub-bar-btn border hover:pub-bar-accent'
                        }`}
                      >
                        {cat}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-all ${
                            activeFilter === cat
                              ? 'pub-bar-active'
                              : 'pub-bar-btn'
                          }`}
                        >
                          {categoryCounts[cat]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
