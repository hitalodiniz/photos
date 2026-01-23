import { ShieldAlert } from 'lucide-react';

interface SidebarAdminProps {
  isSidebarCollapsed: boolean;
  photographer: {
    username: string;
    roles?: string[];
  } | null;
  onOpenAdminModal: () => void;
}

export default function SidebarAdmin({
  isSidebarCollapsed,
  photographer,
  onOpenAdminModal,
}: SidebarAdminProps) {
  if (!photographer?.roles?.includes('admin')) return null;

  return (
    <div className={`mt-auto border-t border-white/5 ${isSidebarCollapsed ? 'px-0' : 'px-2'}`}>
      {!isSidebarCollapsed && (
        <div className="mb-4 mt-6 px-1">
          <span className="text-editorial-label text-white/40">
            CONTA
          </span>
        </div>
      )}
      <div className="mt-4 lg:mt-0">
        <button
          onClick={onOpenAdminModal}
          className={`flex items-center transition-all duration-300 group relative w-full interactive-luxury ${isSidebarCollapsed ? 'justify-center py-4' : 'gap-3 py-4 rounded-luxury hover:bg-white/5'}`}
        >
          <div className="text-white/40 group-hover:text-gold transition-colors ml-1">
            <ShieldAlert size={20} strokeWidth={2} />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] font-semibold uppercase tracking-luxury text-white/40 mb-1 transition-colors">
                Admin Mode
              </span>
              <span className="text-[11px] font-semibold text-white/90 group-hover:text-white transition-colors">
                Cache & Tokens
              </span>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-petroleum text-white text-[10px] font-semibold uppercase rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-xl border border-white/10 whitespace-nowrap">
              Admin Panel
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
