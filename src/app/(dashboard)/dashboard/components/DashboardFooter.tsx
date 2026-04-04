import { Plus, CheckCircle2 } from 'lucide-react';

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
  const remainingCount = totalCount - visibleCount;
  // ── Cálculo de Progresso com Proteção Contra Divisão por Zero ────────────────
  const progressPercent =
    totalCount > 0 ? Math.round((visibleCount / totalCount) * 100) : 0;
  const isComplete = visibleCount >= totalCount;

  return (
    <div className="w-full mt-4 mb-8">
      {/* 🎯 Barra de Progresso Compacta */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[9px] font-semibold text-petroleum/50 uppercase tracking-wider">
            Progresso
          </p>
          <p className="text-[9px] font-bold text-petroleum">
            {progressPercent}%
          </p>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-champagne transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 🎯 Card Compacto */}
      <div className="relative rounded-lg bg-petroleum px-4 py-4 shadow-lg border border-white/5">
        {isComplete ? (
          // ✅ Estado Completo (compacto)
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2
              size={16}
              className="text-green-400"
              strokeWidth={2.5}
            />
            <p className="text-white text-[11px] font-semibold uppercase tracking-wide">
              Exibindo todas as galerias
            </p>
            <span className="text-white text-[12px]">({totalCount})</span>
          </div>
        ) : (
          // 📊 Estado Carregando (compacto)
          <div className="flex items-center justify-between gap-3">
            {/* Contador Compacto */}
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-6 bg-champagne rounded-full" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/70">
                  Visualizando
                </p>
                <p className="text-white text-[15px] font-bold leading-none">
                  {visibleCount}
                  <span className="text-[11px] text-white font-normal ml-1">
                    / {totalCount}
                  </span>
                </p>
              </div>
            </div>

            {/* Botão Compacto */}
            {showLoadMore && remainingCount > 0 && (
              <button onClick={onLoadMore} className="btn-luxury-primary">
                <span className="flex items-center gap-1.5">
                  Exibir{' '}
                  <span className="text-[11px] font-semibold">
                    +{remainingCount}
                  </span>{' '}
                  galerias
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
