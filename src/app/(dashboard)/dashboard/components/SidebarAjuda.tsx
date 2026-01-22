import { HelpCircle } from 'lucide-react';
import Link from 'next/link';

interface SidebarAjudaProps {
  isSidebarCollapsed: boolean;
}

export default function SidebarAjuda({ isSidebarCollapsed }: SidebarAjudaProps) {
  return (
    <div className={`border-t border-white/5 ${isSidebarCollapsed ? 'px-0' : 'px-2'}`}>
      <Link
        href="/dashboard/ajuda"
        className={`flex items-center transition-all duration-300 group relative interactive-luxury ${isSidebarCollapsed ? 'justify-center py-4' : 'gap-3 py-4 rounded-luxury hover:bg-white/5'}`}
      >
        <div className="text-white/40 group-hover:text-gold transition-colors ml-1">
          <HelpCircle size={20} strokeWidth={2} />
        </div>
        {!isSidebarCollapsed && (
          <div className="flex flex-col items-start leading-none">
            <span className="text-[9px] font-semibold uppercase tracking-luxury text-white/40 mb-1">
              Ajuda
            </span>
            <span className="text-[11px] font-semibold text-white/90">Perguntas Frequentes</span>
          </div>
        )}
        {isSidebarCollapsed && (
          <div className="absolute left-full ml-4 px-3 py-2 bg-slate-950 text-white text-[10px] font-semibold uppercase rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-xl border border-white/10 whitespace-nowrap">
            Ajuda
          </div>
        )}
      </Link>
    </div>
  );
}
