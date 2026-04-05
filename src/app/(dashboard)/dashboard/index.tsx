'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import type { Galeria } from '@/core/types/galeria';
import type { DashboardProps } from './types';

import { ConfirmationModal, LoadingScreen, Toast } from '@/components/ui';

import { authService, useAuth } from '@photos/core-auth';
import GoogleConsentAlert from '@/components/auth/GoogleConsentAlert';

// Hooks
import { useDashboardFilters } from './hooks/useDashboardFilters';
import { useDashboardActions } from './hooks/useDashboardActions';
import { useDashboardState } from './hooks/useDashboardState';
import { useNavigation } from '@/components/providers/NavigationProvider';
import { useSidebar } from '@/components/providers/SidebarProvider';

// Components
import Sidebar from './components/Sidebar';
import BulkActionsBar from './components/BulkActionsBar';
import DashboardHeader from './components/DashboardHeader';
import Filters from './Filters';
import GalleryList from './components/GalleryList';
import DashboardFooter from './components/DashboardFooter';
import { PlanProvider } from '@/core/context/PlanContext';
import { useSyncInternalTraffic } from '@/hooks/useSyncInternalTraffic';
import { GaleriaSyncObserver } from '@/features/galeria/GaleriaSyncObserver';
import {
  MAX_PHOTOS_PER_GALLERY_BY_PLAN,
  PERMISSIONS_BY_PLAN,
  type PlanKey,
} from '@/core/config/plans';
import { LimitUpgradeModal } from '@/components/ui/LimitUpgradeModal';
import type { DashboardPlanLimits } from './hooks/useDashboardActions';

