'use client';
import React, { useState, useEffect, useMemo } from 'react';
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

  useEffect(() => setMounted(true), []);

  // 🎯 Lógica de Limite e Limpeza de Categorias
  const { barCities, barSpecs, uniqueCategories } = useMemo(() => {
    const totalLimit = 5;
    const cCount = Math.min(cities.length, 2);
    const sCount = Math.min(specialties.length, totalLimit - cCount);

    return {
      barCities: cities.slice(0, cCount),
      barSpecs: specialties.slice(0, sCount),
      uniqueCategories: Array.from(new Set(categories)).filter(Boolean), // Filtra duplicados e vazios
    };
  }, [cities, specialties, categories]);

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

    //categories aqui deve ser a lista bruta de IDs ou Labels vinda do banco
    categories.forEach((cat: string) => {
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return {
      categoryCounts: counts,
      // Pegamos as chaves únicas para o map do JSX
      uniqueCatList: Object.keys(counts).sort(),
    };
  }, [categories]);

  if (!mounted) return null;

  return (
    <div className="z-[110] sticky top-0 w-full font-sans">
      <div className="mx-auto bg-petroleum backdrop-blur-xl w-full border-b border-white/10 shadow-2xl relative">
        <div className="flex flex-row items-center w-full max-w-[1600px] px-3 md:px-4 h-12 mx-auto gap-2">
          <div className="flex-1 min-w-0 flex items-center overflow-hidden">
            <PlanGuard feature="profileLevel" variant="mini">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="hidden lg:flex items-center gap-2 overflow-hidden">
                  {/* CIDADES */}
                  {barCities.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-champagne flex items-center">
                        <MapPin size={12} className="mr-1" /> Cidades:
                      </span>
                      {barCities.map((city, i) => (
                        <React.Fragment key={city}>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-white uppercase whitespace-nowrap hover:text-gold transition-colors"
                          >
                            {city}
                          </a>
                          {i < barCities.length - 1 && (
                            <span className=" text-white/30">|</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* ESPECIALIDADES */}
                  {barSpecs.length > 0 && (
                    <div className="hidden xl:flex items-center gap-2 shrink-0 border-l border-white/10 pl-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-champagne flex items-center gap-1">
                        <Tag size={12} /> Áreas:
                      </span>
                      {barSpecs.map((spec, i) => (
                        <button
                          key={spec}
                          onClick={() => toggleFilter(spec)}
                          className={`text-[11px] font-semibold uppercase transition-colors ${activeFilter === spec ? 'text-gold' : 'text-white hover:text-gold'}`}
                        >
                          {spec}
                          {i < barSpecs.length - 1 && (
                            <span className="ml-1 text-gold/40">|</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className={`flex items-center gap-2 h-8 transition-all lg:hidden xl:flex ml-auto group ${isDrawerOpen || activeFilter !== 'all' ? 'text-gold' : 'text-gold/70'}`}
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    {activeFilter !== 'all' ? (
                      <X
                        size={14}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFilterChange('all');
                        }}
                      />
                    ) : (
                      <Plus size={14} />
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-widest">
                      {activeFilter !== 'all'
                        ? activeFilter
                        : isDrawerOpen
                          ? 'Fechar'
                          : 'Atuação'}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${isDrawerOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </PlanGuard>
          </div>

          {/* CONTATOS - Ajustado para proteger o WhatsApp */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-auto">
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                className="flex items-center justify-center rounded-luxury h-9 w-9 md:w-auto md:px-4 border border-white/10 bg-white/5 text-white hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] transition-all"
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
                className="flex items-center justify-center rounded-luxury h-9 w-9 md:w-auto md:px-4 border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black transition-all"
              >
                <Globe size={18} />{' '}
                <span className="text-[10px] font-semibold uppercase hidden lg:block ml-2">
                  Site
                </span>
              </a>
            )}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center rounded-luxury h-9 w-9 md:w-auto md:px-4 border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all"
            >
              {copied ? (
                <Check size={18} className="text-green-500" />
              ) : (
                <LinkIcon size={18} />
              )}
              <span className="text-[10px] font-semibold uppercase hidden lg:block ml-2">
                Link
              </span>
            </button>

            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                target="_blank"
                className="flex shrink-0 items-center justify-center rounded-luxury h-9 w-9 md:w-auto md:px-5 bg-[#25D366] text-white shadow-lg shadow-green-500/10"
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
          className={`overflow-hidden transition-all duration-500 bg-petroleum/95 border-t border-white/10 ${isDrawerOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
        >
          <div className="max-w-[1600px] mx-auto p-5 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* CIDADES */}
            {cities.length > 0 && (
              <div className="flex flex-col gap-4">
                <h4 className="text-gold/80 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={12} /> Cidades
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {cities.map((city, i) => (
                    <React.Fragment key={`city-${city}`}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] font-semibold uppercase text-white/80 hover:text-gold transition-colors"
                      >
                        {city}
                      </a>
                      {i < cities.length - 1 && (
                        <span className="text-white/10 text-[10px] select-none">
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
              <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-white/20 pt-6 md:pt-0 md:pl-10">
                <h4 className="text-gold/80 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                  <Tag size={12} /> Especialidades
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {specialties.map((spec, i) => (
                    <React.Fragment key={`spec-${spec}`}>
                      <button
                        onClick={() => toggleFilter(spec)}
                        className={`text-[12px] font-semibold uppercase transition-colors ${
                          activeFilter === spec
                            ? 'text-gold'
                            : 'text-white/80 hover:text-gold'
                        }`}
                      >
                        {spec}
                      </button>
                      {i < specialties.length - 1 && (
                        <span className="text-white/10 text-[10px] select-none">
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
              <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-white/20 pt-6 md:pt-0 md:pl-10">
                <h4 className="text-gold/80 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2">
                  <Compass size={12} /> Categorias
                </h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <button
                    onClick={() => toggleFilter('all')}
                    className={`text-[12px] font-semibold uppercase flex items-center gap-1.5 transition-colors ${
                      activeFilter === 'all'
                        ? 'text-gold'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    Ver Tudo
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                      {categories.length}
                    </span>
                  </button>

                  {uniqueCategories.map((cat: string) => (
                    <React.Fragment key={cat}>
                      <span className="text-white/10 text-[10px] select-none">
                        |
                      </span>
                      <button
                        onClick={() => toggleFilter(cat)}
                        className={`text-[12px] font-semibold uppercase flex items-center gap-1.5 transition-colors ${
                          activeFilter === cat
                            ? 'text-gold'
                            : 'text-white/80 hover:text-gold'
                        }`}
                      >
                        {cat}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-all ${
                            activeFilter === cat
                              ? 'border-gold/30 bg-gold/10 text-gold'
                              : 'border-white/10 bg-white/5 text-white/60'
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
