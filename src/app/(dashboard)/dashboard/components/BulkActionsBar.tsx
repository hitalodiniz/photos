'use client';
import { useEffect } from 'react';
import { Inbox, Archive, Trash2, Loader2, X } from 'lucide-react'; // Adicionado o X
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
  setIsBulkMode: (val: boolean) => void; // Adicione esta prop para controlar a saída
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
  setIsBulkMode,
}: BulkActionsBarProps) {
  useEffect(() => {
    onDeselectAll();
  }, [currentView]);

  return (
    <>
      {/* BLOQUEIO GLOBAL DE TELA */}
      {isUpdating && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-petroleum/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md px-8">
            <div className="flex justify-between items-end mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-luxury text-gold animate-pulse">
                  Executando operação em lote
                </span>
                <span className="text-[8px] text-white/90 uppercase font-semibold tracking-luxury">
                  Processando dados. Não feche esta tela.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="text-gold animate-spin" />
                <span className="text-xl font-semibold text-white leading-none">
                  <span className="text-sm text-gold">Aguarde...</span>
                </span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gold transition-all duration-700 shadow-[0_0_20px_rgba(212,175,55,0.6)] animate-pulse"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE AÇÕES */}
      <div
        className={`flex items-center justify-between px-4 py-2 mb-2 border-b border-white/10 bg-petroleum/90 backdrop-blur-xl rounded-luxury shadow-2xl transition-all duration-300 ${isUpdating ? 'opacity-30 grayscale pointer-events-none' : 'opacity-100'}`}
      >
        <div className="flex items-center gap-4">
          {/* 🎯 BOTÃO PARA SAIR DO MODO SELEÇÃO */}
          <button
            onClick={() => {
              onDeselectAll();
              setIsBulkMode(false);
            }}
            className="p-1.5 rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all border border-white/10"
            title="Sair do modo seleção"
          >
            <X size={14} />
          </button>

          <div className="flex items-center gap-3 border-l border-white/10 pl-4">
            <span className="text-sm font-semibold text-white/90">
              {selectedCount} selecionada(s):
            </span>
            <button
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              className="text-sm text-white/80 hover:text-gold transition-colors underline"
            >
              {isAllSelected ? 'Deselecionar todas' : 'Selecionar todas'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentView === 'trash' ? (
            <button
              onClick={onBulkRestore}
              disabled={isUpdating}
              className="px-3 py-1.5 text-editorial-label bg-white/10 text-white rounded-sm hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-1.5 border border-white/10"
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

              <button
                onClick={onBulkDelete}
                disabled={isUpdating}
                className="px-3 py-1.5 text-editorial-label bg-red-600 text-white rounded-luxury hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-red-900/20"
              >
                <Trash2 size={14} />
                Mover para Lixeira
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
