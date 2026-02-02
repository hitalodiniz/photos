import { usePlan } from '@/core/context/PlanContext';
import { ArrowUpCircle, HardDrive } from 'lucide-react';

interface SidebarStorageProps {
  isSidebarCollapsed: boolean;
  galeriasCount: number;
}

export default function SidebarStorage({
  isSidebarCollapsed,
  galeriasCount,
}: SidebarStorageProps) {
  const { permissions } = usePlan();
  const maxGalleries = permissions.maxGalleries; // 🛡️ Limite dinâmico do plano
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const showFull = !isSidebarCollapsed || isMobile;

  // Lógica de cálculo de porcentagem
  const percentage = Math.min((galeriasCount / maxGalleries) * 100, 100);
  const isLimitReached = galeriasCount >= maxGalleries;
  const isNearLimit = percentage >= 90;

  return (
    <div
      className={`pt-4 border-t border-white/5 transition-all duration-500 ${isSidebarCollapsed && !isMobile ? 'px-0' : 'px-2'}`}
    >
      {showFull ? (
        <div className="space-y-3">
          <div className="flex justify-between items-end px-1">
            <span className="text-editorial-label text-white/90 flex items-center gap-2">
              <HardDrive size={12} strokeWidth={2} /> Armazenamento
            </span>
            <span className="text-[10px] font-semibold tracking-luxury text-white/90">
              {galeriasCount} / {maxGalleries}
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div
              className={`h-full transition-all duration-1000 ease-out rounded-full ${
                galeriasCount > 45
                  ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                  : 'bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          {/* Call to Action: Upgrade */}
          {isLimitReached ? (
            <button
              onClick={() => (window.location.href = '/dashboard/planos')}
              className="w-full mt-2 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 rounded-luxury flex items-center justify-between group transition-all animate-pulse-slow"
            >
              <span className="text-[9px] font-black text-red-400 uppercase tracking-luxury-widest">
                Limite Atingido
              </span>
              <ArrowUpCircle
                size={14}
                className="text-red-400 group-hover:translate-y-[-2px] transition-transform"
              />
            </button>
          ) : (
            <p className="text-[10px] text-white/40 uppercase tracking-luxury font-bold px-1">
              Galerias Ativas
            </p>
          )}
        </div>
      ) : (
        /* Versão Colapsada */
        <div className="flex justify-center group relative cursor-help py-2">
          <button
            onClick={() =>
              isLimitReached && (window.location.href = '/dashboard/planos')
            }
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-[9px] font-semibold transition-all ${
              isLimitReached
                ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                : 'border-white/10 text-white/90 hover:text-gold hover:border-gold'
            }`}
          >
            {isLimitReached ? <ArrowUpCircle size={14} /> : galeriasCount}
          </button>

          <div className="absolute left-full ml-4 px-3 py-2 bg-slate-950 text-white text-[10px] font-semibold uppercase rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-2xl border border-white/10 whitespace-nowrap">
            {isLimitReached
              ? 'Aumentar Limite agora'
              : `${galeriasCount} de ${maxGalleries} galerias`}
          </div>
        </div>
      )}
    </div>
  );
}
