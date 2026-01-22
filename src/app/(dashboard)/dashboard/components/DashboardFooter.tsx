import { Plus } from 'lucide-react';

interface DashboardFooterProps {
  visibleCount: number;
  totalCount: number;
  onLoadMore: () => void;
  showLoadMore: boolean;
}

export default function DashboardFooter({
  visibleCount,
  totalCount,
  onLoadMore,
  showLoadMore,
}: DashboardFooterProps) {
  return (
    <div className="bg-petroleum rounded-luxury py-6 px-4 mt-12">
      <div className="flex items-center justify-center gap-4">
        {/* Contador - Botão Secundário */}
        <div className="px-4 py-3.5 rounded-luxury bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-luxury text-white">
          EXIBINDO {visibleCount} DE {totalCount} GALERIAS
        </div>

        {/* Botão Principal - Expandir Acervo */}
        {showLoadMore && (
          <button
            onClick={onLoadMore}
            className="group px-6 py-3.5 rounded-luxury bg-champagne text-petroleum border border-champagne hover:bg-white transition-all duration-300 uppercase text-[10px] font-bold tracking-luxury shadow-lg active:scale-95 flex items-center gap-3 ml-4"
          >
            <Plus
              size={14}
              strokeWidth={2.5}
              className="text-petroleum group-hover:rotate-90 transition-transform duration-300 shrink-0"
            />
            EXPANDIR ACERVO
          </button>
        )}
      </div>
    </div>
  );
}
