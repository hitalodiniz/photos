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
  categories = [], // Categorias das galerias enviadas pelo pai
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

  // Lógica de limite de itens na barra
  const { barCities, barSpecs, uniqueCategories } = useMemo(() => {
    const maxCitiesOnBar = 2;
    const maxSpecsOnBar = 2;
    return {
      barCities: cities.slice(0, maxCitiesOnBar),
      barSpecs: specialties.slice(0, maxSpecsOnBar),
      uniqueCategories: Array.from(new Set(categories)).filter(Boolean),
    };
  }, [cities, specialties, categories]);

  // Se o número total de itens for maior que o exibido, mostramos o botão da gaveta
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
      <div className="mx-auto bg-petroleum backdrop-blur-xl w-full border-b border-champagne/10 shadow-2xl relative">
        <div className="flex flex-row items-center w-full max-w-[1600px] px-3 md:px-4 h-12 mx-auto gap-2">
          <div className="flex-1 min-w-0 flex items-center overflow-hidden">
            <PlanGuard feature="profileLevel" variant="mini">
              <div className="flex items-center gap-4 overflow-hidden min-w-0">
                <div className="hidden lg:flex items-center gap-6 overflow-hidden min-w-0">
                  {/* CIDADES */}
                  {barCities.length > 0 && (
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-champagne flex items-center">
                        <MapPin size={12} className="mr-1.5" /> Cidades:
                      </span>
                      <div className="flex items-center gap-2">
                        {barCities.map((city, i) => (
                          <React.Fragment key={city}>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-champagne uppercase whitespace-nowrap hover:text-gold transition-colors"
                            >
                              {city}
                            </a>
                            {i < barCities.length - 1 && (
                              <span className="text-champagne/40 text-[10px]">
                                |
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SEPARADOR VERTICAL ESTRUTURAL */}
                  {barCities.length > 0 && barSpecs.length > 0 && (
                    <div className="h-5 w-[1px] bg-champagne shrink-0" />
                  )}

                  {/* ESPECIALIDADES */}
                  {barSpecs.length > 0 && (
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-champagne flex items-center gap-1.5">
                        <Tag size={12} /> Especialidades:
                      </span>
                      <div className="flex items-center gap-2">
                        {barSpecs.map((spec, i) => (
                          <React.Fragment key={spec}>
                            <button
                              onClick={() => toggleFilter(spec)}
                              className={`text-[11px] font-semibold uppercase transition-all ${
                                activeFilter === spec
                                  ? 'text-gold'
                                  : 'text-champagne hover:text-gold'
                              }`}
                            >
                              {spec}
                            </button>
                            {i < barSpecs.length - 1 && (
                              <span className="text-gold/30 text-[10px]">
                                |
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTÃO ATUAÇÃO (DIREITA) */}
                {(needsCollapse || isNarrow || activeFilter !== 'all') && (
                  <button
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    className={`flex items-center justify-center rounded-md h-9 px-4 border transition-all ml-auto group shrink-0 ${
                      isDrawerOpen || activeFilter !== 'all'
                        ? 'border-gold/40 bg-gold/10 text-gold shadow-[0_0_15px_rgba(212,175,55,0.05)]'
                        : 'border-champagne/20 bg-petroleum/5 text-champagne hover:bg-champagne/10 hover:border-champagne/30'
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

          {/* CONTATOS */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-auto">
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                className="flex items-center justify-center rounded-md h-9 w-9 md:w-auto md:px-4 border border-champagne/20 bg-petroleum/5 text-champagne hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white hover:border-transparent transition-all"
              >
                <Instagram size={18} />{' '}
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
                className="flex items-center justify-center rounded-md h-9 w-9 md:w-auto md:px-4 border border-champagne/20 bg-petroleum/5 text-champagne hover:bg-champagne/20 hover:border-champagne/30 transition-all"
              >
                <Globe size={18} />{' '}
                <span className="text-[10px] font-semibold uppercase hidden lg:block ml-2 text-champagne">
                  Site
                </span>
              </a>
            )}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center rounded-md h-9 w-9 md:w-auto md:px-4 border border-champagne/20 bg-petroleum/5 text-champagne hover:bg-champagne/10 transition-all"
            >
              {copied ? (
                <Check size={18} className="text-green-500" />
              ) : (
                <LinkIcon size={18} />
              )}
              <span className="text-[10px] font-semibold uppercase hidden lg:block ml-2 text-champagne">
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
          className={`overflow-hidden transition-all duration-500 bg-petroleum/95 border-t border-champagne/10 ${
            isDrawerOpen
              ? 'max-h-[800px] opacity-100'
              : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="max-w-[1600px] mx-auto px-5 py-3 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* CIDADES */}
            {cities.length > 0 && (
              <div className="flex flex-col gap-4">
                <h4 className="text-champagne text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={12} /> Cidades
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {cities.map((city, i) => (
                    <React.Fragment key={`city-${city}`}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          city,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium uppercase text-champagne hover:text-gold transition-colors"
                      >
                        {city}
                      </a>
                      {i < cities.length - 1 && (
                        <span className="text-champagne/30 text-[10px] select-none">
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
              <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-champagne/20 pt-1 md:pt-0 md:pl-4">
                <h4 className="text-champagne text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                  <Tag size={12} /> Especialidades
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {specialties.map((spec, i) => (
                    <React.Fragment key={`spec-${spec}`}>
                      <button
                        onClick={() => toggleFilter(spec)}
                        className={`text-[11px] font-medium uppercase transition-colors ${
                          activeFilter === spec
                            ? 'text-gold'
                            : 'text-champagne/90 hover:text-gold'
                        }`}
                      >
                        {spec}
                      </button>
                      {i < specialties.length - 1 && (
                        <span className="text-champagne/30 text-[10px] select-none">
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
              <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-champagne/20 pt-1 md:pt-0 md:pl-4">
                <h4 className="text-champagne text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                  <Compass size={12} /> Categorias
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleFilter('all')}
                    className={`text-[11px] font-medium uppercase flex items-center gap-1.5 transition-colors ${
                      activeFilter === 'all'
                        ? 'text-gold'
                        : 'text-champagne/60 hover:text-champagne/80'
                    }`}
                  >
                    Ver Tudo
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-champagne/10 border border-champagne/20">
                      {categories.length}
                    </span>
                  </button>

                  {uniqueCategories.map((cat: string) => (
                    <React.Fragment key={cat}>
                      <span className="text-champagne/30 text-[10px] select-none">
                        |
                      </span>
                      <button
                        onClick={() => toggleFilter(cat)}
                        className={`text-[11px] font-medium uppercase flex items-center gap-1.5 transition-colors ${
                          activeFilter === cat
                            ? 'text-gold'
                            : 'text-champagne hover:text-gold'
                        }`}
                      >
                        {cat}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-all ${
                            activeFilter === cat
                              ? 'border-gold/30 bg-gold/10 text-gold'
                              : 'border-champagne/20 bg-champagne/10 text-champagne/80'
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
