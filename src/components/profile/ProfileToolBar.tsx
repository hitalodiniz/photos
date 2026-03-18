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
  Plus,
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
    const maxCitiesOnBar = 2;
    const maxSpecsOnBar = 2;
    return {
      barCities: cities.slice(0, maxCitiesOnBar),
      barSpecs: specialties.slice(0, maxSpecsOnBar),
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
      {/* ── BARRA PRINCIPAL ── */}
      <div className="mx-auto pub-bar-bg w-full border-b pub-bar-border-b shadow-2xl relative">
        <div className="flex flex-row items-center w-full max-w-[1600px] px-3 md:px-4 h-12 mx-auto gap-2">
          {/* ESQUERDA: cidades + especialidades + botão atuação */}
          <div className="flex-1 min-w-0 flex items-center overflow-hidden">
            <PlanGuard feature="profileLevel" variant="mini">
              <div className="flex items-center gap-4 overflow-hidden min-w-0">
                <div className="hidden lg:flex items-center gap-6 overflow-hidden min-w-0">
                  {/* CIDADES */}
                  {barCities.length > 0 && (
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest pub-bar-text flex items-center">
                        <MapPin size={12} className="mr-1.5 pub-bar-icon" />{' '}
                        Cidades:
                      </span>
                      <div className="flex items-center gap-2">
                        {barCities.map((city: string, i: number) => (
                          <React.Fragment key={city}>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold pub-bar-text uppercase whitespace-nowrap transition-colors hover:pub-bar-accent"
                            >
                              {city}
                            </a>
                            {i < barCities.length - 1 && (
                              <span className="pub-bar-muted text-[10px]">
                                |
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SEPARADOR VERTICAL */}
                  {barCities.length > 0 && barSpecs.length > 0 && (
                    <div className="h-5 w-[1px] pub-bar-divider shrink-0" />
                  )}

                  {/* ESPECIALIDADES */}
                  {barSpecs.length > 0 && (
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest pub-bar-text flex items-center gap-1.5">
                        <Tag size={12} className="pub-bar-icon" />{' '}
                        Especialidades:
                      </span>
                      <div className="flex items-center gap-2">
                        {barSpecs.map((spec: string, i: number) => (
                          <React.Fragment key={spec}>
                            <button
                              onClick={() => toggleFilter(spec)}
                              className={`text-[11px] font-semibold uppercase transition-all ${
                                activeFilter === spec
                                  ? 'pub-bar-accent'
                                  : 'pub-bar-text hover:pub-bar-accent'
                              }`}
                            >
                              {spec}
                            </button>
                            {i < barSpecs.length - 1 && (
                              <span className="pub-bar-muted text-[10px]">
                                |
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTÃO ATUAÇÃO */}
                {(needsCollapse || isNarrow || activeFilter !== 'all') && (
                  <button
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    className={`flex items-center justify-center rounded-md h-9 px-4 border transition-all ml-auto group shrink-0 ${
                      isDrawerOpen || activeFilter !== 'all'
                        ? 'pub-bar-active'
                        : 'pub-bar-btn border'
                    }`}
                  >
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {activeFilter !== 'all' ? (
                        <X size={16} />
                      ) : isDrawerOpen ? (
                        <X size={16} />
                      ) : (
                        <Plus size={16} />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {activeFilter !== 'all'
                          ? activeFilter
                          : isDrawerOpen
                            ? 'Fechar'
                            : 'Atuação'}
                      </span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`ml-2 transition-transform duration-300 ${isDrawerOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
              </div>
            </PlanGuard>
          </div>

          {/* DIREITA: contatos */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-auto">
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                className="flex items-center justify-center rounded-md h-9 w-9 md:w-auto md:px-4 border pub-bar-btn transition-all hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white hover:border-transparent"
              >
                <Instagram size={18} className="pub-bar-icon" />
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
                className="flex items-center justify-center rounded-md h-9 w-9 md:w-auto md:px-4 border pub-bar-btn transition-all"
              >
                <Globe size={18} className="pub-bar-icon" />
                <span className="text-[10px] font-semibold uppercase hidden lg:block ml-2">
                  Site
                </span>
              </a>
            )}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center rounded-md h-9 w-9 md:w-auto md:px-4 border pub-bar-btn transition-all"
            >
              {copied ? (
                <Check size={18} className="text-green-500" />
              ) : (
                <LinkIcon size={18} className="pub-bar-icon" />
              )}
              <span className="text-[10px] font-semibold uppercase hidden lg:block ml-2">
                Link
              </span>
            </button>
            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                target="_blank"
                className="flex shrink-0 items-center justify-center rounded-md h-9 w-9 md:w-auto md:px-5 bg-[#25D366] text-white shadow-lg shadow-green-500/10"
              >
                <WhatsAppIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-[10px] font-semibold uppercase hidden md:block ml-2 whitespace-nowrap">
                  Contato
                </span>
              </a>
            )}
          </div>
        </div>

        {/* GAVETA */}
        <div
          className={`overflow-hidden transition-all duration-500 pub-bar-drawer border-t pub-bar-drawer-border ${
            isDrawerOpen
              ? 'max-h-[800px] opacity-100'
              : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="max-w-[1600px] mx-auto px-5 py-3 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* CIDADES */}
            {cities.length > 0 && (
              <div className="flex flex-col gap-4">
                <h4 className="pub-bar-text text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={12} className="pub-bar-icon" /> Cidades
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {cities.map((city: string, i: number) => (
                    <React.Fragment key={`city-${city}`}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium uppercase pub-bar-text transition-colors hover:pub-bar-accent"
                      >
                        {city}
                      </a>
                      {i < cities.length - 1 && (
                        <span className="pub-bar-muted text-[10px] select-none">
                          |
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* ESPECIALIDADES */}
            {specialties.length > 0 && (
              <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l pub-bar-drawer-border pt-1 md:pt-0 md:pl-4">
                <h4 className="pub-bar-text text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                  <Tag size={12} className="pub-bar-icon" /> Especialidades
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {specialties.map((spec: string, i: number) => (
                    <React.Fragment key={`spec-${spec}`}>
                      <button
                        onClick={() => toggleFilter(spec)}
                        className={`text-[11px] font-medium uppercase transition-colors ${
                          activeFilter === spec
                            ? 'pub-bar-accent'
                            : 'pub-bar-text hover:pub-bar-accent'
                        }`}
                      >
                        {spec}
                      </button>
                      {i < specialties.length - 1 && (
                        <span className="pub-bar-muted text-[10px] select-none">
                          |
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* CATEGORIAS */}
            {uniqueCategories.length > 0 && (
              <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l pub-bar-drawer-border pt-1 md:pt-0 md:pl-4">
                <h4 className="pub-bar-text text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                  <Compass size={12} className="pub-bar-icon" /> Categorias
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleFilter('all')}
                    className={`text-[11px] font-medium uppercase flex items-center gap-1.5 transition-colors ${
                      activeFilter === 'all'
                        ? 'pub-bar-accent'
                        : 'pub-bar-muted hover:pub-bar-text'
                    }`}
                  >
                    Ver Tudo
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full pub-bar-btn border">
                      {categories.length}
                    </span>
                  </button>

                  {(uniqueCategories as string[]).map((cat: string) => (
                    <React.Fragment key={cat}>
                      <span className="pub-bar-muted text-[10px] select-none">
                        |
                      </span>
                      <button
                        onClick={() => toggleFilter(cat)}
                        className={`text-[11px] font-medium uppercase flex items-center gap-1.5 transition-colors ${
                          activeFilter === cat
                            ? 'pub-bar-accent'
                            : 'pub-bar-text hover:pub-bar-accent'
                        }`}
                      >
                        {cat}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-all ${
                            activeFilter === cat
                              ? 'pub-bar-active'
                              : 'pub-bar-btn border'
                          }`}
                        >
                          {categoryCounts[cat]}
                        </span>
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
