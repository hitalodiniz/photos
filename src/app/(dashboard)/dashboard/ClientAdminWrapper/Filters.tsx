'use client';

import { useState } from 'react';
import {
  X,
  Search,
  MapPin,
  Calendar,
  Tag,
  Briefcase,
  SlidersHorizontal,
  Filter,
} from 'lucide-react';
import { GALLERY_CATEGORIES } from '@/constants/categories';

export default function Filters({
  filterName,
  filterLocation,
  filterDate,
  filterCategory,
  filterType,
  setFilterName,
  setFilterLocation,
  setFilterDate,
  setFilterCategory,
  setFilterType,
  resetFilters,
  variant = 'minimal',
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMinimal = variant === 'minimal';

  // Altura padronizada para mobile e desktop
  const inputBaseClass =
    'w-full !pl-9 pr-3 h-[38px] md:h-[40px] outline-none transition-all duration-300 rounded-xl text-xs border-gold box-border';

  const sharedInputClass = `${inputBaseClass} bg-[#F8F9FA] border border-gray-200 
  focus:bg-white focus:border-gold focus:ring-4 focus:ring-[#F3E5AB]/20 text-slate-600 
  placeholder:text-gray-400`;

  const selectClass = `${sharedInputClass} appearance-none cursor-pointer`;

  return (
    <div
      className={`w-full ${isMinimal ? '' : 'bg-white p-2 mb-6 rounded-2xl shadow-sm border border-slate-50'}`}
    >
      {/* BOTÃO DE FILTROS - SÓ APARECE NO MOBILE QUANDO RECOLHIDO */}
      <div className="md:hidden flex items-center justify-between w-full">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-4 h-[38px] rounded-xl border transition-all text-xs font-medium ${
            isExpanded
              ? 'bg-gold text-white border-gold'
              : 'bg-white text-slate-600 border-gray-200'
          }`}
        >
          <SlidersHorizontal size={16} />
          {isExpanded ? 'Fechar Filtros' : 'Filtrar Galerias'}
        </button>

        {/* Indicador de filtros ativos no mobile */}
        {!isExpanded &&
          (filterName ||
            filterLocation ||
            filterDate ||
            filterCategory ||
            filterType) && (
            <button
              onClick={resetFilters}
              className="text-[10px] text-red-500 font-bold underline px-2"
            >
              Limpar
            </button>
          )}
      </div>

      {/* CONTAINER DOS FILTROS */}
      <div
        className={`
        ${isExpanded ? 'grid grid-cols-2 mt-3 opacity-100' : 'hidden md:flex opacity-0 md:opacity-100'} 
        gap-2 md:flex md:flex-row md:items-center transition-all duration-300
      `}
      >
        <div className="flex items-center gap-2.5 px-2">
          <Filter className="text-[#D4AF37] w-3 h-3 md:w-5 md:h-5" />
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">
            Filtros
          </span>
        </div>
        {/* Input Nome - No mobile ocupa as 2 colunas do grid */}
        <div className="relative col-span-2 md:flex-1 md:min-w-[150px] group">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 z-10"
          />
          <input
            placeholder="Buscar por título/cliente..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className={sharedInputClass}
          />
        </div>

        {/* Select Categoria */}
        <div className="relative group md:w-36">
          <Tag
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 z-10 pointer-events-none"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={selectClass}
          >
            <option value="">Categorias</option>
            {GALLERY_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label} {cat.icon}
              </option>
            ))}
          </select>
        </div>

        {/* Select Tipo */}
        <div className="relative group md:w-36">
          <Briefcase
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 z-10 pointer-events-none"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={selectClass}
          >
            <option value="">Tipos</option>
            <option value="true">Contrato 🤝</option>
            <option value="false">Cobertura 📸</option>
          </select>
        </div>

        {/* Localização */}
        <div className="relative group md:w-36">
          <MapPin
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 z-10"
          />
          <input
            placeholder="Localização"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className={sharedInputClass}
          />
        </div>

        {/* Data */}
        <div className="relative group md:w-40">
          <Calendar
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 z-10 pointer-events-none"
          />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className={sharedInputClass}
          />
        </div>

        {/* Botão Limpar */}
        {(filterName ||
          filterLocation ||
          filterDate ||
          filterCategory ||
          filterType) && (
          <button
            onClick={resetFilters}
            className="col-span-2 md:w-9 md:h-9 text-red-500 bg-red-50 md:bg-transparent md:text-slate-400 hover:text-red-500 rounded-lg transition-all flex items-center justify-center gap-2 text-xs shrink-0"
          >
            <X size={18} strokeWidth={2.5} />
            <span className="md:hidden font-medium">Limpar Filtros</span>
          </button>
        )}
      </div>
    </div>
  );
}
