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
import { button, div, main } from 'framer-motion/client';

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
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
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
      // 1. Filtros de visualização (Visão do Sistema)
      const isArchived = Boolean(g.is_archived);
      const isDeleted = Boolean(g.is_deleted);
      if (currentView === 'active' && (isArchived || isDeleted)) return false;
      if (currentView === 'archived' && (!isArchived || isDeleted))
        return false;
      if (currentView === 'trash' && !isDeleted) return false;

      // 2. Filtros Textuais
      const titleNorm = normalizeString(g.title || '');
      const clientNorm = normalizeString(g.client_name || '');
      const locationNorm = normalizeString(g.location || '');

      const matchesSearch =
        !nameLower ||
        titleNorm.includes(nameLower) ||
        clientNorm.includes(nameLower);

      const matchesLocation =
        !locationLower || locationNorm.includes(locationLower);

      // 3. Filtros de Categoria e Tipo
      const matchesCategory = !filterCategory || g.category === filterCategory;
      const matchesType =
        !filterType || String(g.has_contracting_client) === filterType;

      // 4. 🎯 LÓGICA DE DATA POR PERÍODO (Comparação Lexicográfica Segura)
      // Extraímos YYYY-MM-DD da data da galeria
      const galleryDateString = g.date ? g.date.split('T')[0] : '';

      const matchesDate =
        (!filterDateStart || galleryDateString >= filterDateStart) &&
        (!filterDateEnd || galleryDateString <= filterDateEnd);

      return (
        matchesSearch &&
        matchesLocation &&
        matchesCategory &&
        matchesType &&
        matchesDate
      );
    });
  }, [
    galerias,
    currentView,
    filterName,
    filterLocation,
    filterCategory,
    filterType,
    filterDateStart,
    filterDateEnd,
  ]);

  const visibleGalerias = useMemo(
    () => filteredGalerias.slice(0, cardsToShow),
    [filteredGalerias, cardsToShow],
  );

  return (
    <div className="mx-auto flex flex-col lg:flex-row max-w-[1600px] gap-4 px-4 py-2 bg-[#F8F9FA] min-h-screen pb-24 lg:pb-6">
      {/* SIDEBAR (Desktop) / BOTTOM NAV (Mobile) */}
      <aside
        className={`
          fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-6 py-3 lg:py-0 lg:px-0
          lg:relative lg:block lg:bg-transparent lg:border-0 lg:z-0
          transition-all duration-500 ease-in-out 
          ${isSidebarCollapsed ? 'lg:w-[60px]' : 'lg:w-[190px]'}
        `}
      >
        {/* Botão Nova Galeria - Refinado e Compacto */}
        <button
          onClick={() => setIsFormOpen(true)}
          className={`
    hidden lg:flex items-center bg-[#D4AF37] text-black 
    hover:bg-white hover:text-[#D4AF37] transition-all duration-300 
    rounded-[0.5rem] border border-[#D4AF37] group shadow-sm mb-6 overflow-hidden
    ${
      isSidebarCollapsed
        ? 'w-14 h-10 justify-center mx-auto'
        : 'h-10 px-4 gap-3 w-full'
    }
  `}
        >
          <Plus
            size={18} // Reduzido de 24 para 18
            className="group-hover:rotate-90 transition-transform shrink-0"
            strokeWidth={2.5} // Reduzido de 3 para 2.5 para mais leveza
          />
          {!isSidebarCollapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap">
              Nova Galeria
            </span>
          )}
        </button>

        <nav className="flex lg:flex-col justify-around lg:justify-start lg:space-y-1 relative">
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex absolute -right-3 top-[-10px] bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 z-10 text-slate-400"
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
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`
                flex flex-col lg:flex-row items-center transition-all duration-300 group relative
                ${isSidebarCollapsed ? 'lg:justify-center lg:py-4' : 'lg:justify-between lg:px-4 lg:py-3 lg:rounded-xl'} 
                ${
                  currentView === item.id
                    ? 'text-black bg-[#F3E5AB] shadow-sm'
                    : 'text-slate-400 hover:bg-white hover:text-slate-600'
                }
              `}
            >
              <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
                <item.icon
                  size={22}
                  className={
                    currentView === item.id
                      ? 'text-black'
                      : 'text-slate-400 group-hover:text-[#D4AF37]'
                  }
                />
                {/* 🎯 Texto condicional ajustado para mobile/desktop */}
                <span
                  className={`uppercase text-[9px] lg:text-[10px] font-bold tracking-widest block ${!isSidebarCollapsed ? 'lg:block' : 'lg:hidden'}`}
                >
                  {item.label}
                </span>
              </div>

              {!isSidebarCollapsed && item.count > 0 && (
                <span
                  className={`hidden lg:block text-[10px] font-bold px-2 py-0.5 rounded-full ${currentView === item.id ? 'bg-white/40 text-black' : 'bg-slate-100 text-slate-500'}`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 space-y-4 min-w-0">
        {/* Header de Filtros - Branco e Limpo */}
        <header className="bg-white rounded-[12px] border border-slate-200 p-1 shadow-sm">
          <Filters
            filterName={filterName}
            filterLocation={filterLocation}
            filterCategory={filterCategory}
            filterType={filterType}
            filterDateStart={filterDateStart}
            filterDateEnd={filterDateEnd}
            setFilterName={setFilterName}
            setFilterLocation={setFilterLocation}
            setFilterDateStart={setFilterDateStart}
            setFilterDateEnd={setFilterDateEnd}
            setFilterCategory={setFilterCategory}
            setFilterType={setFilterType}
            resetFilters={() => {
              setFilterName('');
              setFilterLocation('');
              setFilterCategory('');
              setFilterType('');
              setFilterDateStart('');
              setFilterDateEnd('');
            }}
            variant="minimal"
          />
        </header>

        <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-4 min-h-[500px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleGalerias.map((g, index) => (
              <GaleriaCard
                key={g.id}
                galeria={g}
                index={index} // Passamos o index para o efeito de cascata
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
              <div className="w-20 h-20 bg-slate-50 rounded-[10px] flex items-center justify-center mb-6 border border-[#F3E5AB]">
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

        {/* PAGINAÇÃO / EXPANDIR ACERVO */}

        <div className="mt-12 flex flex-col items-center justify-center space-y-6 pb-12">
          {/* Barra de Progresso Refinada */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-semibold text-slate-700 uppercase tracking-[0.3em]">
              {visibleGalerias.length} de {filteredGalerias.length} Galerias
            </div>
            <div className="w-40 h-[3px] bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D4AF37] transition-all duration-700 ease-out"
                style={{
                  width: `${(visibleGalerias.length / filteredGalerias.length) * 100}%`,
                }}
              />
            </div>
          </div>
          {filteredGalerias.length > cardsToShow && (
            <button
              onClick={() => setCardsToShow((prev) => prev + CARDS_PER_PAGE)}
              className="group mx-auto px-12 py-3.5 rounded-full bg-white text-black border border-slate-200 hover:border-[#D4AF37] hover:shadow-xl hover:shadow-[#D4AF37]/10 transition-all duration-300 uppercase text-[10px] font-bold tracking-[0.25em] active:scale-95 flex items-center gap-3"
            >
              <Plus
                size={14}
                strokeWidth={3}
                className="text-[#D4AF37] group-hover:rotate-90 transition-transform duration-300"
              />
              Expandir Acervo
            </button>
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
