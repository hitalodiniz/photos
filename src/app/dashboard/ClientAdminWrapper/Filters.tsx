"use client";

import { X, Search, MapPin, Calendar } from "lucide-react";

export default function Filters({
  filterName,
  filterLocation,
  filterDate,
  setFilterName,
  setFilterLocation,
  setFilterDate,
  resetFilters,
  variant = "minimal"
}) {
  const isMinimal = variant === "minimal";

  // Base de estilo para manter a consistência editorial e o recuo correto para o ícone
const inputBaseClass = "w-full !pl-12 pr-4 py-3 outline-none transition-all duration-300 rounded-xl text-sm border-[#D4AF37]";  
  const sharedInputClass = isMinimal 
    ? `${inputBaseClass} bg-[#F8F9FA] border border-gray-200 focus:bg-white focus:border-[#D4AF37] focus:ring-4 focus:ring-[#F3E5AB]/30 text-slate-600 placeholder:text-gray-300`
    : `${inputBaseClass} bg-[#F8F9FA] border border-gray-200 focus:bg-white focus:border-[#D4AF37] focus:ring-4 focus:ring-[#F3E5AB]/30 text-slate-600 placeholder:text-gray-300`;

  return (
    <div className={`flex flex-wrap md:flex-nowrap gap-3 items-center w-full ${isMinimal ? 
    'bg-transparent' : 'bg-white p-3 mb-6 rounded-2xl shadow-sm border border-slate-50'}`}>
      
      {/* Input Nome/Título */}
      <div className="relative flex-[2] min-w-[200px] group">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors z-10" />
        <input
          placeholder="Pesquisar por cliente..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className={`${sharedInputClass} !pl-12`} 
        />
      </div>

      {/* Input Local */}
      <div className={`relative flex-1 min-w-[160px] group ${isMinimal ? 'md:border-l border-slate-100' : ''}`}>
        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors z-10" />
        <input
          placeholder="Localização..."
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className={`${sharedInputClass} !pl-12`} 
        />
      </div>

      {/* Input Data */}
      <div className={`relative min-w-[160px] group ${isMinimal ? 'md:border-l border-slate-100' : ''}`}>
        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors z-10 pointer-events-none" />
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className={`${sharedInputClass} !pl-12 cursor-pointer`}
        />
      </div>

      {/* Botão Limpar */}
      {(filterName || filterLocation || filterDate) && (
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