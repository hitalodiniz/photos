'use client';

import { useState } from 'react';
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
  const isMinimal = variant === 'minimal';

  // Classe base: Fundo branco, borda ardósia clara e foco em dourado
  const sharedInputClass = `
    w-full !pl-9 pr-3 h-[38px] md:h-[40px] 
    outline-none transition-all duration-300 
    rounded-[0.5rem] text-[12px] font-medium box-border
    bg-white border border-slate-200 
    focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 
    text-slate-700 placeholder:text-slate-400
  `;

  const selectClass = `${sharedInputClass} appearance-none cursor-pointer leading-tight`;

  const dateInputClass = `
    w-full h-[38px] md:h-[40px] px-2
    outline-none transition-all duration-300 
    rounded-[0.5rem] text-[11px] md:text-[12px] font-medium box-border
    bg-white border border-slate-200 
    focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 
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
              : 'bg-white text-black border-[#D4AF37] w-full gap-2 shadow-sm'
          }`}
        >
          <SlidersHorizontal
            size={16}
            className={isExpanded ? 'text-white' : 'text-[#D4AF37]'}
          />
          {isExpanded ? 'Fechar Filtros' : 'Filtrar Acervo'}
        </button>
      </div>

      {/* CONTAINER DOS FILTROS */}
      <div
        className={`${isExpanded ? 'grid grid-cols-2 mt-4' : 'hidden md:flex'} gap-2 md:items-center`}
      >
        {/* Label Visual */}
        <div className="hidden lg:flex items-center gap-2 px-1 shrink-0">
          <Filter className="text-[#D4AF37] w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
            Filtros
          </span>
        </div>

        {/* Busca Principal */}
        <div className="relative col-span-2 md:flex-1 md:min-w-[150px] group">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"
          />
          <input
            placeholder="Título ou cliente..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className={sharedInputClass}
          />
        </div>

        {/* Categoria */}
        <div className="relative group md:w-36">
          <Tag
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"
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
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {/* Tipo */}
        <div className="relative group md:w-32">
          <Briefcase
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"
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
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {/* Localização */}
        <div className="relative group md:w-32">
          <MapPin
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"
          />
          <input
            placeholder="Local"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className={sharedInputClass}
          />
        </div>

        {/* PERÍODO: Background mais neutro (slate-50) para combinar com fundo claro */}
        <div className="col-span-2 md:w-auto flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100 gap-1">
          <div className="relative w-[110px] md:w-[125px]">
            <input
              type="date"
              max="9999-12-31"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className={dateInputClass}
            />
          </div>
          <span className="text-slate-300 font-bold text-[10px]">/</span>
          <div className="relative w-[110px] md:w-[125px]">
            <input
              type="date"
              max="9999-12-31"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className={dateInputClass}
            />
          </div>
        </div>

        {/* Botão Limpar */}
        {(filterName ||
          filterLocation ||
          filterDateStart ||
          filterDateEnd ||
          filterCategory ||
          filterType) && (
          <button
            onClick={resetFilters}
            className="col-span-2 md:w-9 md:h-9 text-slate-400 bg-white hover:bg-red-50 hover:text-red-500 rounded-[0.5rem] transition-all flex items-center justify-center shrink-0 border border-slate-200 shadow-sm active:scale-95"
            title="Limpar Filtros"
          >
            <X size={18} strokeWidth={2.5} />
            <span className="md:hidden ml-2 font-bold uppercase text-[10px] tracking-widest">
              Limpar Filtros
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
