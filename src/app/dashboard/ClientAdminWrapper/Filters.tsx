"use client";

import { X } from "lucide-react";

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

  // Estilo padronizado: Mesma cor, tamanho e peso do Header
  const sharedInputClass = isMinimal 
    ? "bg-transparent border-none focus:ring-0 text-[#4F5B66] text-base placeholder:text-[#4F5B66]/60 placeholder:not-italic" 
    : "bg-[#F8FAFD] border border-gray-200 rounded-lg px-3 py-1.5 text-base text-[#4F5B66]";

  return (
    <div className={`flex flex-wrap md:flex-nowrap gap-2 items-center w-full ${isMinimal ? 
    'bg-transparent' : 'bg-white p-2 mb-4 rounded-xl shadow-sm'}`}>
      
      {/* Input Nome/Título */}
      <input
        placeholder="Pesquisar por cliente/galeria..."
        value={filterName}
        onChange={(e) => setFilterName(e.target.value)}
        className={`flex-1 min-w-[150px] outline-none transition-all ${sharedInputClass}`}
      />

      {/* Input Local */}
      <div className={`flex items-center flex-1 min-w-[120px] ${isMinimal ? 'border-l border-[#D4AF37]/20 pl-4' : ''}`}>
        <input
          placeholder="Pesquisar por localização..."
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className={`w-full outline-none transition-all ${sharedInputClass}`}
        />
      </div>

      {/* Input Data */}
      <div className={`flex items-center ${isMinimal ? 'border-l border-[#D4AF37]/20 pl-4' : ''}`}>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className={`outline-none cursor-pointer transition-all  ${sharedInputClass}`}
        />
      </div>

      {/* Botão Limpar */}
      {(filterName || filterLocation || filterDate) && (
        <button
          onClick={resetFilters}
          className={`flex items-center justify-center transition-all ${
            isMinimal
            ? "p-2 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-full ml-2"
            : "px-4 py-1.5 bg-[#E9EEF6] rounded-full text-xs font-bold ml-auto"
          }`}
          title="Limpar filtros"
        >
          <X size={16} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}