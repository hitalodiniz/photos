'use client';
import { Inbox, Archive, Trash2, Loader2 } from 'lucide-react';
import type { ViewType } from '../hooks/useDashboardFilters';

interface BulkActionsBarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isAllSelected: boolean;
  currentView: ViewType;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
  onBulkRestore: () => void;
  isUpdating: boolean;
}

export default function BulkActionsBar({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  isAllSelected,
  currentView,
  onBulkArchive,
  onBulkDelete,
  onBulkRestore,
  isUpdating,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <>
      {/* 🎯 BLOQUEIO GLOBAL DE TELA (Referência: DownloadCenterModal) */}
      {isUpdating && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-petroleum/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md px-8">
            <div className="flex justify-between items-end mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-luxury text-gold animate-pulse">
                  Executando operação em lote
                </span>
                <span className="text-[8px] text-white/90 uppercase font-semibold tracking-luxury">
                  Não feche ou atualize esta tela
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="text-gold animate-spin" />
                <span className="text-xl font-semibold text-white leading-none">
                  {/* Como operações de lote git/db costumam ser rápidas, 
                        usamos um estado de "processando" visual */}
                  <span className="text-sm text-gold">Aguarde...</span>
                </span>
              </div>
            </div>

            {/* Barra de Progresso Estilo Central de Download */}
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gold transition-all duration-700 shadow-[0_0_15px_rgba(212,175,55,0.6)] animate-pulse"
                style={{ width: '100%' }} // Barra cheia pulsando enquanto processa
              />
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE AÇÕES */}
      <div
        className={`flex items-center justify-between px-4 py-2 mb-2 border-b border-white/10 bg-petroleum/90 backdrop-blur-xl rounded-luxury shadow-2xl transition-opacity ${isUpdating ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white/90">
            {selectedCount} selecionada(s)
          </span>
          <button
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
            className="text-editorial-label text-white/80 hover:text-gold transition-colors underline"
          >
            {isAllSelected ? 'Desselecionar todas' : 'Selecionar todas'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {currentView === 'trash' ? (
            <button
              onClick={onBulkRestore}
              disabled={isUpdating}
              className="px-3 py-1.5 text-editorial-label bg-white/10 text-white rounded-luxury hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-1.5 border border-white/10"
            >
              <Inbox size={14} />
              Restaurar
            </button>
          ) : (
            <>
              <button
                onClick={onBulkArchive}
                disabled={isUpdating}
                className="px-3 py-1.5 text-editorial-label bg-gold text-black rounded-luxury hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Archive size={14} />
                {currentView === 'archived' ? 'Desarquivar' : 'Arquivar'}
              </button>

              {currentView !== 'archived' && (
                <button
                  onClick={onBulkDelete}
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-editorial-label bg-red-600 text-white rounded-luxury hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-red-900/20"
                >
                  <Trash2 size={14} />
                  Mover para Lixeira
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
