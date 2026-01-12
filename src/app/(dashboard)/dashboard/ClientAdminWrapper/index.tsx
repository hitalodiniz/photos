'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  ChevronDown,
  Inbox,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getGalerias,
  moveToTrash,
  restoreGaleria,
  toggleArchiveGaleria,
  deleteGalleryPermanently,
} from '@/core/services/galeria.service';

import type { Galeria } from '@/core/types/galeria';
import CreateGaleriaForm from './CreateGaleriaForm';
import EditGaleriaModal from './EditGaleriaModal';
import Filters from './Filters';
import { ConfirmationModal, Toast } from '@/components/ui';
import GaleriaCard from './GaleriaCard';
import { updateSidebarPreference } from '@/core/services/profile.service';

const CARDS_PER_PAGE = 6;

function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function ClientAdminWrapper({
  initialGalerias,
  initialProfile,
}: {
  initialGalerias: Galeria[];
  initialProfile?: { sidebar_collapsed: boolean };
}) {
  const [galerias, setGalerias] = useState<Galeria[]>(initialGalerias);
  const [currentView, setCurrentView] = useState<
    'active' | 'archived' | 'trash'
  >('active');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    initialProfile?.sidebar_collapsed ?? false,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [galeriaToEdit, setGaleriaToEdit] = useState<Galeria | null>(null);

  // Estados de filtros e UI
  const [cardsToShow, setCardsToShow] = useState(CARDS_PER_PAGE);
  const [filterName, setFilterName] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');

  // Unificação dos estados de Toast
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [galeriaToPermanentlyDelete, setGaleriaToPermanentlyDelete] =
    useState<Galeria | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = isCreateOpen ? 'hidden' : 'unset';
  }, [isCreateOpen]);

  const counts = useMemo(
    () => ({
      active: galerias.filter((g) => !g.is_archived && !g.is_deleted).length,
      archived: galerias.filter((g) => g.is_archived && !g.is_deleted).length,
      trash: galerias.filter((g) => g.is_deleted).length,
    }),
    [galerias],
  );

  // Função centralizada para lidar com atualizações (Edição)
  const handleUpdate = (success: boolean, dataOrError: any) => {
    if (success && typeof dataOrError === 'object') {
      setGalerias((prev) =>
        prev.map((g) => (g.id === dataOrError.id ? dataOrError : g)),
      );
      setToast({ message: 'Galeria atualizada com sucesso!', type: 'success' });
      setGaleriaToEdit(null);
    } else {
      setToast({
        message:
          typeof dataOrError === 'string' ? dataOrError : 'Erro na operação',
        type: 'error',
      });
    }
  };

  const handleCreateResult = async (ok: boolean, message: string) => {
    setToast({ message, type: ok ? 'success' : 'error' });
    if (ok) {
      setIsCreateOpen(false);
      const result = await getGalerias();
      if (result.success) setGalerias(result.data);
    }
  };

  const handleArchiveToggle = async (g: Galeria) => {
    const newStatus = !g.is_archived;
    setUpdatingId(g.id);
    const result = await toggleArchiveGaleria(g.id, g.is_archived);

    if (result.success) {
      setGalerias((prev) =>
        prev.map((item) =>
          item.id === g.id ? { ...item, is_archived: newStatus } : item,
        ),
      );
      setToast({
        message: newStatus ? 'Galeria arquivada' : 'Galeria restaurada',
        type: 'success',
      });
    } else {
      setToast({ message: 'Erro ao processar arquivamento', type: 'error' });
    }
    setUpdatingId(null);
  };

  const handleRestore = async (id: string) => {
    setUpdatingId(id);
    const result = await restoreGaleria(id);
    if (result.success) {
      setGalerias((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, is_deleted: false, is_archived: false } : g,
        ),
      );
      setToast({ message: 'Galeria restaurada para Ativas', type: 'success' });
    } else {
      setToast({ message: 'Erro ao restaurar galeria', type: 'error' });
    }
    setUpdatingId(null);
  };

  const handleMoveToTrash = async (g: Galeria) => {
    setUpdatingId(g.id);
    const result = await moveToTrash(g.id);
    if (result.success) {
      setGalerias((prev) =>
        prev.map((item) =>
          item.id === g.id ? { ...item, is_deleted: true } : item,
        ),
      );
      setToast({ message: 'Galeria movida para a lixeira', type: 'success' });
    } else {
      setToast({ message: 'Erro ao excluir galeria', type: 'error' });
    }
    setUpdatingId(null);
  };

  const executePermanentDelete = async () => {
    if (!galeriaToPermanentlyDelete) return;
    try {
      await deleteGalleryPermanently(galeriaToPermanentlyDelete.id);
      setGalerias((prev) =>
        prev.filter((g) => g.id !== galeriaToPermanentlyDelete.id),
      );
      setToast({
        message: 'Galeria removida definitivamente!',
        type: 'success',
      });
    } catch (error) {
      setToast({ message: 'Erro na exclusão permanente.', type: 'error' });
    } finally {
      setGaleriaToPermanentlyDelete(null);
    }
  };

  const toggleSidebar = async () => {
    const newValue = !isSidebarCollapsed;
    setIsSidebarCollapsed(newValue);
    await updateSidebarPreference(newValue);
  };

  const filteredGalerias = useMemo(() => {
    if (!Array.isArray(galerias)) return [];
    const nameLower = normalizeString(filterName);
    const locationLower = normalizeString(filterLocation);

    return galerias.filter((g) => {
      const isArchived = Boolean(g.is_archived);
      const isDeleted = Boolean(g.is_deleted);

      if (currentView === 'active' && (isArchived || isDeleted)) return false;
      if (currentView === 'archived' && (!isArchived || isDeleted))
        return false;
      if (currentView === 'trash' && !isDeleted) return false;

      const titleNorm = normalizeString(g.title || '');
      const clientNorm = normalizeString(g.client_name || '');
      const locationNorm = normalizeString(g.location || '');

      const matchesSearch =
        !nameLower ||
        titleNorm.includes(nameLower) ||
        clientNorm.includes(nameLower);
      const matchesLocation =
        !locationLower || locationNorm.includes(locationLower);
      const matchesCategory = !filterCategory || g.category === filterCategory;
      const matchesType =
        !filterType || String(g.has_contracting_client) === filterType;

      return matchesSearch && matchesLocation && matchesCategory && matchesType;
    });
  }, [
    galerias,
    currentView,
    filterName,
    filterLocation,
    filterCategory,
    filterType,
  ]);

  const visibleGalerias = useMemo(
    () => filteredGalerias.slice(0, cardsToShow),
    [filteredGalerias, cardsToShow],
  );

  return (
    <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 bg-[#F8F9FA] min-h-screen">
      <aside
        className={`hidden lg:block space-y-6 transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'w-[70px]' : 'w-[200px]'}`}
      >
        <button
          onClick={() => setIsCreateOpen(true)}
          className={`flex items-center bg-white hover:shadow-md transition-all rounded-2xl border border-gray-100 group shadow-sm overflow-hidden ${isSidebarCollapsed ? 'w-[56px] h-[56px] justify-center mx-auto' : 'px-6 py-4 gap-4 w-full'}`}
        >
          <Plus
            size={24}
            className="text-[#D4AF37] group-hover:rotate-90 transition-transform shrink-0"
          />
          {!isSidebarCollapsed && (
            <span className="text-xs font-black uppercase tracking-widest text-slate-700">
              Nova galeria
            </span>
          )}
        </button>

        <nav className="space-y-2 relative">
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-[-10px] bg-white border border-gray-200 rounded-full p-1 shadow-md hover:bg-gray-50 z-10 text-slate-400"
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>

          {[
            {
              id: 'active',
              label: 'Ativas',
              icon: Inbox,
              count: counts.active,
            },
            {
              id: 'archived',
              label: 'Arquivadas',
              icon: Archive,
              count: counts.archived,
            },
            {
              id: 'trash',
              label: 'Lixeira',
              icon: Trash2,
              count: counts.trash,
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as any);
                setCardsToShow(CARDS_PER_PAGE);
              }}
              className={`w-full flex items-center transition-all duration-300 group relative ${isSidebarCollapsed ? 'justify-center py-4' : 'justify-between px-4 py-3.5 rounded-r-2xl'} ${currentView === item.id ? 'bg-[#FFF9F0] text-slate-900 border-l-4 border-[#D4AF37]' : 'text-slate-500 hover:bg-gray-50 border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  size={20}
                  className={
                    currentView === item.id
                      ? 'text-[#D4AF37]'
                      : 'text-slate-400'
                  }
                />
                {!isSidebarCollapsed && (
                  <span className="uppercase text-[10px] font-bold tracking-widest">
                    {item.label}
                  </span>
                )}
              </div>
              {!isSidebarCollapsed && item.count > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentView === item.id ? 'bg-[#D4AF37] text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 space-y-4 min-w-0">
        <header className="bg-white rounded-[24px] border border-gray-200 p-2 shadow-sm">
          <Filters
            {...{
              filterName,
              filterLocation,
              filterDate,
              filterCategory,
              filterType,
              setFilterName,
              setFilterLocation,
              setFilterDate,
              setFilterCategory,
              setFilterType,
            }}
            resetFilters={() => {
              setFilterName('');
              setFilterLocation('');
              setFilterCategory('');
              setFilterType('');
              setFilterDate('');
            }}
            variant="minimal"
          />
        </header>

        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-6 min-h-[600px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleGalerias.map((g) => (
              <GaleriaCard
                key={g.id}
                galeria={g}
                currentView={currentView}
                onEdit={setGaleriaToEdit}
                onDelete={handleMoveToTrash}
                onArchive={handleArchiveToggle}
                onRestore={handleRestore}
                onPermanentDelete={() => setGaleriaToPermanentlyDelete(g)}
                isUpdating={updatingId === g.id}
              />
            ))}
          </div>

          {visibleGalerias.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in-95">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-[#F3E5AB]">
                <Inbox className="text-[#D4AF37] opacity-40" size={32} />
              </div>
              <h3 className="text-xl font-serif italic text-slate-800 mb-2">
                Nenhuma galeria por aqui
              </h3>
              <p className="text-sm text-slate-500 max-w-xs mb-8">
                Não encontramos resultados para sua busca ou a pasta está vazia.
              </p>
              {currentView === 'active' && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="btn-primary !w-auto px-8"
                >
                  Nova Galeria
                </button>
              )}
            </div>
          )}

          {filteredGalerias.length > cardsToShow && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => setCardsToShow((prev) => prev + CARDS_PER_PAGE)}
                className="btn-primary !w-auto px-10 flex items-center gap-2 shadow-lg hover:shadow-gold/20 transition-all active:scale-95"
              >
                <ChevronDown size={18} strokeWidth={2.5} />
                <span className="uppercase tracking-widest font-black text-[11px]">
                  Carregar mais galerias
                </span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* MODAIS */}
      {isCreateOpen && (
        <CreateGaleriaForm
          onSuccess={handleCreateResult}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      <EditGaleriaModal
        galeria={galeriaToEdit}
        isOpen={!!galeriaToEdit}
        onClose={() => setGaleriaToEdit(null)}
        onSuccess={handleUpdate} // Vinculado à função que atualiza o estado e exibe o toast
      />

      <ConfirmationModal
        isOpen={!!galeriaToPermanentlyDelete}
        onClose={() => setGaleriaToPermanentlyDelete(null)}
        onConfirm={executePermanentDelete}
        title="Excluir permanentemente"
        message={`Deseja remover "${galeriaToPermanentlyDelete?.title}" permanentemente? Esta ação é irreversível.`}
      />

      {/* COMPONENTE TOAST COM SUPORTE A LINKS DO DRIVE */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
