import Link from 'next/link';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Lock,
  SegmentIcon,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react';
import type { ViewType } from '../hooks/useDashboardFilters';
import type { Profile } from '@/core/types/profile';
import VersionInfo from '@/components/dashboard/VersionInfo';
import SidebarGalerias from './SidebarGalerias';
import SidebarStorage from './SidebarStorage';
import SidebarGoogleDrive from './SidebarGoogleDrive';
import SidebarAjuda from './SidebarAjuda';
import { useSidebar } from '@/components/providers/SidebarProvider';
import { usePlan } from '@/core/context/PlanContext';
import { useState } from 'react';
import UpgradeModal from '@/components/ui/UpgradeModal';
import { UpgradeSheet } from '@/components/ui/Upgradesheet';
import { useSegment } from '@/hooks/useSegment';

interface SidebarProps {
  counts: { active: number; archived: number; trash: number };
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  setCardsToShow: (count: number) => void;
  galeriasCount: number;
  photographer: Profile | null;
  handleGoogleLogin: (force: boolean) => void;
  handleNovaGaleria: () => void;
  isRedirecting: boolean;
  totalPhotosUsed: number;
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
  totalPhotosUsed,
}: SidebarProps) {
  const { SegmentIcon } = useSegment();
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const { permissions, canAddMore, planKey } = usePlan(); // 🛡️ Permissões
  const [upsellFeature, setUpsellFeature] = useState<string | null>(null);
  const [upgradeSheetOpen, setUpgradeSheetOpen] = useState(false);
  // 🛡️ Validação: cota de galerias e cota de fotos (pool)
  const canCreateByGalleries = canAddMore('maxGalleries', galeriasCount);
  const remainingPhotoCredits = Math.max(
    0,
    permissions.photoCredits - totalPhotosUsed,
  );
  const canCreateByPhotos = remainingPhotoCredits > 0;
  const canCreateMore = canCreateByGalleries && canCreateByPhotos;
  const isNovaGaleriaDisabled = isRedirecting || !canCreateMore;
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
            <SegmentIcon className="text-champagne w-6 h-6" strokeWidth={1.5} />
            <span className=" text-lg font-bold tracking-luxury-tight text-white italic">
              Espaço das <span className="text-champagne">Galerias</span>
            </span>
          </div>
        )}

        {/* Botão Nova Galeria */}
        <div className="px-3 pt-3">
          <button
            onClick={() => {
              if (isNovaGaleriaDisabled) return;
              if (canCreateMore) {
                handleNovaGaleria();
                if (isMobile) toggleSidebar();
              } else {
                setUpsellFeature('Limite de Galerias');
              }
            }}
            disabled={isNovaGaleriaDisabled}
            className={`flex items-center justify-center transition-all duration-300 rounded-luxury border h-12 w-36 gap-2 group shadow-lg
      ${
        !canCreateMore
          ? 'bg-champagne/80 border-champagne/20 text-black/80 cursor-not-allowed hover:border-champagne/20'
          : 'bg-champagne text-black border-champagne hover:bg-white cursor-pointer'
      }
      ${isNovaGaleriaDisabled ? 'opacity-70' : ''}`}
            title={
              !canCreateByPhotos
                ? 'Sem cota de fotos. Faça upgrade para criar galerias.'
                : !canCreateByGalleries
                  ? `Limite de ${permissions.maxGalleries} galerias atingido. Faça upgrade.`
                  : 'Criar nova galeria'
            }
          >
            <div className="relative flex items-center justify-center">
              {/* Ícone principal Plus com opacidade condicional */}
              <Plus
                size={20}
                className={`transition-all ${
                  isRedirecting ? 'animate-spin' : 'group-hover:rotate-90'
                } ${!canCreateMore ? 'opacity-0' : ''}`}
              />

              {/* Cadeado posicionado como badge flutuante quando bloqueado */}
              {!canCreateMore && !isRedirecting && (
                <Lock
                  size={12}
                  className="absolute top-1 text-black animate-in zoom-in duration-300"
                />
              )}
            </div>

            {(!isSidebarCollapsed || isMobile) && (
              <span className="text-editorial-label font-semibold">
                {isRedirecting ? 'Iniciando...' : 'Nova Galeria'}
              </span>
            )}
          </button>
        </div>

        {/* Navegação Principal */}
        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar p-2">
          {/* Badge do Plano Atual */}
          {(!isSidebarCollapsed || isMobile) && (
            <div className="px-2 py-1 mb-2">
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-luxury bg-white/5 border border-white/5">
                <Link
                  href="/dashboard/assinatura"
                  className="flex items-center gap-2 min-w-0 hover:opacity-90 transition-opacity"
                  title="Ver assinatura"
                >
                  <span className="text-[9px] font-bold uppercase tracking-luxury-widest text-white/90 shrink-0">
                    Plano
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-luxury-widest text-champagne truncate">
                    {planKey}
                  </span>
                </Link>
                {planKey !== 'PREMIUM' && (
                  <button
                    type="button"
                    onClick={() => setUpgradeSheetOpen(true)}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-champagne/20 border border-champagne/30 text-champagne hover:bg-champagne/30 text-[9px] font-semibold uppercase tracking-widest transition-colors"
                    title="Fazer upgrade de plano"
                  >
                    <TrendingUp size={10} />
                    Migrar
                  </button>
                )}
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
            totalPhotosUsed={totalPhotosUsed} // vem do hook/query que você já tem
          />

          <SidebarGoogleDrive
            isSidebarCollapsed={isSidebarCollapsed}
            photographer={photographer}
            handleGoogleLogin={handleGoogleLogin}
            usedPhotoCredits={totalPhotosUsed}
            activeGalleryCount={galeriasCount}
          />

          <SidebarAjuda isSidebarCollapsed={isSidebarCollapsed} />
        </nav>

        {/* Rodapé: Versão e Toggle */}
        <div className="p-4 border-t border-white/5 space-y-4">
          <VersionInfo
            isCollapsed={isSidebarCollapsed}
            showFullDetails={photographer?.roles?.includes('admin')}
          />

          <button
            onClick={toggleSidebar}
            className="!px-1 !py-1 flex absolute -right-3 top-20 bg-champagne border border-white/10 rounded-full p-1 shadow-xl hover:bg-slate-700 z-10 text-petroleum/70 hover:text-champagne transition-colors"
            title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>
      </aside>

      {/* Modal de Upgrade disparado pelo Sidebar */}
      <UpgradeModal
        isOpen={!!upsellFeature}
        onClose={() => setUpsellFeature(null)}
        featureName="Galerias Ativas"
        featureKey="maxGalleries"
        scenarioType="limit"
      />

      <UpgradeSheet
        isOpen={upgradeSheetOpen}
        onClose={() => setUpgradeSheetOpen(false)}
        initialPlanKey={planKey}
      />
    </>
  );
}
