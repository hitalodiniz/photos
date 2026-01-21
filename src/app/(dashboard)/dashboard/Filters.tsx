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
import { GALLERY_CATEGORIES } from '@/constants/categories';

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
}: FiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const isMinimal = variant === 'minimal';
  const advancedDropdownRef = useRef<HTMLDivElement>(null);

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
  const hasAdvancedFilters =
    filterCategory || filterType || filterLocation;
  
  // Verificar se há filtros ativos (busca ou data)
  const hasActiveFilters = filterName || filterDateStart || filterDateEnd || hasAdvancedFilters;

  // Classe base: Luxury Editorial com mais padding-y
  const sharedInputClass = `
    w-full !pl-10 pr-4 py-2.5
    outline-none transition-all duration-200 
    rounded-[0.4rem] text-[11px] font-medium box-border
    bg-white border border-slate-200 
    hover:border-slate-300
    focus:border-slate-400 focus:ring-1 focus:ring-slate-200/50 
    text-slate-700 placeholder:text-slate-400
  `;

  const selectClass = `${sharedInputClass} appearance-none cursor-pointer leading-tight`;

  const dateInputClass = `
    w-full py-2.5 px-4
    outline-none transition-all duration-200 
    rounded-[0.4rem] text-[10px] font-medium box-border
    bg-white border border-slate-200 
    focus:border-slate-400 focus:ring-1 focus:ring-slate-200/50
    text-slate-700 text-center
  `;

  return (
    <div
      className={`w-full transition-all duration-500 ${isMinimal ? 'bg-transparent' : 'bg-white p-3 mb-6 rounded-2xl shadow-sm border border-slate-100'}`}
    >
      {/* MOBILE HEADER: Trocado fundo champanhe sólido por borda dourada e fundo branco */}
      <div className="md:hidden flex items-center justify-between w-full mb-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center justify-center rounded-[0.5rem] h-11 font-bold transition-all border ${
            isExpanded
              ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
              : 'bg-white text-black border-gold w-full gap-2 shadow-sm'
          }`}
        >
          <SlidersHorizontal
            size={16}
            className={isExpanded ? 'text-white' : 'text-gold'}
          />
          {isExpanded ? 'Fechar Filtros' : 'Filtrar Acervo'}
        </button>
      </div>

      {/* CONTAINER DOS FILTROS */}
      <div
        className={`${isExpanded ? 'grid grid-cols-2 mt-2' : 'hidden md:flex'} gap-3 md:items-center px-2 py-2`}
      >
        {/* Busca Principal */}
        <div className="relative col-span-2 md:flex-1 md:min-w-[200px] group">
          <Search
            size={14}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-colors ${
              filterName ? 'text-[#D4AF37]' : 'text-slate-400'
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
          <span className="text-white/40 font-bold text-[9px]">/</span>
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

        {/* Botão Filtros Avançados */}
        <div className="relative col-span-2 md:col-span-1" ref={advancedDropdownRef}>
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`w-full md:w-auto py-2.5 px-4 flex items-center justify-between gap-2 rounded-[0.4rem] transition-all border bg-white ${
              hasAdvancedFilters
                ? 'border-slate-200 hover:border-slate-300'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Filter 
                size={14} 
                className={hasAdvancedFilters ? 'text-[#D4AF37]' : 'text-slate-400'} 
              />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-700">
                FILTROS AVANÇADOS
              </span>
              {hasAdvancedFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
              )}
            </div>
            <ChevronDown
              size={12}
              className={`text-slate-400 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown de Filtros Avançados */}
          {isAdvancedOpen && (
            <div className="absolute top-full left-0 right-0 md:right-auto mt-2 bg-white border border-slate-200 rounded-[0.4rem] shadow-lg z-50 p-4 min-w-[300px]">
              <div className="space-y-3">
                {/* Categoria */}
                <div className="relative group">
                  <Tag
                    size={14}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-colors ${
                      filterCategory ? 'text-[#D4AF37]' : 'text-slate-400'
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
                    size={14}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-colors ${
                      filterType ? 'text-[#D4AF37]' : 'text-slate-400'
                    }`}
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Tipos</option>
                    <option value="true">Contrato</option>
                    <option value="false">Cobertura</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>

                {/* Localização */}
                <div className="relative group">
                  <MapPin
                    size={14}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-colors ${
                      filterLocation ? 'text-[#D4AF37]' : 'text-slate-400'
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
            className="col-span-2 md:w-8 md:h-8 text-slate-400 bg-white hover:bg-red-50 hover:text-red-500 rounded-[0.4rem] transition-all flex items-center justify-center shrink-0 border border-slate-200 shadow-sm active:scale-95"
            title="Limpar Filtros"
          >
            <X size={14} strokeWidth={2.5} />
            <span className="md:hidden ml-2 font-bold uppercase text-[10px] tracking-widest">
              Limpar Filtros
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
