import { HardDrive } from 'lucide-react';

interface SidebarStorageProps {
  isSidebarCollapsed: boolean;
  galeriasCount: number;
}

export default function SidebarStorage({
  isSidebarCollapsed,
  galeriasCount,
}: SidebarStorageProps) {
  return (
    <div
      className={`pt-4 border-t border-white/5 transition-all duration-500 ${isSidebarCollapsed ? 'px-0' : 'px-2'}`}
    >
      {!isSidebarCollapsed ? (
        <div className="space-y-3">
          <div className="flex justify-between items-end px-1">
            <span className="text-editorial-label text-white/90 flex items-center gap-2">
              <HardDrive size={12} strokeWidth={2} /> Armazenamento
            </span>
            <span className="text-[10px] font-semibold tracking-luxury text-white/90">
              {galeriasCount} / 50
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div
              className={`h-full transition-all duration-1000 ease-out rounded-full ${
                galeriasCount > 45
                  ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                  : 'bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]'
              }`}
              style={{ width: `${(galeriasCount / 50) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-white/80 uppercase tracking-luxury font-semibold px-1">
            Limite de galerias no plano
          </p>
        </div>
      ) : (
        <div className="flex justify-center group relative cursor-help py-2">
          <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[9px] font-semibold text-white/90 hover:text-gold hover:border-gold transition-colors">
            {galeriasCount}
          </div>
          <div className="absolute left-full ml-4 px-3 py-2 bg-slate-950 text-white text-[10px] font-semibold uppercase rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-2xl border border-white/10 whitespace-nowrap">
            {galeriasCount} de 50 galerias
          </div>
        </div>
      )}
    </div>
  );
}
