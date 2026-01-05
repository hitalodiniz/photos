'use client';

import { X, Search, MapPin, Calendar, Tag, Briefcase } from 'lucide-react';
import { GALLERY_CATEGORIES } from '@/constants/categories';

export default function Filters({
  filterName,
  filterLocation,
  filterDate,
  filterCategory, // Novo prop
  filterType, // Novo prop (Modelo de Negócio)
  setFilterName,
  setFilterLocation,
  setFilterDate,
  setFilterCategory, // Novo prop
  setFilterType, // Novo prop
  resetFilters,
  variant = 'minimal',
}) {
  const isMinimal = variant === 'minimal';

  const inputBaseClass =
    'w-full !pl-10 pr-4 py-3 outline-none transition-all duration-300 rounded-xl text-sm border-gold';
  const sharedInputClass = `${inputBaseClass} bg-[#F8F9FA] border border-gray-200 
  focus:bg-white focus:border-gold focus:ring-4 focus:ring-[#F3E5AB]/30 text-slate-600 
  placeholder:text-gray-300`;

  // Estilo específico para os Selects para remover a seta padrão do navegador
  const selectClass = `${sharedInputClass} appearance-none cursor-pointer`;

  return (
    <div
      className={`flex flex-wrap md:flex-nowrap gap-3 items-center w-full ${
        isMinimal
          ? 'bg-transparent'
          : 'bg-white p-3 mb-6 rounded-2xl shadow-sm border border-slate-50'
      }`}
    >
      {/* Input Nome/Título */}
      <div className="relative flex-[1.5] min-w-[180px] group">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors z-10"
        />
        <input
          placeholder="Cliente ou Título..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className={sharedInputClass}
        />
      </div>

      {/* Select Categoria */}
      <div
        className={`relative flex-1 min-w-[150px] group ${isMinimal ? 'md:border-l border-slate-100' : ''}`}
      >
        <Tag
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 
        group-focus-within:text-[#D4AF37] transition-colors z-10 pointer-events-none"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={selectClass}
        >
          <option value="">Todas Categorias</option>
          {GALLERY_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Select Modelo de Negócio */}
      <div
        className={`relative flex-1 min-w-[150px] group ${isMinimal ? 'md:border-l border-slate-100' : ''}`}
      >
        <Briefcase
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors z-10 pointer-events-none"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={selectClass}
        >
          <option value="">Todos Tipos</option>
          <option value="true">🤝 Contrato</option>
          <option value="false">💰 Venda Direta</option>
        </select>
      </div>

      {/* Input Local */}
      <div
        className={`relative flex-1 min-w-[140px] group ${isMinimal ? 'md:border-l border-slate-100' : ''}`}
      >
        <MapPin
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors z-10"
        />
        <input
          placeholder="Localização..."
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className={sharedInputClass}
        />
      </div>

      {/* Input Data */}
      <div
        className={`relative min-w-[140px] group ${isMinimal ? 'md:border-l border-slate-100' : ''}`}
      >
        <Calendar
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors z-10 pointer-events-none"
        />
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className={`${sharedInputClass} cursor-pointer`}
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
          className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300 flex items-center justify-center shrink-0"
          title="Limpar filtros"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
