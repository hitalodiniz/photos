'use client';

import { useEffect } from 'react';
import { X, CheckSquare, Grid3x3, List, Menu } from 'lucide-react';
import Filters from '../Filters';
import type { ViewType } from '../hooks/useDashboardFilters';

interface DashboardHeaderProps {
  isBulkMode: boolean;
  setIsBulkMode: (val: boolean) => void;
  selectedCount: number;
  onDeselectAll: () => void;
  currentView: ViewType;
  filterName: string;
  setFilterName: (val: string) => void;
  filterLocation: string;
  setFilterLocation: (val: string) => void;
  filterCategory: string;
  setFilterCategory: (val: string) => void;
  filterType: string;
  setFilterType: (val: string) => void;
  filterDateStart: string;
  setFilterDateStart: (val: string) => void;
  filterDateEnd: string;
  setFilterDateEnd: (val: string) => void;
  resetFilters: () => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleSidebar?: () => void; // Adicionado para mobile
}

export default function DashboardHeader({
  isBulkMode,
  setIsBulkMode,
  selectedCount,
  onDeselectAll,
  currentView,
  filterName,
  setFilterName,
  filterLocation,
  setFilterLocation,
  filterCategory,
  setFilterCategory,
  filterType,
  setFilterType,
  filterDateStart,
  setFilterDateStart,
  filterDateEnd,
  setFilterDateEnd,
  resetFilters,
  viewMode,
  setViewMode,
  toggleSidebar,
}: DashboardHeaderProps) {
  useEffect(() => {
    if (isBulkMode || selectedCount > 0) {
      setIsBulkMode(false);
      onDeselectAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  return (
    <header className="bg-petroleum md:rounded-luxury border-b border-white/10 shadow-lg sticky top-0 z-30 hidden md:block">
      <div className="flex items-center gap-1 md:gap-2 px-2 py-1.5 md:py-1">
        {/* Botão Hambúrguer apenas Mobile (opcional, caso tenha sidebar) */}
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 text-white/60 hover:text-white"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Modo Lote - Oculto no mobile */}
        <div className="hidden md:flex items-center shrink-0">
          {isBulkMode ? (
            <button
              onClick={() => {
                setIsBulkMode(false);
                onDeselectAll();
              }}
              className="p-2 text-gold bg-white/5 rounded-lg transition-colors flex items-center gap-1"
            >
              <X size={18} />
              {selectedCount > 0 && (
                <span className="text-[10px] font-bold bg-gold text-petroleum px-1.5 rounded-full">
                  {selectedCount}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsBulkMode(true)}
              className="p-2 text-white/60 hover:text-gold hover:bg-white/5 rounded-lg transition-colors"
            >
              <CheckSquare size={18} />
            </button>
          )}
        </div>

        {/* Filtros - Ocupa o espaço central expandido no mobile */}
        <div className="flex-1 min-w-0">
          <Filters
            filterName={filterName}
            filterLocation={filterLocation}
            filterCategory={filterCategory}
            filterType={filterType}
            filterDateStart={filterDateStart}
            filterDateEnd={filterDateEnd}
            setFilterName={setFilterName}
            setFilterLocation={setFilterLocation}
            setFilterDateStart={setFilterDateStart}
            setFilterDateEnd={setFilterDateEnd}
            setFilterCategory={setFilterCategory}
            setFilterType={setFilterType}
            resetFilters={resetFilters}
            variant="minimal"
          />
        </div>

        {/* Seletor de View - Oculto em telas muito pequenas para evitar quebra */}
        <div className="hidden sm:flex items-center gap-1 shrink-0 ml-1 border-l border-white/5 pl-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-all ${
              viewMode === 'grid' ? 'text-champagne' : 'text-white/60'
            }`}
          >
            <Grid3x3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition-all ${
              viewMode === 'list' ? 'text-champagne' : 'text-white/60'
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
