import {
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ViewType } from '../hooks/useDashboardFilters';
import VersionInfo from '@/components/dashboard/VersionInfo';
import SidebarGalerias from './SidebarGalerias';
import SidebarStorage from './SidebarStorage';
import SidebarGoogleDrive from './SidebarGoogleDrive';
import SidebarAjuda from './SidebarAjuda';
import SidebarAdmin from './SidebarAdmin';

interface SidebarProps {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  counts: { active: number; archived: number; trash: number };
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  setCardsToShow: (count: number) => void;
  galeriasCount: number;
  photographer: {
    username: string;
    google_refresh_token?: string | null;
    roles?: string[];
  } | null;
  handleGoogleLogin: (force: boolean) => void;
  handleNovaGaleria: () => void;
  isRedirecting: boolean;
  onOpenAdminModal: () => void;
}

export default function Sidebar({
  isSidebarCollapsed,
  toggleSidebar,
  counts,
  currentView,
  setCurrentView,
  setCardsToShow,
  galeriasCount,
  photographer,
  handleGoogleLogin,
  handleNovaGaleria,
  isRedirecting,
  onOpenAdminModal,
}: SidebarProps) {
  return (
    <aside
      className={`fixed lg:relative left-0 top-0 bottom-0 z-[90] rounded-luxury flex flex-col bg-petroleum border-r border-white/5 transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'w-[70px]' : 'w-[240px]'} ${isSidebarCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}`}
    >
      {/* Botão Nova Galeria */}
      <div className="px-3 pt-3">
        <button
          onClick={handleNovaGaleria}
          disabled={isRedirecting}
          className={`flex items-center justify-center bg-gold text-black hover:bg-white
            transition-all duration-300 rounded-luxury border border-gold group shadow-lg 
            h-12 px-3 gap-2
            ${isRedirecting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <Plus
            size={20}
            className={
              isRedirecting
                ? 'animate-spin'
                : 'group-hover:rotate-90 transition-transform duration-300'
            }
          />
          {!isSidebarCollapsed && (
            <span className="text-editorial-label font-semibold">
              {isRedirecting ? 'Iniciando...' : 'Nova Galeria'}
            </span>
          )}
        </button>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar p-2">
        <SidebarGalerias
          isSidebarCollapsed={isSidebarCollapsed}
          counts={counts}
          currentView={currentView}
          setCurrentView={setCurrentView}
          setCardsToShow={setCardsToShow}
        />

        <SidebarStorage
          isSidebarCollapsed={isSidebarCollapsed}
          galeriasCount={galeriasCount}
        />

        <SidebarGoogleDrive
          isSidebarCollapsed={isSidebarCollapsed}
          photographer={photographer}
          handleGoogleLogin={handleGoogleLogin}
        />

        <SidebarAjuda isSidebarCollapsed={isSidebarCollapsed} />

        <SidebarAdmin
          isSidebarCollapsed={isSidebarCollapsed}
          photographer={photographer}
          onOpenAdminModal={onOpenAdminModal}
        />
      </nav>

      {/* Rodapé: Versão e Toggle */}
      <div className="p-4 border-t border-white/5 space-y-4">
        <VersionInfo
          isCollapsed={isSidebarCollapsed}
          showFullDetails={photographer?.roles?.includes('admin')}
        />
        
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex absolute -right-3 top-6 bg-slate-800 border border-white/10 rounded-full p-1 shadow-xl hover:bg-slate-700 z-10 text-white/40 hover:text-gold transition-colors"
          title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
