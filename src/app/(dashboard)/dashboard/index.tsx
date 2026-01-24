'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import type { Galeria } from '@/core/types/galeria';
import type { DashboardProps } from './types';

import { ConfirmationModal, Toast } from '@/components/ui';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useAuth } from '@photos/core-auth';
import AdminControlModal from '@/components/admin/AdminControlModal';
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
import GalleryList from './components/GalleryList';
import DashboardFooter from './components/DashboardFooter';

export default function Dashboard({
  initialGalerias,
  initialProfile,
}: DashboardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { navigate, isNavigating } = useNavigation();

  // --- STATE & CUSTOM HOOKS ---
  const [galerias, setGalerias] = useState<Galeria[]>(initialGalerias);
  
  const {
    isAdminModalOpen,
    setIsAdminModalOpen,
    toast,
    setToast,
    showConsentAlert,
    setShowConsentAlert,
    viewMode,
    setViewMode,
  } = useDashboardState(initialProfile?.sidebar_collapsed ?? false);

  const { isSidebarCollapsed, toggleSidebar, setIsSidebarCollapsed } = useSidebar();

  // Sincroniza a preferência inicial do usuário com o context
  useEffect(() => {
    if (initialProfile?.sidebar_collapsed !== undefined) {
      setIsSidebarCollapsed(initialProfile.sidebar_collapsed);
    }
  }, [initialProfile?.sidebar_collapsed, setIsSidebarCollapsed]);

  const filters = useDashboardFilters(galerias);
  const actions = useDashboardActions(
    galerias,
    setGalerias,
    initialProfile,
    setToast,
    filters.currentView
  );

  // --- EFFECTS ---
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/';
    }
  }, [user, authLoading]);

  useEffect(() => {
    const needsConsent = searchParams.get('needsConsent') === 'true';
    if (needsConsent && user) {
      setShowConsentAlert(true);
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, user, router, setShowConsentAlert]);

  // --- HANDLERS ---
  const handleConsentConfirm = async () => {
    try {
      setShowConsentAlert(false);
      await actions.handleGoogleLogin(true);
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

  // --- RENDERING ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-petroleum dark:text-[#D4AF37] animate-spin" />
          <div className="absolute inset-0 blur-xl bg-petroleum/10 dark:bg-champagne-dark/20 opacity-20 animate-pulse"></div>
        </div>
        <LoadingScreen message="Validando seu acesso" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto flex flex-col lg:flex-row max-w-[1600px] gap-4 px-2 bg-luxury-bg min-h-screen pb-24 lg:pb-6">
      <Sidebar
        counts={filters.counts}
        currentView={filters.currentView}
        setCurrentView={filters.setCurrentView}
        setCardsToShow={filters.setCardsToShow}
        galeriasCount={galerias.length}
        photographer={initialProfile}
        handleGoogleLogin={actions.handleGoogleLogin}
        handleNovaGaleria={handleNovaGaleria}
        isRedirecting={isNavigating}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
      />

      <main className="flex-1 space-y-2 min-w-0">
        <BulkActionsBar
          selectedCount={actions.selectedIds.size}
          onSelectAll={() => actions.handleSelectAll(filters.visibleGalerias.map((g) => g.id))}
          onDeselectAll={actions.handleDeselectAll}
          isAllSelected={actions.selectedIds.size === filters.visibleGalerias.length && filters.visibleGalerias.length > 0}
          currentView={filters.currentView}
          onBulkArchive={actions.handleBulkArchive}
          onBulkDelete={actions.handleBulkDelete}
          onBulkRestore={actions.handleBulkRestore}
          isUpdating={actions.updatingId === 'bulk'}
        />

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
        />

        <GalleryList
          galerias={filters.visibleGalerias}
          viewMode={viewMode}
          currentView={filters.currentView}
          onEdit={handleEdit}
          onDelete={actions.handleMoveToTrash}
          onArchive={actions.handleArchiveToggle}
          onToggleShowOnProfile={actions.handleToggleProfile}
          onRestore={actions.handleRestore}
          onPermanentDelete={(g) => actions.setGaleriaToPermanentlyDelete(g)}
          updatingId={actions.updatingId}
          onSync={actions.handleSyncDrive}
          isBulkMode={actions.isBulkMode}
          selectedIds={actions.selectedIds}
          onToggleSelect={actions.handleToggleSelect}
        />

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

      <AdminControlModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </div>
  );
}
