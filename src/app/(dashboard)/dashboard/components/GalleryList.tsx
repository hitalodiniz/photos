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
  onOpenTags: (g: Galeria) => void;
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
  onOpenTags,
  updatingId: loadingId,
}: GalleryListProps) {
  if (galerias.length === 0) {
    return (
      /* 🎯 Empty State: Centralizado e limpo */
      <div className="flex flex-col items-center justify-center py-24 text-center rounded-luxury animate-in fade-in duration-500 mt-2">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-gold/20 shadow-sm">
          <Inbox className="text-gold/40" size={28} />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-petroleum mb-2">
          Nenhuma galeria por aqui
        </h3>
        <p className="text-[11px] text-editorial-gray max-w-[240px] font-medium leading-relaxed">
          O seu acervo está vazio ou os filtros aplicados não encontraram
          resultados.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full mt-2">
      <div
        className={
          viewMode === 'grid'
            ? /* 🎯 Grid Padronizado: Mantém largura fixa por coluna para não esticar cards sozinhos */
              'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 auto-rows-max'
            : 'space-y-3'
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
            onOpenTags={() => onOpenTags(g)}
          />
        ))}
      </div>
    </div>
  );
}
