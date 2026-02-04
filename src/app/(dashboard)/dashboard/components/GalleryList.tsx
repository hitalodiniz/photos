import { Inbox } from 'lucide-react';
import type { Galeria } from '@/core/types/galeria';
import type { ViewType } from '../hooks/useDashboardFilters';
import GaleriaCard from '../GaleriaCard';

interface GalleryListProps {
  galerias: Galeria[];
  viewMode: 'grid' | 'list';
  currentView: ViewType;
  onEdit: (g: Galeria) => void;
  onDelete: (g: Galeria) => void;
  onArchive: (g: Galeria) => void;
  onToggleShowOnProfile: (g: Galeria) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (g: Galeria) => void;
  updatingId: string | null;
  onSync: (g: Galeria) => void;
  isBulkMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export default function GalleryList({
  galerias,
  viewMode,
  currentView,
  onEdit,
  onDelete,
  onArchive,
  onToggleShowOnProfile,
  onRestore,
  onPermanentDelete,
  updatingId,
  onSync,
  isBulkMode,
  selectedIds,
  onToggleSelect,
}: GalleryListProps) {
  if (galerias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-luxury border border-slate-200 shadow-sm p-4 min-h-[500px]">
        <div className="w-20 h-20 bg-slate-50 rounded-luxury flex items-center justify-center mb-6 border border-champagne">
          <Inbox className="text-gold opacity-40" size={32} />
        </div>
        <h3 className="text-xl italic text-editorial-ink mb-2">
          Nenhuma galeria por aqui
        </h3>
        <p className="text-sm text-editorial-gray max-w-xs mb-8">
          Não encontramos resultados para sua busca.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-luxury border border-slate-200 shadow-sm p-4 min-h-[500px]">
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-2'
        }
      >
        {galerias.map((g, index) => (
          <GaleriaCard
            key={g.id}
            galeria={g}
            index={index}
            currentView={currentView}
            viewMode={viewMode}
            onEdit={onEdit}
            onDelete={onDelete}
            onArchive={onArchive}
            onToggleShowOnProfile={() => onToggleShowOnProfile(g)}
            onRestore={onRestore}
            onPermanentDelete={() => onPermanentDelete(g)}
            isUpdating={updatingId === g.id}
            onSync={() => onSync(g)}
            isBulkMode={isBulkMode}
            isSelected={selectedIds.has(g.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </div>
  );
}
