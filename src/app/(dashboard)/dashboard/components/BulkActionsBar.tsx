import { Loader2, Inbox, Archive, Trash2 } from 'lucide-react';
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
    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-petroleum/80 backdrop-blur-xl rounded-luxury shadow-2xl">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-white/90">{selectedCount} selecionada(s)</span>
        {!isAllSelected ? (
          <button
            onClick={onSelectAll}
            className="text-editorial-label text-white/60 hover:text-gold transition-colors underline"
          >
            Selecionar todas
          </button>
        ) : (
          <button
            onClick={onDeselectAll}
            className="text-editorial-label text-white/60 hover:text-gold transition-colors underline"
          >
            Desselecionar todas
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {currentView === 'trash' ? (
          <button
            onClick={onBulkRestore}
            disabled={isUpdating}
            className="px-3 py-1.5 text-editorial-label bg-white/10 text-white rounded-luxury hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-1.5 border border-white/10"
          >
            {isUpdating ? <div className="loading-luxury w-3 h-3" /> : <Inbox size={14} />}
            Restaurar
          </button>
        ) : (
          <>
            <button
              onClick={onBulkArchive}
              disabled={isUpdating}
              className="px-3 py-1.5 text-editorial-label bg-gold text-black rounded-luxury hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isUpdating ? <div className="loading-luxury w-3 h-3 border-black/30 border-t-black" /> : <Archive size={14} />}
              {currentView === 'archived' ? 'Desarquivar' : 'Arquivar'}
            </button>
            {currentView !== 'archived' && (
              <button
                onClick={onBulkDelete}
                disabled={isUpdating}
                className="px-3 py-1.5 text-editorial-label bg-red-600 text-white rounded-luxury hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-red-900/20"
              >
                {isUpdating ? <div className="loading-luxury w-3 h-3" /> : <Trash2 size={14} />}
                Mover para Lixeira
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
