'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Plus,
  Inbox,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  Loader2,
  HelpCircle,
  Grid3x3,
  List,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {
  getGalerias,
  moveToTrash,
  restoreGaleria,
  toggleArchiveGaleria,
  deleteGalleryPermanently,
  toggleShowOnProfile,
} from '@/core/services/galeria.service';

import type { Galeria } from '@/core/types/galeria';
import Filters from './Filters';
import { ConfirmationModal, Toast } from '@/components/ui';
import LoadingScreen from '@/components/ui/LoadingScreen';
import GaleriaCard from './GaleriaCard';
import { updateSidebarPreference } from '@/core/services/profile.service';
import {
  revalidateDrivePhotos,
  revalidateGallery,
  revalidateProfile,
} from '@/actions/revalidate.actions';
import { authService, useAuth } from '@photos/core-auth';
import AdminControlModal from '@/components/admin/AdminControlModal';
import GoogleConsentAlert from '@/components/auth/GoogleConsentAlert';
import VersionInfo from '@/components/dashboard/VersionInfo';

const CARDS_PER_PAGE = 8;

function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface PhotographerProfile {
  id: string;
  username: string;
  full_name: string;
  google_refresh_token?: string | null;
  sidebar_collapsed?: boolean;
  mini_bio?: string | null;
}

interface DashboardProps {
  initialGalerias: Galeria[];
  initialProfile: PhotographerProfile | null;
}