export default function Dashboard({
  initialGalerias,
  initialProfile,
  latestPendingRequest,
  scheduledCancellation,
  impersonateUserId,
}: DashboardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { navigate, isNavigating } = useNavigation();

  const [galerias, setGalerias] = useState<Galeria[]>(initialGalerias);

  // Somente galerias ativas (não deletadas) contam para a cota de arquivos.
  const totalPhotosUsed = useMemo(
    () =>
      galerias
        .filter((g) => !g.is_deleted)
        .filter((g) => !g.is_archived)
        .filter((g) => !g.auto_archived)
        .reduce((sum, g) => sum + (g.photo_count || 0), 0),
    [galerias],
  );

  const {
    toast,
    setToast,
    showConsentAlert,
    setShowConsentAlert,
    viewMode,
    setViewMode,
  } = useDashboardState(initialProfile?.sidebar_collapsed ?? false);

  const { toggleSidebar, setIsSidebarCollapsed } = useSidebar();

  useEffect(() => {
    if (initialProfile?.sidebar_collapsed !== undefined) {
      setIsSidebarCollapsed(initialProfile.sidebar_collapsed);
    }
  }, [initialProfile?.sidebar_collapsed, setIsSidebarCollapsed]);

  const filters = useDashboardFilters(galerias);
  const planKey = (initialProfile?.plan_key as PlanKey) || 'FREE';
  const planLimits: DashboardPlanLimits | null =
    initialProfile && planKey in MAX_PHOTOS_PER_GALLERY_BY_PLAN
      ? {
          maxPhotosPerGallery:
            MAX_PHOTOS_PER_GALLERY_BY_PLAN[planKey as PlanKey],
          photoCredits:
            PERMISSIONS_BY_PLAN[planKey as PlanKey]?.photoCredits ?? 450,
        }
      : null;
  const actions = useDashboardActions(
    galerias,
    setGalerias,
    initialProfile,
    setToast,
    filters.currentView,
    planLimits,
    impersonateUserId,
  );

  const handleOpenOrganizer = (galeria: Galeria) => {
    navigate(
      `/dashboard/galerias/${galeria.id}/tags`,
      'Abrindo organizador...',
    );
  };

  useSyncInternalTraffic(initialProfile?.id);

  useEffect(() => {
    // Só redireciona para / se não houver user E o servidor não enviou perfil (evita race: servidor tem sessão, cliente ainda não)
    if (authLoading) return;
    if (user) return;
    if (initialProfile) return; // servidor já autenticou
    window.location.href = '/';
  }, [user, authLoading, initialProfile]);

  useEffect(() => {
    const needsConsent = searchParams.get('needsConsent') === 'true';
    if (needsConsent && (user || initialProfile)) {
      setShowConsentAlert(true);
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, user, initialProfile, router, setShowConsentAlert]);

  const handleConsentConfirm = async () => {
    try {
      await authService.signInWithGoogle(true);
    } catch (error) {
      console.error('Erro ao iniciar login com consent:', error);
      setToast({ message: 'Erro ao conectar com Google', type: 'error' });
    }
  };

  const handleNovaGaleria = () => {
    navigate('/dashboard/galerias/new', 'Preparando sua nova galeria...');
  };

  const handleEdit = (g: Galeria) => {
    navigate(`/dashboard/galerias/${g.id}/edit`, 'Abrindo galeria...');
  };

  const handleGaleriaSynced = (galeriaId: string, photoCount: number) => {
    setGalerias((prev) =>
      prev.map((g) =>
        g.id === galeriaId ? { ...g, photo_count: photoCount } : g,
      ),
    );
  };

  // --- RENDERING ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-petroleum dark:text-champagne animate-spin" />
          <div className="absolute inset-0 blur-xl bg-petroleum/10 dark:bg-champagne-dark/20 opacity-20 animate-pulse"></div>
        </div>
        <LoadingScreen message="Validando seu acesso" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <PlanProvider profile={initialProfile}>
      <GaleriaSyncObserver
        userId={impersonateUserId ?? initialProfile?.id ?? ''}
        onSynced={handleGaleriaSynced}
      />
      <div className="mx-auto flex flex-col lg:flex-row max-w-[1600px] gap-4 px-2 bg-luxury-bg min-h-screen pb-24 lg:pb-6">
        <Sidebar
          counts={filters.counts}
          currentView={filters.currentView}
          setCurrentView={filters.setCurrentView}
          setCardsToShow={filters.setCardsToShow}
          galeriasCount={filters.counts.active}
          photographer={initialProfile}
          profile={initialProfile}
          handleGoogleLogin={actions.handleGoogleLogin}
          handleNovaGaleria={handleNovaGaleria}
          isRedirecting={isNavigating}
          totalPhotosUsed={totalPhotosUsed}
          latestPendingRequest={latestPendingRequest ?? null}
          scheduledCancellation={scheduledCancellation ?? null}
        />
        <main className="flex-1 flex flex-col min-w-0 min-h-[calc(100vh-120px)]">
          {(actions.isBulkMode || actions.selectedIds.size > 0) && (
            <BulkActionsBar
              selectedCount={actions.selectedIds.size}
              onSelectAll={() =>
                actions.handleSelectAll(
                  filters.visibleGalerias.map((g) => g.id),
                )
              }
              onDeselectAll={actions.handleDeselectAll}
              isAllSelected={
                actions.selectedIds.size === filters.visibleGalerias.length &&
                filters.visibleGalerias.length > 0
              }
              currentView={filters.currentView}
              onBulkArchive={actions.handleBulkArchive}
              onBulkDelete={actions.handleBulkDelete}
              onBulkPermanentDelete={actions.handleBulkPermanentDelete}
              onBulkRestore={actions.handleBulkRestore}
              isUpdating={actions.updatingId === 'bulk'}
              setIsBulkMode={actions.setIsBulkMode}
            />
          )}

          <DashboardHeader
            isBulkMode={actions.isBulkMode}
            setIsBulkMode={actions.setIsBulkMode}
            selectedCount={actions.selectedIds.size}
            onDeselectAll={actions.handleDeselectAll}
            filterName={filters.filterName}
            setFilterName={filters.setFilterName}
            filterLocation={filters.filterLocation}
            setFilterLocation={filters.setFilterLocation}
            filterCategory={filters.filterCategory}
            setFilterCategory={filters.setFilterCategory}
            filterType={filters.filterType}
            setFilterType={filters.setFilterType}
            filterDateStart={filters.filterDateStart}
            setFilterDateStart={filters.setFilterDateStart}
            filterDateEnd={filters.filterDateEnd}
            setFilterDateEnd={filters.setFilterDateEnd}
            resetFilters={filters.resetFilters}
            viewMode={viewMode}
            setViewMode={setViewMode}
            toggleSidebar={toggleSidebar}
            currentView={filters.currentView}
          />

          <div className="md:hidden">
            <Filters
              filterName={filters.filterName}
              filterLocation={filters.filterLocation}
              filterCategory={filters.filterCategory}
              filterType={filters.filterType}
              filterDateStart={filters.filterDateStart}
              filterDateEnd={filters.filterDateEnd}
              setFilterName={filters.setFilterName}
              setFilterLocation={filters.setFilterLocation}
              setFilterDateStart={filters.setFilterDateStart}
              setFilterDateEnd={filters.setFilterDateEnd}
              setFilterCategory={filters.setFilterCategory}
              setFilterType={filters.setFilterType}
              resetFilters={filters.resetFilters}
              variant="full"
              isMobileInstance={true}
            />
          </div>
          <div className="flex-1">
            <GalleryList
              galerias={filters.visibleGalerias}
              viewMode={viewMode}
              currentView={filters.currentView}
              onEdit={handleEdit}
              onDelete={actions.handleMoveToTrash}
              onArchive={actions.handleArchiveToggle}
              onToggleShowOnProfile={actions.handleToggleProfile}
              onRestore={actions.handleRestore}
              onPermanentDelete={(g) =>
                actions.setGaleriaToPermanentlyDelete(g)
              }
              updatingId={actions.updatingId}
              onSync={actions.handleSyncDrive}
              isBulkMode={actions.isBulkMode}
              selectedIds={actions.selectedIds}
              onToggleSelect={actions.handleToggleSelect}
              onOpenTags={handleOpenOrganizer}
            />
          </div>

          <DashboardFooter
            visibleCount={filters.visibleGalerias.length}
            totalCount={filters.filteredGalerias.length}
            onLoadMore={filters.loadMore}
            showLoadMore={filters.filteredGalerias.length > filters.cardsToShow}
          />
        </main>

        <ConfirmationModal
          isOpen={!!actions.galeriaToPermanentlyDelete}
          onClose={() => actions.setGaleriaToPermanentlyDelete(null)}
          onConfirm={actions.executePermanentDelete}
          title="Excluir permanentemente"
          message={`Deseja remover "${actions.galeriaToPermanentlyDelete?.title}" permanentemente?`}
        />

        <LimitUpgradeModal
          isOpen={!!actions.limitModalAfterSync}
          onClose={() => actions.setLimitModalAfterSync(null)}
          planLimit={actions.limitModalAfterSync?.planLimit ?? 0}
          photoCount={actions.limitModalAfterSync?.photoCount ?? 0}
        />

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <GoogleConsentAlert
          isOpen={showConsentAlert}
          onClose={() => setShowConsentAlert(false)}
          onConfirm={handleConsentConfirm}
        />
      </div>
    </PlanProvider>
  );
}
