import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Lock,
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
import { usePlan } from '@/core/context/PlanContext';
import { useState } from 'react';
import UpgradeModal from '@/components/ui/UpgradeModal';

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

  const { permissions, canAddMore, planKey } = usePlan(); // 🛡️ Permissões
  const [upsellFeature, setUpsellFeature] = useState<string | null>(null);
  // 🛡️ Validação de Limite de Galerias
  const canCreateMore = canAddMore('maxGalleries', galeriasCount);
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
            <span className=" text-lg font-bold tracking-luxury-tight text-white italic">
              Espaço das <span className="text-gold">Galerias</span>
            </span>
          </div>
        )}

        {/* Botão Nova Galeria */}
        <div className="px-3 pt-3">
          <button
            onClick={() => {
              if (canCreateMore) {
                handleNovaGaleria();
                if (isMobile) toggleSidebar();
              } else {
                setUpsellFeature('Limite de Galerias');
              }
            }}
            disabled={isRedirecting}
            className={`flex items-center justify-center bg-gold text-black hover:bg-white
              transition-all duration-300 rounded-luxury border border-gold group shadow-lg 
              h-12 w-full gap-2
              ${
                !canCreateMore
                  ? 'bg-slate-800 border-white/10 text-white/90 cursor-pointer hover:border-gold'
                  : 'bg-gold text-black border-gold hover:bg-white'
              }
              ${isRedirecting ? 'opacity-70 cursor-not-allowed' : ''}`}
            title={
              !canCreateMore
                ? `Limite de ${permissions.maxGalleries} galerias atingido`
                : 'Criar nova galeria'
            }
          >
            {canCreateMore ? (
              <Plus
                size={20}
                className={
                  isRedirecting
                    ? 'animate-spin'
                    : 'group-hover:rotate-90 transition-transform'
                }
              />
            ) : (
              <Lock size={16} className="text-gold" />
            )}
            {(!isSidebarCollapsed || isMobile) && (
              <span className="text-editorial-label font-semibold">
                {isRedirecting
                  ? 'Iniciando...'
                  : canCreateMore
                    ? 'Nova Galeria'
                    : 'Upgrade Necessário'}{' '}
              </span>
            )}
          </button>
        </div>

        {/* Navegação Principal */}
        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar p-2">
          {/* Badge do Plano Atual */}
          {(!isSidebarCollapsed || isMobile) && (
            <div className="px-2 py-1 mb-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-luxury bg-white/5 border border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-luxury-widest text-white/90">
                  Plano
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-luxury-widest text-gold">
                  {planKey}
                </span>
              </div>
            </div>
          )}
          <SidebarGalerias
            isSidebarCollapsed={isSidebarCollapsed}
            counts={counts}
            currentView={currentView}
            setCurrentView={setCurrentView}
            setCardsToShow={setCardsToShow}
          />
          {/* O SidebarStorage já recebe galeriasCount e pode internamente comparar com permissions.maxGalleries */}
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
            className="!px-3 hidden lg:flex absolute -right-4 top-20 bg-champagne border border-white/10 rounded-full p-1 shadow-xl hover:bg-slate-700 z-10 text-petroleum/70 hover:text-gold transition-colors"
            title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>
        </div>
      </aside>

      {/* Modal de Upgrade disparado pelo Sidebar */}
      <UpgradeModal
        isOpen={!!upsellFeature}
        onClose={() => setUpsellFeature(null)}
        featureName={upsellFeature || ''}
      />
    </>
  );
}
