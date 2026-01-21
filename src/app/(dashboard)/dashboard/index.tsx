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
import GalleryFormModal from './GaleriaModal';
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
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
          <div className="absolute inset-0 blur-xl bg-champagne-dark opacity-20 animate-pulse"></div>
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
  const handleFormSuccess = async (
    success: boolean,
    data: Galeria | string,
  ) => {
    if (success) {
      if (galeriaToEdit && typeof data !== 'string') {
        // 🎯 Revalida cache incluindo a nova capa se foi alterada
        await revalidateGallery(
          data.drive_folder_id,
          data.slug,
          data.photographer_username || data.photographer?.username || '',
          data.photographer_username || data.photographer?.username || '',
          data.cover_image_url, // Passa o photoId da nova capa para revalidar o cache
        );
        setGalerias((prev) => prev.map((g) => (g.id === data.id ? data : g)));
        setToast({ message: 'Galeria atualizada!', type: 'success' });
      } else {
        // 🎯 FORÇA REVALIDAÇÃO: Recarrega as galerias do servidor após criar
        // Isso garante que o cache seja atualizado mesmo que a revalidação não tenha funcionado
        const result = await getGalerias();
        if (result.success) {
          setGalerias(result.data);
          setToast({ message: 'Galeria criada!', type: 'success' });
        } else {
          // Se ainda não aparecer, força reload da página
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    } else {
      const errorMessage = typeof data === 'string' ? data : 'Erro na operação';
      setToast({ message: errorMessage, type: 'error' });
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
        className={`fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 px-6 py-3 lg:py-0 lg:px-0 lg:relative lg:block lg:bg-transparent lg:border-0 transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'lg:w-[70px]' : 'lg:w-[210px]'}`}
      >
        {/* 1. Botão Nova Galeria (Mantido tamanho original) */}
        <button
          onClick={() => setIsFormOpen(true)}
          className={`flex items-center justify-center bg-gold text-black hover:bg-white hover:text-gold transition-all duration-300 rounded-[0.5rem] border border-gold group shadow-lg lg:shadow-sm mb-6 overflow-hidden w-12 h-12 fixed bottom-20 right-6 z-[100] lg:relative lg:bottom-auto lg:right-auto lg:z-auto ${isSidebarCollapsed ? 'lg:w-14 lg:h-10' : 'lg:h-10 lg:px-4 lg:gap-3 lg:w-fit'}`}
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

          {/* Itens de Navegação - Corrigido para não encavalar no mobile */}
          <div className="flex flex-row lg:flex-col flex-1 justify-around lg:justify-start gap-1 w-full">
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
                className={`flex flex-col lg:flex-row items-center transition-all duration-300 group relative ${isSidebarCollapsed ? 'lg:justify-center lg:py-4' : 'lg:justify-between lg:px-4 lg:py-3 lg:rounded-xl'} ${currentView === item.id ? 'text-black bg-champagne shadow-sm' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
              >
                <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
                  <item.icon
                    size={22}
                    className={
                      currentView === item.id
                        ? 'text-black'
                        : 'text-slate-400 group-hover:text-gold'
                    }
                  />
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
          </div>

          {/* 🎯 SEÇÃO 2: ARMAZENAMENTO (Textos Originais Restaurados) */}
          <div
            className={`hidden lg:block mt-8 pt-8 border-t border-slate-100 transition-all duration-500 ${isSidebarCollapsed ? 'px-0' : 'px-2'}`}
          >
            {!isSidebarCollapsed ? (
              <div className="space-y-2">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[9px] font-semiboldbold uppercase tracking-widest text-slate-700">
                    Armazenamento
                  </span>
                  <span className="text-[10px] font-semibold text-slate-900">
                    {galerias.length} / 50
                  </span>
                </div>
                <div className="w-full h-[6px] bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-1000 ease-out ${galerias.length > 45 ? 'bg-red-500' : 'bg-gold'}`}
                    style={{ width: `${(galerias.length / 50) * 100}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-700 uppercase tracking-widest mt-1 font-medium">
                  Limite de 50 galerias no plano atual
                </p>
              </div>
            ) : (
              <div className="flex justify-center group relative cursor-help py-2">
                <div className="w-8 h-8 rounded-full border-2 border-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500">
                  {galerias.length}
                </div>
                {/* Z-INDEX CORRIGIDO PARA O TOOLTIP */}
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-2xl">
                  {galerias.length} de 50 galerias usadas
                </div>
              </div>
            )}
          </div>

          {/* 🎯 SEÇÃO 3: STATUS GOOGLE DRIVE (Textos Originais Restaurados) */}
          <div
            className={`hidden lg:block mt-2 pt-4 border-t border-slate-100 ${isSidebarCollapsed ? 'px-0' : 'px-2'}`}
          >
            <div
              className={`relative group flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'justify-center py-4' : 'gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100'}`}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${photographer?.google_refresh_token ? 'bg-green-500' : 'bg-amber-500'} shadow-sm`}
                />
                {!photographer?.google_refresh_token && (
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
                      className={`text-[10px] font-semibold truncate ${photographer?.google_refresh_token ? 'text-slate-600' : 'text-amber-600'}`}
                    >
                      {photographer?.google_refresh_token
                        ? 'Conectado'
                        : 'Ação Necessária'}
                    </span>
                    <button
                      onClick={() =>
                        handleGoogleLogin(!photographer?.google_refresh_token)
                      }
                      className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-400 hover:text-gold"
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

          {/* 🎯 SEÇÃO 4: AJUDA */}
          <div className="mt-4 px-2 lg:border-t lg:pt-4">
            <Link
              href="/dashboard/ajuda"
              className={`flex items-center transition-all duration-300 group relative ${isSidebarCollapsed ? 'justify-center py-4' : 'gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100'}`}
            >
              <div className="text-slate-600">
                <HelpCircle size={20} strokeWidth={2} />
              </div>
              {!isSidebarCollapsed && (
                <div className="hidden lg:flex flex-col items-start leading-none">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                    Ajuda
                  </span>
                  <span className="text-[11px] font-medium text-slate-600">
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

          {/* 🎯 SEÇÃO 5: ADMIN MODE (Restaurado e Corrigido para Mobile) - ADMIN LIGHT */}
          {photographer?.username === 'hitalodiniz' && (
            <div className="mt-4 px-2 lg:border-t lg:pt-4">
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className={`flex items-center transition-all duration-300 group relative ${isSidebarCollapsed ? 'justify-center py-4' : 'gap-3 p-3 rounded-xl bg-[#F3E5AB]/20 hover:bg-[#F3E5AB]/40 border border-[#D4AF37]/40'}`}
              >
                <div className="text-[#D4AF37]">
                  <ShieldAlert size={20} strokeWidth={2} />
                </div>
                {!isSidebarCollapsed && (
                  <div className="hidden lg:flex flex-col items-start leading-none">
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-[#D4AF37] mb-1">
                      Admin Mode
                    </span>
                    <span className="text-[11px] font-medium text-[#D4AF37]">
                      Cache & Tokens
                    </span>
                  </div>
                )}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-[#1E293B] text-white text-[10px] font-bold uppercase rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-xl border border-white/10">
                    Admin Panel
                  </div>
                )}
              </button>
            </div>
          )}

          {/* 🎯 SEÇÃO 6: CONTROLE DE VERSÃO E DEPLOY */}
          {/* Versão visível para todos, detalhes completos apenas para hitalodiniz */}
          {/* Oculto no mobile */}
          <div className="hidden lg:block mt-4 px-2 lg:border-t lg:pt-4 lg:pb-2">
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
              <div className="w-20 h-20 bg-slate-50 rounded-[10px] flex items-center justify-center mb-6 border border-champagne">
                <Inbox className="text-gold opacity-40" size={32} />
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
            <div className="text-[10px] font-semibold text-slate-700 uppercase tracking-widest">
              {visibleGalerias.length} de {filteredGalerias.length} Galerias
            </div>
            <div className="w-40 h-[3px] bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-700 ease-out"
                style={{
                  width: `${(visibleGalerias.length / filteredGalerias.length) * 100}%`,
                }}
              />
            </div>
          </div>
          {filteredGalerias.length > cardsToShow && (
            <button
              onClick={() => setCardsToShow((prev) => prev + CARDS_PER_PAGE)}
              className="group mx-auto px-12 py-3.5 rounded-full bg-white text-black border border-slate-200 hover:border-gold hover:shadow-xl hover:shadow-gold/10 transition-all duration-300 uppercase text-[10px] font-bold tracking-widest active:scale-95 flex items-center gap-3"
            >
              <Plus
                size={14}
                strokeWidth={3}
                className="text-gold group-hover:rotate-90 transition-transform duration-300"
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
        onTokenExpired={() => setShowConsentAlert(true)}
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
      <GoogleConsentAlert
        isOpen={showConsentAlert}
        onClose={() => setShowConsentAlert(false)}
        onConfirm={handleConsentConfirm}
      />
    </div>
  );
}