export default function Dashboard({
  initialGalerias,
  initialProfile,
}: DashboardProps) {
  // 🎯 VERIFICAÇÃO DE SESSÃO: Protege o dashboard contra perda de sessão
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 🎯 ALERTA DE CONSENT: Verifica se precisa mostrar alerta após login
  const [showConsentAlert, setShowConsentAlert] = useState(false);

  // 🎯 TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER RETURN CONDICIONAL
  const [galerias, setGalerias] = useState<Galeria[]>(initialGalerias);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<
    'active' | 'archived' | 'trash'
  >('active');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    initialProfile?.sidebar_collapsed ?? false,
  );
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  
  // 🎯 Carrega preferência do localStorage
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('galeria-view-mode');
      return (saved === 'grid' || saved === 'list') ? saved : 'grid';
    }
    return 'grid';
  });

  // 🎯 REDIRECIONAMENTO: Se não houver sessão válida, redireciona para login
  useEffect(() => {
    if (!authLoading && !user) {
      // Não mostra nada e redireciona imediatamente
      window.location.href = '/auth/login';
    }
  }, [user, authLoading]);

  // 🎯 VERIFICAÇÃO DE CONSENT: Verifica se precisa mostrar alerta após login
  useEffect(() => {
    const needsConsent = searchParams.get('needsConsent') === 'true';
    if (needsConsent && user) {
      // Remove o parâmetro da URL e mostra o alerta
      setShowConsentAlert(true);
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, user, router]);

  // 🎯 Salva preferência de visualização no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('galeria-view-mode', viewMode);
    }
  }, [viewMode]);

  // 🎯 Limpa seleção quando sai do modo bulk
  useEffect(() => {
    if (!isBulkMode) {
      setSelectedIds(new Set());
    }
  }, [isBulkMode]);


  const counts = useMemo(
    () => ({
      active: galerias.filter((g) => !g.is_archived && !g.is_deleted).length,
      archived: galerias.filter((g) => g.is_archived && !g.is_deleted).length,
      trash: galerias.filter((g) => g.is_deleted).length,
    }),
    [galerias],
  );

  // 🎯 FILTROS: Calculados antes dos returns condicionais
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

  // 🎯 LOADING: Mostra loading enquanto verifica sessão
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

  // 🎯 PROTEÇÃO: Não renderiza conteúdo se não houver sessão válida
  if (!user) {
    return null; // Não mostra nada enquanto redireciona
  }

  // 🎯 Estado do fotógrafo para monitorar o token
  const photographer = initialProfile;

  // 🎯 Função de Login Condicional
  const handleGoogleLogin = async (force: boolean) => {
    try {
      // Se force=true, usa consent forçado
      // Se force=false, usa select_account (padrão)
      await authService.signInWithGoogle(force);
    } catch {
      setToast({ message: 'Erro ao conectar com Google', type: 'error' });
    }
  };

  // 🎯 Função para lidar com consent quando alerta é confirmado
  const handleConsentConfirm = async () => {
    try {
      // Fecha o alerta e faz login com consent
      setShowConsentAlert(false);
      await authService.signInWithGoogle(true); // forceConsent=true
    } catch (error) {
      console.error('Erro ao iniciar login com consent:', error);
      setToast({ message: 'Erro ao conectar com Google', type: 'error' });
    }
  };

  // --- MÉTODOS DE AÇÃO ---

  // 🎯 AÇÕES EM LOTE
  const handleBulkArchive = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setUpdatingId('bulk');
    try {
      const promises = ids.map((id) => {
        const galeria = galerias.find((g) => g.id === id);
        if (!galeria) return Promise.resolve({ success: false });
        return toggleArchiveGaleria(id, galeria.is_archived);
      });

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount > 0) {
        setGalerias((prev) =>
          prev.map((item) =>
            selectedIds.has(item.id)
              ? { ...item, is_archived: !item.is_archived }
              : item,
          ),
        );
        await revalidateProfile(photographer?.username);
        setToast({
          message: `${successCount} galeria(s) ${currentView === 'archived' ? 'desarquivada(s)' : 'arquivada(s)'}`,
          type: 'success',
        });
        setSelectedIds(new Set());
      } else {
        setToast({ message: 'Erro ao processar arquivamento em lote', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Erro ao processar arquivamento em lote', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setUpdatingId('bulk');
    try {
      const promises = ids.map((id) => moveToTrash(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount > 0) {
        setGalerias((prev) =>
          prev.map((item) =>
            selectedIds.has(item.id) ? { ...item, is_deleted: true } : item,
          ),
        );
        await revalidateProfile(photographer?.username);
        setToast({
          message: `${successCount} galeria(s) movida(s) para lixeira`,
          type: 'success',
        });
        setSelectedIds(new Set());
      } else {
        setToast({ message: 'Erro ao mover para lixeira', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Erro ao mover para lixeira', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setUpdatingId('bulk');
    try {
      const promises = ids.map((id) => restoreGaleria(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount > 0) {
        setGalerias((prev) =>
          prev.map((item) =>
            selectedIds.has(item.id)
              ? { ...item, is_deleted: false, is_archived: false }
              : item,
          ),
        );
        await revalidateProfile(photographer?.username);
        setToast({
          message: `${successCount} galeria(s) restaurada(s)`,
          type: 'success',
        });
        setSelectedIds(new Set());
      } else {
        setToast({ message: 'Erro ao restaurar', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Erro ao restaurar', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(visibleGalerias.map((g) => g.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
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
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Não foi possível alterar a visibilidade.';
      setToast({
        message: errorMessage,
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
      // 🎯 Revalida cache incluindo a capa da galeria
      await revalidateGallery(
        galeria.drive_folder_id,
        galeria.slug,
        galeria.photographer_username,
        galeria.photographer_username,
        galeria.cover_image_url, // Passa o photoId da capa para revalidar o cache
      );
      setToast({ message: 'Sincronização concluída!', type: 'success' });
    } catch {
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
    } catch {
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


  return (
    <div className="mx-auto flex flex-col lg:flex-row max-w-[1600px] gap-4 px-4 py-2 bg-luxury-bg min-h-screen pb-24 lg:pb-6">
      {/* SIDEBAR */}
      <aside
        className={`fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 px-6 py-3 lg:py-0 lg:px-0 lg:relative lg:block lg:bg-petroleum lg:border-0 lg:rounded-lg transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'lg:w-[70px]' : 'lg:w-[210px]'}`}
      >
        {/* 1. Botão Nova Galeria (Mantido tamanho original) */}
        <div className="lg:px-4 lg:py-3">
          <button
            // Esta rota leva para a página de criação de uma nova galeria
            onClick={() => router.push('/dashboard/galerias/new')}
            className={`flex items-center justify-center bg-[#F3E5AB] text-petroleum hover:bg-[#F3E5AB]/90 transition-all duration-300 rounded-[0.5rem] border border-[#F3E5AB] group shadow-lg mb-6 overflow-hidden w-12 h-12 fixed bottom-20 right-6 z-[100] lg:relative lg:bottom-auto lg:right-auto lg:z-auto lg:shadow-sm lg:mb-0 ${isSidebarCollapsed ? 'lg:w-14 lg:h-10' : 'lg:h-10 lg:px-4 lg:gap-3 lg:w-full'}`}
          >
          <Plus
            size={20}
            className="group-hover:rotate-90 transition-transform shrink-0 lg:w-[18px] lg:h-[18px]"
            strokeWidth={2.5}
          />
          {!isSidebarCollapsed && (
            <span className="hidden lg:block text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap">
              Nova Galeria
            </span>
          )}
          </button>
        </div>

        <nav className="flex lg:flex-col justify-around lg:justify-start lg:space-y-1 relative lg:px-4 lg:py-3">
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex absolute -right-3 top-[-10px] bg-slate-800 border border-slate-700 rounded-full p-1 shadow-sm hover:bg-slate-700 z-10 text-slate-400 hover:text-slate-300"
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>

          {/* SESSÃO 1: STATUS DAS GALERIAS */}
          {!isSidebarCollapsed && (
            <div className="hidden lg:block mb-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                GALERIAS
              </span>
            </div>
          )}
          <div className="flex flex-row lg:flex-col flex-1 justify-around lg:justify-start gap-2 lg:gap-1 w-full">
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
                  setCurrentView(item.id as 'active' | 'archived' | 'trash');
                  setCardsToShow(8);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col lg:flex-row items-center justify-between transition-all duration-300 group relative w-full ${isSidebarCollapsed ? 'lg:justify-center lg:py-4' : 'lg:px-4 lg:py-3 lg:rounded-xl'} ${currentView === item.id ? 'text-black bg-champagne shadow-sm lg:text-[#D4AF37] lg:bg-white/10' : 'text-slate-400 hover:text-slate-300 lg:text-slate-400 lg:hover:text-[#D4AF37]'}`}
              >
                {/* Linha vertical de 2px à esquerda para item ativo (desktop) */}
                {currentView === item.id && (
                  <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#D4AF37] rounded-r" />
                )}
                <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3 relative">
                  {/* Indicador visual para mobile (barra superior) */}
                  {currentView === item.id && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gold lg:hidden" />
                  )}
                  {/* Container do ícone com badge no mobile */}
                  <div className="relative">
                    <item.icon
                      size={22}
                      className={
                        currentView === item.id
                          ? 'text-gold lg:text-[#D4AF37]'
                          : 'text-slate-400 group-hover:text-[#D4AF37]'
                      }
                    />
                    {/* Badge circular no mobile - canto superior direito */}
                    {item.count > 0 && (
                      <span
                        className={`absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[10px] font-semibold border transition-colors lg:hidden ${
                          item.id === 'active'
                            ? currentView === item.id
                              ? 'min-w-[18px] h-5 px-1.5 bg-gold text-black border-gold/50 shadow-sm'
                              : 'min-w-[18px] h-5 px-1.5 bg-slate-700 text-white border-slate-600 shadow-sm'
                            : currentView === item.id
                              ? 'min-w-[16px] h-4 px-1 bg-slate-600 text-white border-slate-500'
                              : 'min-w-[16px] h-4 px-1 bg-slate-500 text-white border-slate-400'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </div>
                  <span
                    className={`hidden lg:block uppercase text-[10px] font-bold tracking-widest ${!isSidebarCollapsed ? 'lg:block' : 'lg:hidden'}`}
                  >
                    {item.label}
                  </span>
                </div>
                {/* Badge numérico discreto - sempre visível (desktop) */}
                {!isSidebarCollapsed && (
                  <span
                    className={`hidden lg:block text-[10px] font-semibold tracking-widest ${
                      currentView === item.id ? 'text-[#D4AF37]' : 'text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Armazenamento dentro da seção GALERIAS */}
          <div
            className={`hidden lg:block pt-4 border-t border-slate-700 transition-all duration-500 ${isSidebarCollapsed ? 'px-0' : ''}`}
          >
            {!isSidebarCollapsed ? (
              <div className="space-y-2">
                <div className="flex justify-end items-end mb-1">
                  <span className="text-[10px] font-semibold tracking-widest text-slate-300">
                    {galerias.length} / 50
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-1000 ease-out rounded-full ${
                      galerias.length > 45 
                        ? 'bg-gradient-to-r from-red-500 to-red-600' 
                        : 'bg-gradient-to-r from-gold to-[#D4AF37]'
                    } shadow-sm`}
                    style={{ width: `${(galerias.length / 50) * 100}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1 font-medium">
                  Limite de 50 galerias no plano atual
                </p>
              </div>
            ) : (
              <div className="flex justify-center group relative cursor-help py-2">
                <div className="w-8 h-8 rounded-full border-2 border-slate-700 flex items-center justify-center text-[9px] font-black text-slate-300">
                  {galerias.length}
                </div>
                {/* Z-INDEX CORRIGIDO PARA O TOOLTIP */}
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-2xl">
                  {galerias.length} de 50 galerias usadas
                </div>
              </div>
            )}
          </div>

          {/* Divisor claro entre GALERIAS e SISTEMA */}
          <div className="hidden lg:block mt-10 mb-10 border-t border-slate-700"></div>

          {/* SESSÃO 3: SISTEMA (Google Drive) */}
          {!isSidebarCollapsed && (
            <div className="hidden lg:block mb-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                SISTEMA
              </span>
            </div>
          )}
          {/* 🎯 SEÇÃO 3: STATUS GOOGLE DRIVE (Melhorado com Indicador Pulsante) */}
          <div
            className={`hidden lg:block pt-4 border-t border-slate-700 ${isSidebarCollapsed ? 'px-0' : ''}`}
          >
            <div
              className={`relative group flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'justify-center py-4' : 'gap-3 py-3 rounded-xl hover:bg-white/5'}`}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${photographer?.google_refresh_token ? 'bg-green-500' : 'bg-amber-500'} shadow-sm`}
                />
                {photographer?.google_refresh_token ? (
                  <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
                ) : (
                  <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping opacity-75" />
                )}
              </div>

              {!isSidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">
                    Google Drive
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-semibold truncate ${photographer?.google_refresh_token ? 'text-green-600' : 'text-amber-600'}`}
                    >
                      {photographer?.google_refresh_token
                        ? 'Drive Sincronizado'
                        : 'Ação Necessária'}
                    </span>
                    <button
                      onClick={() =>
                        handleGoogleLogin(!photographer?.google_refresh_token)
                      }
                      className="p-1 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-[#D4AF37]"
                    >
                      <RefreshCw
                        size={12}
                        strokeWidth={2.5}
                        className={
                          !photographer?.google_refresh_token
                            ? 'animate-spin'
                            : ''
                        }
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SESSÃO 4: AJUDA */}
          {!isSidebarCollapsed && (
            <div className="hidden lg:block mt-10 mb-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                AJUDA
              </span>
            </div>
          )}
          {/* 🎯 SEÇÃO 4: AJUDA */}
          <div className="mt-4 lg:border-t lg:border-slate-700 lg:pt-6">
            <Link
              href="/dashboard/ajuda"
              className={`flex items-center transition-all duration-300 group relative ${isSidebarCollapsed ? 'justify-center py-4' : 'gap-3 py-3 rounded-xl hover:bg-white/5'}`}
            >
              <div className="text-slate-400 group-hover:text-[#D4AF37] transition-colors">
                <HelpCircle size={20} strokeWidth={2} />
              </div>
              {!isSidebarCollapsed && (
                <div className="hidden lg:flex flex-col items-start leading-none">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                    Ajuda
                  </span>
                  <span className="text-[11px] font-medium text-slate-300">
                    Perguntas Frequentes
                  </span>
                </div>
              )}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-xl">
                  Ajuda
                </div>
              )}
            </Link>
          </div>

          {/* SESSÃO 5: CONTA (Admin Mode) */}
          {photographer?.username === 'hitalodiniz' && (
            <div className="mt-10 lg:border-t lg:border-slate-700 lg:pt-6">
              {!isSidebarCollapsed && (
                <div className="hidden lg:block mb-10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                    CONTA
                  </span>
                </div>
              )}
              <div className="mt-4 lg:mt-0">
                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className={`flex items-center transition-all duration-300 group relative w-full ${isSidebarCollapsed ? 'justify-center py-4' : 'gap-3 py-3 rounded-xl hover:bg-white/5'}`}
                >
                  <div className="text-slate-400 group-hover:text-[#D4AF37] transition-colors">
                    <ShieldAlert size={20} strokeWidth={2} />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="hidden lg:flex flex-col items-start leading-none">
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1 group-hover:text-[#D4AF37] transition-colors">
                        Admin Mode
                      </span>
                      <span className="text-[11px] font-medium text-slate-300 group-hover:text-slate-200 transition-colors">
                        Cache & Tokens
                      </span>
                    </div>
                  )}
                  {isSidebarCollapsed && (
                    <div className="absolute left-full ml-4 px-3 py-2 bg-petroleum text-white text-[10px] font-bold uppercase rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-xl border border-white/10">
                      Admin Panel
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 🎯 SEÇÃO 6: CONTROLE DE VERSÃO E DEPLOY */}
          {/* Versão visível para todos, detalhes completos apenas para hitalodiniz */}
          {/* Oculto no mobile */}
          <div className="hidden lg:block mt-4 px-2 lg:border-t lg:border-slate-700 lg:pt-4 lg:pb-2">
            <VersionInfo 
              isCollapsed={isSidebarCollapsed} 
              showFullDetails={initialProfile?.username === 'hitalodiniz'}
            />
          </div>
        </nav>

        <AdminControlModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
        />
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 space-y-2 min-w-0">
        <header className="bg-petroleum rounded-lg border-b border-slate-700/50">
          {/* Barra de Ações em Lote */}
          {isBulkMode && selectedIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white/90">
                  {selectedIds.size} selecionada(s)
                </span>
                {selectedIds.size < visibleGalerias.length ? (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-white/70 hover:text-[#D4AF37] underline transition-colors"
                  >
                    Selecionar todas
                  </button>
                ) : (
                  <button
                    onClick={handleDeselectAll}
                    className="text-xs text-white/70 hover:text-[#D4AF37] underline transition-colors"
                  >
                    Desselecionar todas
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentView === 'trash' ? (
                  <button
                    onClick={handleBulkRestore}
                    disabled={updatingId === 'bulk'}
                    className="px-3 py-1.5 text-xs font-medium bg-white/10 text-white rounded-md hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-1.5 border border-white/10"
                  >
                    {updatingId === 'bulk' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Inbox size={14} />
                    )}
                    Restaurar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleBulkArchive}
                      disabled={updatingId === 'bulk'}
                      className="px-3 py-1.5 text-xs font-medium bg-gold text-white rounded-md hover:bg-[#D4AF37] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {updatingId === 'bulk' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Archive size={14} />
                      )}
                      {currentView === 'archived' ? 'Desarquivar' : 'Arquivar'}
                    </button>
                    {currentView !== 'archived' && (
                      <button
                        onClick={handleBulkDelete}
                        disabled={updatingId === 'bulk'}
                        className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {updatingId === 'bulk' ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Mover para Lixeira
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Header compacto: Filtros + View Toggle + Bulk Mode */}
          <div className="flex items-center gap-4 px-4 py-3">
            {isBulkMode && (
              <button
                onClick={() => {
                  setIsBulkMode(false);
                  setSelectedIds(new Set());
                }}
                className="p-1.5 text-white/60 hover:text-[#D4AF37] hover:bg-white/5 rounded transition-colors shrink-0"
                title="Sair do modo seleção"
              >
                <X size={16} />
              </button>
            )}
            {!isBulkMode && (
              <button
                onClick={() => setIsBulkMode(true)}
                className="p-1.5 text-white/60 hover:text-[#D4AF37] hover:bg-white/5 rounded transition-colors shrink-0"
                title="Selecionar múltiplas galerias"
              >
                <CheckSquare size={16} />
              </button>
            )}
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
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-all ${
                  viewMode === 'grid'
                    ? 'text-[#D4AF37]'
                    : 'text-white/60 hover:text-white/80'
                }`}
                title="Grid"
              >
                <Grid3x3 size={16} strokeWidth={2} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-all ${
                  viewMode === 'list'
                    ? 'text-[#D4AF37]'
                    : 'text-white/60 hover:text-white/80'
                }`}
                title="Lista"
              >
                <List size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-[0.5rem] border border-petroleum/40 shadow-sm p-4 min-h-[500px]">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleGalerias.map((g, index) => (
                <GaleriaCard
                  key={g.id}
                  galeria={g}
                  index={index}
                  currentView={currentView}
                  viewMode={viewMode}
                  onEdit={(g) => router.push(`/dashboard/galerias/${g.id}/edit`)}
                  onDelete={handleMoveToTrash}
                  onArchive={handleArchiveToggle}
                  onToggleShowOnProfile={() => handleToggleProfile(g)}
                  onRestore={handleRestore}
                  onPermanentDelete={() => setGaleriaToPermanentlyDelete(g)}
                  isUpdating={updatingId === g.id}
                  onSync={() => handleSyncDrive(g)}
                  isBulkMode={isBulkMode}
                  isSelected={selectedIds.has(g.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleGalerias.map((g, index) => (
                <GaleriaCard
                  key={g.id}
                  galeria={g}
                  index={index}
                  currentView={currentView}
                  viewMode={viewMode}
                  onEdit={(g) => router.push(`/dashboard/galerias/${g.id}/edit`)}
                  onDelete={handleMoveToTrash}
                  onArchive={handleArchiveToggle}
                  onToggleShowOnProfile={() => handleToggleProfile(g)}
                  onRestore={handleRestore}
                  onPermanentDelete={() => setGaleriaToPermanentlyDelete(g)}
                  isUpdating={updatingId === g.id}
                  onSync={() => handleSyncDrive(g)}
                  isBulkMode={isBulkMode}
                  isSelected={selectedIds.has(g.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
          )}
          {visibleGalerias.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[10px] flex items-center justify-center mb-6 border border-champagne">
                <Inbox className="text-gold opacity-40" size={32} />
              </div>
              <h3 className="text-xl italic text-petroleum dark:text-slate-800 mb-2">
                Nenhuma galeria por aqui
              </h3>
              <p className="text-sm text-petroleum/70 dark:text-slate-500 max-w-xs mb-8">
                Não encontramos resultados para sua busca.
              </p>
            </div>
          )}
        </div>

        {/* FECHAMENTO EDITORIAL */}
        <div className="bg-petroleum rounded-xl py-6 px-4 mt-12">
          <div className="flex items-center justify-center gap-4">
            {/* Contador - Botão Secundário */}
            <div className="px-4 py-3.5 rounded-[0.5rem] bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              EXIBINDO {visibleGalerias.length} DE {filteredGalerias.length} GALERIAS
            </div>
            
            {/* Botão Principal - Expandir Acervo */}
            {filteredGalerias.length > cardsToShow && (
              <button
                onClick={() => setCardsToShow((prev) => prev + CARDS_PER_PAGE)}
                className="group px-6 py-3.5 rounded-[0.5rem] bg-[#F3E5AB] text-petroleum border border-[#F3E5AB] hover:bg-[#F3E5AB]/90 transition-all duration-300 uppercase text-[10px] font-bold tracking-[0.2em] shadow-lg active:scale-95 flex items-center gap-3 ml-4"
              >
                <Plus
                  size={14}
                  strokeWidth={2.5}
                  className="text-petroleum group-hover:rotate-90 transition-transform duration-300 shrink-0"
                />
                EXPANDIR ACERVO
              </button>
            )}
          </div>
        </div>
      </main>

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
      <GoogleConsentAlert
        isOpen={showConsentAlert}
        onClose={() => setShowConsentAlert(false)}
        onConfirm={handleConsentConfirm}
      />
    </div>
  );
}
