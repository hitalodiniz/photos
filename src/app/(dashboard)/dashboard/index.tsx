'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Inbox,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  getGalerias,
  moveToTrash,
  restoreGaleria,
  toggleArchiveGaleria,
  deleteGalleryPermanently,
  toggleShowOnProfile,
} from '@/core/services/galeria.service';

import type { Galeria } from '@/core/types/galeria';
import GalleryFormModal from './GaleriaModal';
import Filters from './Filters';
import { ConfirmationModal, Toast } from '@/components/ui';
import GaleriaCard from './GaleriaCard';
import { updateSidebarPreference } from '@/core/services/profile.service';
import {
  revalidateGalleryCover,
  revalidateDrivePhotos,
  revalidateGallery,
  revalidateProfile,
} from '@/actions/revalidate.actions';
import { authService } from '@/core/services/auth.service';
import AdminControlModal from '@/components/admin/AdminControlModal';
import { supabase } from '@/lib/supabase.client';
import { g } from 'framer-motion/client';

const CARDS_PER_PAGE = 8;

function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function Dashboard({
  initialGalerias,
  initialProfile,
}: {
  initialGalerias: Galeria[];
  // 🎯 Atualizado: Tipagem agora reflete o objeto completo do perfil (photographer)
  initialProfile: any;
}) {
  const [galerias, setGalerias] = useState<Galeria[]>(initialGalerias);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<
    'active' | 'archived' | 'trash'
  >('active');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    initialProfile?.sidebar_collapsed ?? false,
  );

  // 🎯 Estado do fotógrafo para monitorar o token
  const photographer = initialProfile;

  // 🎯 Função de Login Condicional
  const handleGoogleLogin = async (force: boolean) => {
    try {
      await authService.signInWithGoogle(force);
    } catch (error) {
      setToast({ message: 'Erro ao conectar com Google', type: 'error' });
    }
  };

  // ... (Estados de Modal, Filtros e Toast mantidos iguais)
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

  // --- MÉTODOS DE AÇÃO ---
  const handleFormSuccess = async (success: boolean, data: any) => {
    if (success) {
      if (galeriaToEdit) {
        await revalidateGallery(
          data.drive_folder_id,
          data.slug,
          data.photographer_username || data.photographer?.username,
          data.photographer_username || data.photographer?.username,
        );
        setGalerias((prev) => prev.map((g) => (g.id === data.id ? data : g)));
        setToast({ message: 'Galeria atualizada!', type: 'success' });
      } else {
        const result = await getGalerias();
        if (result.success) setGalerias(result.data);
        setToast({ message: 'Galeria criada!', type: 'success' });
      }
    } else {
      setToast({ message: data || 'Erro na operação', type: 'error' });
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
      //REVALIDAÇÃO: Garante que a galeria suma/apareça no perfil público
      await revalidateProfile(photographer?.username);
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

      // 🎯 REVALIDAÇÃO: Faz a galeria voltar ao perfil público
      await revalidateProfile(photographer?.username);
      setToast({ message: 'Galeria restaurada!', type: 'success' });
    } else {
      setToast({ message: 'Erro ao restaurar', type: 'error' });
    }
    setUpdatingId(null);
  };

  const handleToggleProfile = async (g: Galeria) => {
    try {
      // 1. Chama o Service (Backend)
      const { success, error } = await toggleShowOnProfile(
        g.id,
        g.show_on_profile,
      );

      if (!success) throw new Error(error);

      // 2. Atualiza o Estado Local (Frontend)
      setGalerias((prev) =>
        prev.map((item) =>
          item.id === g.id
            ? { ...item, show_on_profile: !g.show_on_profile }
            : item,
        ),
      );

      // 3. 🎯 LIMPA O CACHE DO PERFIL (O pulo do gato)
      // Usamos o seu revalidator para limpar a página pública
      // Passamos o username do fotógrafo (que você já tem no profile/photographer)
      await revalidateProfile(photographer?.username);
      setToast({
        message: !g.show_on_profile
          ? 'Galeria agora aparece no seu perfil público!'
          : 'Galeria removida do perfil público.',
        type: 'success',
      });
    } catch (err: any) {
      setToast({
        message: err.message || 'Não foi possível alterar a visibilidade.',
        type: 'error',
      });
    } finally {
      setUpdatingId(null); // Finaliza loading
    }
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

      // 🎯 REVALIDAÇÃO: Remove do perfil público
      await revalidateProfile(photographer?.username);
      setToast({ message: 'Movido para lixeira', type: 'success' });
    } else {
      setToast({ message: 'Erro ao excluir', type: 'error' });
    }
    setUpdatingId(null);
  };

  const handleSyncDrive = async (galeria: Galeria) => {
    setUpdatingId(galeria.id);
    try {
      await revalidateDrivePhotos(galeria.drive_folder_id);
      await revalidateGallery(
        galeria.drive_folder_id,
        galeria.slug,
        galeria.photographer_username,
        galeria.photographer_username,
      );
      if (galeria.cover_image_url)
        await revalidateGalleryCover(galeria.cover_image_url);
      setToast({ message: 'Sincronização concluída!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Erro ao sincronizar.', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const executePermanentDelete = async () => {
    if (!galeriaToPermanentlyDelete) return;
    try {
      await deleteGalleryPermanently(galeriaToPermanentlyDelete.id);
      setGalerias((prev) =>
        prev.filter((g) => g.id !== galeriaToPermanentlyDelete.id),
      );
      setToast({ message: 'Removida definitivamente!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Erro na exclusão.', type: 'error' });
    } finally {
      setGaleriaToPermanentlyDelete(null);
    }
  };

  const toggleSidebar = async () => {
    const newValue = !isSidebarCollapsed;
    setIsSidebarCollapsed(newValue);
    await updateSidebarPreference(newValue);
  };

  // --- FILTROS ---
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
      {/* SIDEBAR */}
      <aside
        className={`fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 px-6 py-3 lg:py-0 lg:px-0 lg:relative lg:block lg:bg-transparent lg:border-0 transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'lg:w-[70px]' : 'lg:w-[210px]'}`}
      >
        {/* 1. Botão Nova Galeria */}
        <button
          onClick={() => setIsFormOpen(true)}
          className={`flex items-center justify-center bg-[#D4AF37] text-black hover:bg-slate-900 hover:text-white transition-all duration-300 rounded-xl border border-[#D4AF37] group shadow-lg lg:shadow-sm mb-6 overflow-hidden w-12 h-12 fixed bottom-6 right-6 z-[100] lg:relative lg:bottom-auto lg:right-auto lg:z-auto ${isSidebarCollapsed ? 'lg:w-12 lg:h-12 mx-auto' : 'lg:h-11 lg:px-4 lg:gap-3 lg:w-full'}`}
        >
          <Plus
            size={20}
            className="group-hover:rotate-90 transition-transform shrink-0"
            strokeWidth={2.5}
          />
          {!isSidebarCollapsed && (
            <span className="hidden lg:block text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap">
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

          {/* Itens de Navegação (Ativas, Arquivadas, Lixeira) */}
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
                setCardsToShow(8);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col lg:flex-row items-center transition-all duration-300 group relative ${isSidebarCollapsed ? 'lg:justify-center lg:py-4' : 'lg:justify-between lg:px-4 lg:py-3 lg:rounded-xl'} ${currentView === item.id ? 'text-black bg-[#F3E5AB] shadow-sm font-bold' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
            >
              <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
                <item.icon
                  size={20}
                  className={
                    currentView === item.id
                      ? 'text-black'
                      : 'text-slate-400 group-hover:text-[#D4AF37]'
                  }
                />
                <span
                  className={`uppercase text-[9px] lg:text-[10px] tracking-widest block ${!isSidebarCollapsed ? 'lg:block' : 'lg:hidden'}`}
                >
                  {item.label}
                </span>
              </div>
              {!isSidebarCollapsed && item.count > 0 && (
                <span
                  className={`hidden lg:block text-[10px] font-bold px-2 py-0.5 rounded-lg ${currentView === item.id ? 'bg-black/10 text-black' : 'bg-slate-100 text-slate-500'}`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}

          {/* 🎯 SEÇÃO 2: CONTADOR DE USO (Abaixo da Lixeira) */}
          {/* 🎯 SEÇÃO 2: ARMAZENAMENTO */}
          {/* 🎯 SEÇÃO 2: ARMAZENAMENTO / USO DO ACERVO */}
          <div
            className={`mt-8 pt-8 border-t border-slate-100 transition-all duration-500 ${isSidebarCollapsed ? 'px-0' : 'px-4'}`}
          >
            {!isSidebarCollapsed ? (
              <div className="space-y-5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Uso do Acervo
                  </span>
                  <span className="text-[13px] font-bold text-slate-900">
                    {galerias.length}{' '}
                    <span className="text-slate-400 font-medium">/ 50</span>
                  </span>
                </div>

                {/* Barra de Progresso elegante */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-out ${galerias.length > 45 ? 'bg-red-500' : 'bg-[#D4AF37]'}`}
                    style={{ width: `${(galerias.length / 50) * 100}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Você atingiu{' '}
                  <span className="text-slate-900 font-bold">
                    {Math.round((galerias.length / 50) * 100)}%
                  </span>{' '}
                  da capacidade do seu plano atual.
                </p>
              </div>
            ) : (
              <div className="flex justify-center group relative cursor-help py-2">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 transition-colors">
                  <span className="text-[11px] font-bold text-slate-700">
                    {galerias.length}
                  </span>
                </div>
                {/* Tooltip */}
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all whitespace-nowrap z-50">
                  {galerias.length} de 50 galerias
                </div>
              </div>
            )}
          </div>

          {/* 🎯 SEÇÃO 3: CLOUD STATUS (Google Drive) */}
          <div
            className={`mt-6 pt-6 border-t border-slate-100 transition-all duration-500 pb-10 ${isSidebarCollapsed ? 'px-0' : 'px-4'}`}
          >
            <div
              className={`flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'justify-center py-4' : 'gap-3 py-1'}`}
            >
              {/* Indicador de Status Dinâmico */}
              <div className="relative flex items-center justify-center shrink-0">
                {photographer?.google_refresh_token ? (
                  // ✅ Status: Conectado (Bolinha Verde Brilhante)
                  <div
                    className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    title="Drive Conectado"
                  />
                ) : (
                  // ❌ Status: Desconectado (Ícone de X Vermelho)
                  <div
                    className="flex items-center justify-center w-6 h-6 bg-red-50 rounded-full border border-red-100 text-red-500 shadow-sm"
                    title="Drive Desconectado"
                  >
                    <X size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              {!isSidebarCollapsed && (
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <div className="flex flex-col">
                    <span
                      className={`text-[11px] font-bold tracking-tight ${photographer?.google_refresh_token ? 'text-slate-700' : 'text-red-600'}`}
                    >
                      {photographer?.google_refresh_token
                        ? 'Google Drive'
                        : 'Conexão Perdida'}
                    </span>
                    {photographer?.google_refresh_token && (
                      <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">
                        Sincronizado
                      </span>
                    )}
                  </div>

                  {/* Botão só aparece se NÃO houver token */}
                  {!photographer?.google_refresh_token && (
                    <button
                      onClick={() => handleGoogleLogin(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-md animate-pulse ml-2"
                    >
                      <RefreshCw size={10} strokeWidth={3} />
                      Reconectar
                    </button>
                  )}
                </div>
              )}

              {isSidebarCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all whitespace-nowrap z-50 shadow-xl">
                  {photographer?.google_refresh_token
                    ? 'Cloud Conectado'
                    : 'Ação Necessária'}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-slate-900" />
                </div>
              )}
            </div>
          </div>

          {/* Admin Mode (Apenas para Hitalo) */}
          {photographer?.username === 'hitalodiniz' && (
            <div className="mt-4 px-2 border-t border-red-50 pt-4">
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className={`group flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 ${isSidebarCollapsed ? 'justify-center' : 'bg-red-50 hover:bg-red-100'}`}
              >
                <div className="text-red-600">
                  <ShieldAlert size={20} />
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-red-400 mb-1">
                      System Admin
                    </span>
                    <span className="text-[11px] font-bold text-red-700">
                      Cache Control
                    </span>
                  </div>
                )}
              </button>
            </div>
          )}
        </nav>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 space-y-4 min-w-0">
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
                index={index}
                currentView={currentView}
                onEdit={setGaleriaToEdit}
                onDelete={handleMoveToTrash}
                onArchive={handleArchiveToggle}
                onToggleShowOnProfile={() => handleToggleProfile(g)}
                onRestore={handleRestore}
                onPermanentDelete={() => setGaleriaToPermanentlyDelete(g)}
                isUpdating={updatingId === g.id}
                onSync={() => handleSyncDrive(g)}
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

        {/* PAGINAÇÃO */}
        <div className="mt-12 flex flex-col items-center justify-center space-y-6 pb-12">
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
