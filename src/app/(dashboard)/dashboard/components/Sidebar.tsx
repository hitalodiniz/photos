import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Camera,
  ArrowLeft,
} from 'lucide-react';
import type { ViewType } from '../hooks/useDashboardFilters';
import VersionInfo from '@/components/dashboard/VersionInfo';
import SidebarGalerias from './SidebarGalerias';
import SidebarStorage from './SidebarStorage';
import SidebarGoogleDrive from './SidebarGoogleDrive';
import SidebarAjuda from './SidebarAjuda';
import SidebarAdmin from './SidebarAdmin';
import { useSidebar } from '@/components/providers/SidebarProvider';

interface SidebarProps {
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
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <>
      {/* Overlay para Mobile */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[115] lg:hidden transition-all duration-500 ease-in-out"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed lg:relative left-0 top-0 bottom-0 z-[120] lg:z-[90] lg:rounded-luxury flex flex-col bg-petroleum border-r border-white/5 transition-all duration-500 ease-in-out 
          ${isSidebarCollapsed ? 'w-[70px] -translate-x-full lg:translate-x-0' : 'w-[280px] lg:w-[240px] translate-x-0'}
          shadow-2xl lg:shadow-none`}
      >
        {/* Header Mobile no Sidebar */}
        {!isSidebarCollapsed && (
          <div className="lg:hidden flex items-center gap-3 px-6 py-4 border-b border-white/5">
            <Camera className="text-gold w-6 h-6" strokeWidth={1.5} />
            <span className="font-artistic text-lg font-bold tracking-tight text-white italic">
              Espaço das <span className="text-gold">Galerias</span>
            </span>
          </div>
        )}

        {/* Botão Fechar (Mobile) */}
        {!isSidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="lg:hidden absolute top-4 -right-4 p-2 bg-gold text-black rounded-full shadow-xl z-[130]"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {/* Botão Nova Galeria */}
        <div className="px-3 pt-3">
          <button
            onClick={() => {
              handleNovaGaleria();
              if (isMobile) toggleSidebar();
            }}
            disabled={isRedirecting}
            className={`flex items-center justify-center bg-gold text-black hover:bg-white
              transition-all duration-300 rounded-luxury border border-gold group shadow-lg 
              h-12 w-full gap-2
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
            {(!isSidebarCollapsed || isMobile) && (
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

          <SidebarAjuda 
            isSidebarCollapsed={isSidebarCollapsed} 
          />

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
    </>
  );
}
