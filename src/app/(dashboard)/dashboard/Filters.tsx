'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Search,
  MapPin,
  Tag,
  Briefcase,
  SlidersHorizontal,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { GALLERY_CATEGORIES } from '@/core/config/categories';

interface FiltersProps {
  filterName: string;
  setFilterName: (val: string) => void;
  filterLocation: string;
  setFilterLocation: (val: string) => void;
  filterDateStart: string;
  setFilterDateStart: (val: string) => void;
  filterDateEnd: string;
  setFilterDateEnd: (val: string) => void;
  filterCategory: string;
  setFilterCategory: (val: string) => void;
  filterType: string;
  setFilterType: (val: string) => void;
  resetFilters: () => void;
  variant?: 'minimal' | 'full';
  isMobileInstance?: boolean;
}

export default function Filters({
  setFilterName,
  setFilterLocation,
  filterLocation,
  filterName,
  filterDateStart,
  setFilterDateStart,
  filterDateEnd,
  setFilterDateEnd,
  filterCategory,
  setFilterCategory,
  filterType,
  setFilterType,
  resetFilters,
  variant = 'minimal',
  isMobileInstance = false,
}: FiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const isMinimal = variant === 'minimal';
  const advancedDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobileInstance) return;

    const handleToggle = () => setIsExpanded((prev) => !prev);
    const handleClose = () => setIsExpanded(false);

    window.addEventListener('toggle-mobile-filters', handleToggle);
    window.addEventListener('close-mobile-filters', handleClose);

    // Dispara evento para avisar a Navbar do estado atual
    window.dispatchEvent(
      new CustomEvent('mobile-filters-state', { detail: { isExpanded } }),
    );

    return () => {
      window.removeEventListener('toggle-mobile-filters', handleToggle);
      window.removeEventListener('close-mobile-filters', handleClose);
    };
  }, [isMobileInstance, isExpanded]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        advancedDropdownRef.current &&
        !advancedDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAdvancedOpen(false);
      }
    };

    if (isAdvancedOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdvancedOpen]);

  // Contar filtros avançados ativos
  const hasAdvancedFilters = filterCategory || filterType || filterLocation;

  // Verificar se há filtros ativos (busca ou data)
  const hasActiveFilters =
    filterName || filterDateStart || filterDateEnd || hasAdvancedFilters;

  // Classe base: Luxury Editorial com mais padding-y
  const sharedInputClass = `
    w-full !pl-10 p-2
    outline-none transition-all duration-200 
    rounded-luxury text-[11px] font-medium box-border
    bg-white border border-slate-200 
    hover:border-gold/30
    focus:border-gold focus:ring-4 focus:ring-gold/5 
    text-editorial-ink placeholder:text-slate-400
  `;

  const selectClass = `${sharedInputClass} appearance-none cursor-pointer leading-tight bg-white`;

  const dateInputClass = `
    w-full p-2
    outline-none transition-all duration-200 
    rounded-luxury text-[10px] font-medium box-border
    bg-white border border-slate-200 
    focus:border-gold focus:ring-4 focus:ring-gold/5
    text-editorial-ink text-center
  `;

  return (
    <div
      className={`w-full transition-all duration-500 ${
        isMinimal
          ? 'bg-transparent'
          : isMobileInstance && !isExpanded
            ? 'hidden'
            : 'bg-petroleum p-3 mb-6 rounded-luxury shadow-sm border border-slate-100'
      }`}
    >
      {/* CONTAINER DOS FILTROS */}
      <div
        className={`${isExpanded ? 'grid grid-cols-2' : 'hidden md:flex'} gap-3 md:items-center px-2 py-2`}
      >
        {/* Busca Principal */}
        <div className="relative col-span-2 md:flex-1 md:min-w-[200px] group">
          <Search
            size={16}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-colors ${
              filterName ? 'text-gold' : 'text-slate-400'
            }`}
          />
          <input
            placeholder="Título ou cliente..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className={sharedInputClass}
          />
        </div>

        {/* PERÍODO: Data */}
        <div className="col-span-2 md:w-auto flex items-center gap-1.5">
          <div className="relative w-[110px]">
            <input
              type="date"
              max="9999-12-31"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className={dateInputClass}
            />
          </div>
          <span className="text-slate-300 font-semibold text-[9px]">/</span>
          <div className="relative w-[110px]">
            <input
              type="date"
              max="9999-12-31"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className={dateInputClass}
            />
          </div>
        </div>

        {/* Botão Filtros Avançados - Transformado em Ícone */}
        <div
          className="relative col-span-2 md:col-span-none"
          ref={advancedDropdownRef}
        >
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`
              w-full md:w-8 h-8 flex items-center justify-center rounded-luxury transition-all border shadow-sm
              ${
                isAdvancedOpen
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-400 hover:border-gold/50 hover:text-gold'
              }
            `}
            title="Filtros Avançados"
          >
            <div className="relative flex items-center gap-2">
              <Filter
                size={16}
                className={hasAdvancedFilters ? 'text-gold' : 'currentColor'}
              />
              {/* Texto visível apenas no mobile para não perder o contexto, ou removido se preferir só ícone */}
              <span className="md:hidden text-editorial-label font-bold uppercase tracking-wider">
                Filtros Avançados
              </span>

              {hasAdvancedFilters && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gold shadow-[0_0_5px_rgba(212,175,55,0.8)] border border-white"></span>
              )}
            </div>
          </button>

          {/* Dropdown de Filtros Avançados */}
          {isAdvancedOpen && (
            <div className="absolute top-10 left-0 right-0 md:left-auto md:right-0 mt-2 bg-petroleum rounded-luxury shadow-2xl z-50 p-4 min-w-[280px] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-3">
                <p className="text-[9px] font-semibold text-white uppercase tracking-widest mb-2">
                  Filtrar por:
                </p>

                {/* Categoria */}
                <div className="relative group">
                  <Tag
                    size={16}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-colors ${
                      filterCategory ? 'text-gold' : 'text-slate-400'
                    }`}
                  />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Categorias</option>
                    {GALLERY_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>

                {/* Tipo */}
                <div className="relative group">
                  <Briefcase
                    size={16}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-colors ${
                      filterType ? 'text-gold' : 'text-slate-400'
                    }`}
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Tipos</option>
                    <option value="CT">Entrega de fotos/vídeos</option>
                    <option value="CB">Disponibilização de fotos/vídeos</option>
                    <option value="ES">Seleção de fotos/vídeos</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>

                {/* Localização */}
                <div className="relative group">
                  <MapPin
                    size={16}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-colors ${
                      filterLocation ? 'text-gold' : 'text-slate-400'
                    }`}
                  />
                  <input
                    placeholder="Local"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className={sharedInputClass}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botão Limpar */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="col-span-2 md:w-8 md:h-8 text-slate-400 bg-white hover:bg-red-50 hover:text-red-500 rounded-luxury transition-all flex items-center justify-center shrink-0 border border-slate-200 shadow-sm active:scale-95"
            title="Limpar Filtros"
          >
            <X size={16} strokeWidth={2.5} />
            <span className="md:hidden ml-2 text-editorial-label">
              Limpar Filtros
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
