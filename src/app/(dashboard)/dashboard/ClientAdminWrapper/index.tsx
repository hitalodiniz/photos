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
// IMPORT UNIFICADO
import GalleryFormModal from './GalleryModal';
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

  // Controle de Modal Unificado
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [galeriaToEdit, setGaleriaToEdit] = useState<Galeria | null>(null);

  const [cardsToShow, setCardsToShow] = useState(CARDS_PER_PAGE);
  const [filterName, setFilterName] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [galeriaToPermanentlyDelete, setGaleriaToPermanentlyDelete] =
    useState<Galeria | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow =
      isFormOpen || !!galeriaToEdit ? 'hidden' : 'unset';
  }, [isFormOpen, galeriaToEdit]);

  const counts = useMemo(
    () => ({
      active: galerias.filter((g) => !g.is_archived && !g.is_deleted).length,
      archived: galerias.filter((g) => g.is_archived && !g.is_deleted).length,
      trash: galerias.filter((g) => g.is_deleted).length,
    }),
    [galerias],
  );

  // FUNÇÃO DE SUCESSO UNIFICADA (Lida com Create e Update)
  const handleFormSuccess = async (success: boolean, data: any) => {
    if (success) {
      if (galeriaToEdit) {
        // Modo Edição: Atualiza o item na lista local
        setGalerias((prev) => prev.map((g) => (g.id === data.id ? data : g)));
        setToast({
          message: 'Galeria atualizada com sucesso!',
          type: 'success',
        });
      } else {
        // Modo Criação: Recarrega a lista para pegar a nova galeria (e o slug gerado no server)
        const result = await getGalerias();
        if (result.success) setGalerias(result.data);
        setToast({ message: 'Galeria criada com sucesso!', type: 'success' });
      }
    } else {
      setToast({ message: data || 'Erro na operação', type: 'error' });
    }
  };

  // --- MÉTODOS DE AÇÃO (Move, Archive, Delete) MANTIDOS ---
  // ... (handleArchiveToggle, handleRestore, handleMoveToTrash, executePermanentDelete permanecem iguais)

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
          onClick={() => setIsFormOpen(true)}
          className={`flex items-center bg-white hover:shadow-md transition-all rounded-2xl border border-gray-100 group shadow-sm overflow-hidden ${isSidebarCollapsed ? 'w-[56px] h-[56px] justify-center mx-auto' : 'px-6 py-4 gap-4 w-full'}`}
        >
          <Plus
            size={24}
            className="text-[#D4AF37] group-hover:rotate-90 transition-transform shrink-0"
          />
          {!isSidebarCollapsed && (
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-700">
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
                  <span className="uppercase text-[10px] font-semibold tracking-widest">
                    {item.label}
                  </span>
                )}
              </div>
              {!isSidebarCollapsed && item.count > 0 && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${currentView === item.id ? 'bg-[#D4AF37] text-white' : 'bg-slate-100 text-slate-400'}`}
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
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-[#F3E5AB]">
                <Inbox className="text-[#D4AF37] opacity-40" size={32} />
              </div>
              <h3 className="text-xl italic text-slate-800 mb-2">
                Nenhuma galeria por aqui
              </h3>
              <p className="text-sm text-slate-500 max-w-xs mb-8">
                Não encontramos resultados para sua busca.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* MODAL MASTER UNIFICADO */}
      <GalleryFormModal
        isOpen={isFormOpen || !!galeriaToEdit}
        galeria={galeriaToEdit}
        onClose={() => {
          setIsFormOpen(false);
          setGaleriaToEdit(null);
        }}
        onSuccess={handleFormSuccess}
      />

      <ConfirmationModal
        isOpen={!!galeriaToPermanentlyDelete}
        onClose={() => setGaleriaToPermanentlyDelete(null)}
        onConfirm={executePermanentDelete}
        title="Excluir permanentemente"
        message={`Deseja remover "${galeriaToPermanentlyDelete?.title}" permanentemente?`}
      />

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
