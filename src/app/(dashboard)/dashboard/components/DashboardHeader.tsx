'use client';

import { useEffect } from 'react';
import { X, CheckSquare, Grid3x3, List } from 'lucide-react';
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
  toggleSidebar?: () => void;
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
}: DashboardHeaderProps) {
  // 🎯 CORREÇÃO: Resetar modo lote ao mudar de aba com trava de segurança
  useEffect(() => {
    // Só dispara se o estado atual permitir limpeza, evitando o loop infinito
    if (isBulkMode || selectedCount > 0) {
      setIsBulkMode(false);
      onDeselectAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]); // Dependemos apenas da troca de visão

  return (
    <header className="bg-petroleum rounded-luxury border-b border-white/10 shadow-lg">
      <div className="flex items-center gap-2 px-2 py-1">
        {isBulkMode && (
          <button
            onClick={() => {
              setIsBulkMode(false);
              onDeselectAll();
            }}
            className="p-1.5 text-white/60 hover:text-gold hover:bg-white/5 rounded-luxury transition-colors shrink-0"
            title="Sair do modo seleção"
          >
            <X size={16} />
          </button>
        )}
        {!isBulkMode && (
          <button
            onClick={() => setIsBulkMode(true)}
            className="p-1.5 text-white/60 hover:text-gold hover:bg-white/5 rounded-luxury transition-colors shrink-0"
            title="Selecionar múltiplas galerias"
          >
            <CheckSquare size={16} />
          </button>
        )}

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

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-all ${
              viewMode === 'grid'
                ? 'text-champagne'
                : 'text-white/60 hover:text-white/80'
            }`}
            title="Grid"
          >
            <Grid3x3 size={16} strokeWidth={2} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition-all ${
              viewMode === 'list'
                ? 'text-champagne'
                : 'text-white/60 hover:text-white/80'
            }`}
            title="Lista"
          >
            <List size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
