'use client';

import {
  Calendar,
  MapPin,
  Lock,
  User,
  Pencil,
  FolderOpen,
  Loader2,
  Check,
  ShieldCheck,
  Eye,
  RefreshCw,
  CheckSquare,
  Square,
  Link2,
  Users,
  ImageIcon,
  Tag,
  CheckCircle2,
  Circle,
  BarChart3,
  Camera,
  Trash2,
  SlidersHorizontal,
  Images,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { Galeria } from '@/core/types/galeria';
import { GALLERY_CATEGORIES } from '@/core/config/categories';
import { getPublicGalleryUrl, RESOLUTIONS } from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { GALLERY_MESSAGES } from '@/core/config/messages';
import { formatMessage } from '@/core/utils/message-helper';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import GaleriaContextMenu from '@/components/dashboard/GaleriaContextMenu';
import { useNavigation } from '@/components/providers/NavigationProvider';
import { usePlan } from '@/core/context/PlanContext';
import UpgradeModal from '@/components/ui/UpgradeModal';
import React from 'react';

import { useShare } from '@/hooks/useShare';
import { saveGaleriaSelectionAction } from '@/core/services/galeria.service';
import { ConfirmationModal, Toast } from '@/components/ui';
import { div } from 'framer-motion/client';
import { handleError } from '@supabase/auth-js/dist/module/lib/fetch';
import { createPortal } from 'react-dom';

interface GaleriaCardProps {
  galeria: Galeria;
  currentView: 'active' | 'archived' | 'trash';
  viewMode?: 'grid' | 'list';
  index: number;
  onEdit: (galeria: Galeria) => void;
  onDelete: (galeria: Galeria) => void;
  onArchive: (galeria: Galeria) => void;
  onToggleShowOnProfile: (galeria: Galeria) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onSync: () => void;
  isDeleting?: boolean;
  isUpdating?: boolean;
  isBulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onOpenTags?: (galeria: Galeria) => void;
}

export default function GaleriaCard({
  galeria,
  index,
  currentView,
  viewMode = 'grid',
  onEdit,
  onDelete,
  onArchive,
  onToggleShowOnProfile,
  onRestore,
  onPermanentDelete,
  isDeleting,
  isUpdating = false,
  onSync,
  isBulkMode = false,
  isSelected = false,
  onToggleSelect,
  onOpenTags,
}: GaleriaCardProps) {
  const { permissions } = usePlan();
  const [upsellFeature, setUpsellFeature] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const canViewLeads = permissions.canCaptureLeads;
  const { navigate, isNavigating } = useNavigation();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState({ url: '', whatsapp: '', message: '' });
  const [isImageLoading, setIsImageLoading] = useState(
    !!galeria.cover_image_url,
  );

  const [localSelectionIds, setLocalSelectionIds] = useState(
    galeria.selection_ids || [],
  );

  // Sincroniza se a prop mudar externamente
  useEffect(() => {
    setLocalSelectionIds(galeria.selection_ids || []);
  }, [galeria.selection_ids]);

  const isSelectionComplete = localSelectionIds && localSelectionIds.length > 0;
  const isEnsaio = galeria.has_contracting_client === 'ES'; // Assumi

  useEffect(() => {
    setIsImageLoading(!!galeria.cover_image_url);
  }, [galeria.cover_image_url]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (galeria && mounted) {
      const publicUrl = getPublicGalleryUrl(galeria.photographer, galeria.slug);
      const customTemplate =
        galeria.photographer?.message_templates?.card_share;
      let message: string;

      if (customTemplate && customTemplate.trim() !== '') {
        message = formatMessage(customTemplate, galeria, publicUrl);
      } else {
        message = GALLERY_MESSAGES.CARD_SHARE(galeria.title, publicUrl);
      }
      setLinks({ url: publicUrl, message: message, whatsapp: '' });
    }
  }, [galeria, mounted]);

  const categoryInfo = GALLERY_CATEGORIES.find(
    (c) => c.id === galeria.category,
  );

  const formatDateSafely = (dateString: string) => {
    if (!dateString) return '---';
    const [datePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (
      cleaned.startsWith('55') &&
      (cleaned.length === 12 || cleaned.length === 13)
    ) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.length === 11)
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (cleaned.length === 10)
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return phone;
  };

  const hasClientInfo =
    galeria.client_name && galeria.client_name !== 'Cobertura';

  const {
    imgSrc: imageUrl,
    handleError,
    handleLoad,
    imgRef,
  } = useGoogleDriveImage({
    photoId: galeria.cover_image_url || '',
    width: RESOLUTIONS.THUMB,
    priority: index < 4,
    fallbackToProxy: false,
    useProxyDirectly: true,
  });

  const onImageLoad = (e: any) => {
    setIsImageLoading(false);
    handleLoad(e);
  };

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const [isCopying, setIsCopying] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const copyToClipboard = async (format: 'lightroom' | 'comma') => {
    // 1. Prioriza o novo campo de metadados (JSON)
    const metadata = galeria.selection_metadata as
      | { id: string; name: string }[]
      | null;
    const ids = galeria.selection_ids || [];

    let photoNames: string[] = [];

    if (metadata && metadata.length > 0) {
      // Se o novo campo existir, extraímos os nomes reais
      photoNames = metadata.map((item) => item.name);
    } else {
      // Fallback: se não houver metadados, usa os IDs (para não retornar vazio em galerias antigas)
      photoNames = ids;
    }

    // 2. Formatação do texto
    const text =
      format === 'lightroom' ? photoNames.join(' ') : photoNames.join(', ');

    try {
      await navigator.clipboard.writeText(text);
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!links.url) return;
    const success = await copyToClipboard(links.url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onEdit(galeria);
  };

  // 1. Inicialize o hook extraindo o shareToClient
  const { shareToClient } = useShare({
    galeria,
    onSuccess: () => {
      // Callback opcional (ex: registrar analytics de compartilhamento)
    },
  });

  // 2. Refatore a função de clique
  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // O hook já busca internamente galeria.client_whatsapp e galeria.title
    // Você pode passar uma URL customizada se links.url for diferente da atual
    shareToClient(links.url);
  };

  const handleOpenBIReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Você pode ajustar a rota conforme sua estrutura (ex: /dashboard/galerias/[id]/bi ou /stats)
    navigate(
      `/dashboard/galerias/${galeria.id}/stats`,
      'Gerando estatísticas da galeria...',
    );
  };

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportMenuPosition, setExportMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  // Calcula posição do menu
  useEffect(() => {
    if (isExportMenuOpen && exportButtonRef.current) {
      const rect = exportButtonRef.current.getBoundingClientRect();
      const menuWidth = 200;
      const menuHeight = 120; // Altura aproximada do menu com 3 itens
      const gap = 4;

      // Detecção de colisão
      const overflowRight = rect.left + menuWidth > window.innerWidth;
      const overflowBottom = rect.bottom + menuHeight > window.innerHeight;

      setExportMenuPosition({
        // Se transbordar embaixo, abre para CIMA do botão
        top: overflowBottom ? rect.top - menuHeight - gap : rect.bottom + gap,
        // Se transbordar à direita, alinha pela direita do botão
        left: overflowRight ? rect.right - menuWidth : rect.left,
      });
    }
  }, [isExportMenuOpen]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node) &&
        exportButtonRef.current &&
        !exportButtonRef.current.contains(event.target as Node)
      ) {
        setIsExportMenuOpen(false);
      }
    };

    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // 🎯 FUNÇÃO ÚNICA PARA OS BOTÕES DE AÇÃO
  const renderActionButtons = () => {
    if (currentView !== 'active') return null;

    // 1. Reduzi a opacidade da borda para /10 ou /20 para suavizar
    // 2. Voltei para rounded-luxury para manter a identidade do card
    // 3. Ajustei o tamanho fixo (h-9 w-9) para garantir simetria total
    const btnBaseClass =
      'h-9 w-9 flex items-center justify-center text-petroleum transition-all rounded-luxury border border-petroleum/10 bg-white hover:bg-slate-50 hover:border-petroleum/30 disabled:opacity-50 shadow-sm';

    return (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isNavigating) handleEditClick(e);
          }}
          disabled={isNavigating}
          className={btnBaseClass}
          title="Editar"
        >
          <Pencil size={16} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!permissions.canTagPhotos) {
              setUpsellFeature('Organizador de Fotos');
              setIsUpgradeModalOpen(true);
              return;
            }
            navigate(
              `/dashboard/galerias/${galeria.id}/tags`,
              'Abrindo marcação de fotos...',
            );
          }}
          disabled={isNavigating}
          className={btnBaseClass}
          title="Marcação de Fotos"
        >
          {isNavigating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Tag size={16} />
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!canViewLeads) {
              setUpsellFeature('Relatório de Visitantes');
              setIsUpgradeModalOpen(true);
              return;
            }
            navigate(
              `/dashboard/galerias/${galeria.id}/leads`,
              'Gerando relatório de visitantes...',
            );
          }}
          className={btnBaseClass}
          disabled={
            canViewLeads &&
            (isNavigating ||
              (!galeria.leads_enabled && (galeria.leads_count ?? 0) <= 0))
          }
        >
          {!canViewLeads ? (
            <div className="relative">
              <Users size={16} className="opacity-40" />
              <Lock size={8} className="absolute -top-1 -right-1 text-gold" />
            </div>
          ) : (
            <Users size={16} />
          )}
        </button>

        <button
          onClick={handleOpenBIReport}
          disabled={isNavigating}
          className={btnBaseClass}
          title="Estatísticas"
        >
          {isNavigating ? (
            <Loader2 size={16} className="animate-spin text-gold" />
          ) : (
            <BarChart3 size={16} />
          )}
        </button>

        <button
          onClick={handleWhatsAppShare}
          className={btnBaseClass}
          title="WhatsApp"
        >
          <WhatsAppIcon className="w-4 h-4" />
        </button>

        {mounted && (
          <button onClick={handleCopy} className={btnBaseClass} title="Link">
            {copied ? (
              <Check size={16} className="text-green-500" />
            ) : (
              <Link2 size={16} />
            )}
          </button>
        )}

        {/* Botão de Cópia para Softwares de Edição */}
        {isEnsaio && (
          <div className="relative">
            <button
              ref={exportButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setIsExportMenuOpen(!isExportMenuOpen);
              }}
              className={`${btnBaseClass} bg-slate-50`}
              title="Opções de Exportação (Lightroom/Bridge)"
            >
              {isCopying ? (
                <Check size={16} className="text-green-600" />
              ) : (
                <Images size={16} />
              )}
            </button>

            {/* Dropdown que abre para BAIXO */}
            {isExportMenuOpen &&
              createPortal(
                <>
                  {/* Overlay invisível para fechar ao clicar fora */}
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => setIsExportMenuOpen(false)}
                  />

                  {/* Menu */}
                  <div
                    ref={exportMenuRef}
                    className="fixed bg-white rounded-lg shadow-xl border border-petroleum/10 z-[9999] min-w-[200px] py-1 "
                    style={{
                      top: `${exportMenuPosition.top}px`,
                      left: `${exportMenuPosition.left}px`,
                      // 🎯 O SEGREDO: Só mostra quando a posição for maior que zero
                      opacity: exportMenuPosition.top === 0 ? 0 : 1,
                      visibility:
                        exportMenuPosition.top === 0 ? 'hidden' : 'visible',
                    }}
                  >
                    {/* ✅ NOVO: Ver Fotos Selecionadas */}
                    <button
                      disabled={!isSelectionComplete}
                      onClick={(e) => {
                        e.stopPropagation();
                        const selectionUrl = `${links.url}?selection=true`;
                        window.open(selectionUrl, '_blank');
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-[11px] font-medium text-left hover:bg-green-50 border-b border-slate-100 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Eye size={13} className="text-green-600 shrink-0" />
                      <span className="text-green-600 font-semibold">
                        Ver Selecionadas
                      </span>
                    </button>
                    {/* Lightroom */}
                    <button
                      disabled={!isSelectionComplete}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard('lightroom');
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-[11px] font-medium text-left hover:bg-slate-50 border-b border-slate-100 flex items-center gap-3 disabled:opacity-50 
                      disabled:cursor-not-allowed transition-colors"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelectionComplete
                            ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]'
                            : 'bg-slate-300'
                        }`}
                      />
                      <span className="text-editorial-ink">
                        Lightroom (Espaço)
                      </span>
                    </button>

                    {/* Bridge / Win */}
                    <button
                      disabled={!isSelectionComplete}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard('comma');
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-[11px] font-medium text-left hover:bg-slate-50 border-b border-slate-100 flex items-center gap-3 
                      disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelectionComplete ? 'bg-slate-500' : 'bg-slate-300'
                        }`}
                      />
                      <span className="text-editorial-ink">
                        Bridge / Win (Vírgula)
                      </span>
                    </button>

                    {/* Limpar Seleção */}
                    <button
                      disabled={!isSelectionComplete}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsClearModalOpen(true);
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-[11px] font-medium text-left hover:bg-red-50 flex items-center gap-3 disabled:opacity-50 disabled:grayscale transition-colors"
                    >
                      <Trash2 size={13} className="text-red-600 shrink-0" />
                      <span className="text-red-600">Limpar Seleção</span>
                    </button>
                  </div>
                </>,
                document.body,
              )}
          </div>
        )}
      </>
    );
  };

  // --- RENDERS ---

  if (viewMode === 'list') {
    return (
      <div
        onClick={() =>
          !isBulkMode && links.url && window.open(links.url, '_blank')
        }
        className={`group relative flex items-stretch gap-6 overflow-hidden rounded-luxury border border-slate-200 bg-white p-2.5 transition-all w-full animate-in fade-in slide-in-from-bottom-2 duration-500 hover:border-petroleum/40 hover:shadow-md ${isBulkMode ? 'cursor-default' : 'cursor-pointer'} ${isSelected && isBulkMode ? 'ring-2 ring-gold border-gold' : ''}`}
        style={{ animationDelay: `${index * 30}ms` }}
      >
        {/* 1. Imagem maior e com proporção cinematográfica */}
        <div className="relative w-44 h-28 flex-shrink-0 overflow-hidden rounded-lg bg-slate-50 shadow-inner">
          {isBulkMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(galeria.id);
              }}
              className={`absolute top-2 left-2 z-30 p-1.5 rounded-md border transition-all duration-300 backdrop-blur-md ${isSelected ? 'bg-gold border-gold' : 'bg-petroleum/60 border-white/20 hover:bg-petroleum'}`}
            >
              {isSelected ? (
                <CheckSquare
                  size={16}
                  strokeWidth={3}
                  fill="none"
                  className="text-petroleum"
                />
              ) : (
                <Square
                  size={16}
                  strokeWidth={2}
                  fill="none"
                  className="text-white/60"
                />
              )}
            </button>
          )}

          {imageUrl ? (
            <img
              src={imageUrl}
              alt={galeria.title}
              className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100">
              <ImageIcon className="h-8 w-8 text-slate-300" />
            </div>
          )}
        </div>

        {/* 2. Conteúdo Centralizado Verticalmente */}
        <div className="flex-1 flex items-center justify-between gap-8 py-1">
          <div className="flex-1 min-w-0">
            {/* Título com itálico e cor Petroleum */}
            <h3 className="text-base font-semibold text-petroleum tracking-tight truncate leading-tight  mb-2">
              {galeria.title}
            </h3>

            {/* Linha Única de Metadados para economizar espaço vertical */}
            <div className="flex items-center flex-wrap gap-y-2 gap-x-4 text-[11px] text-petroleum font-medium">
              <span className="flex items-center gap-1.5 truncate">
                <User size={12} className="text-gold" />
                {galeria.client_name || 'Link Público'}
              </span>

              <span className="text-slate-200">|</span>

              <span className="flex items-center gap-1.5">
                <Calendar size={12} className="text-gold" />
                {formatDateSafely(galeria.date)}
              </span>

              <span className="text-slate-200">|</span>

              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-gold" />
                {galeria.location || 'Local não informado'}
              </span>
            </div>

            {/* Link do Drive Compacto (Não ocupa a largura toda agora) */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center h-8 rounded-md bg-slate-50 border border-slate-200 overflow-hidden transition-all hover:border-gold/30 w-fit max-w-[300px]">
                <a
                  href={`https://drive.google.com/drive/folders/${galeria.drive_folder_id}`}
                  target="_blank"
                  className="flex items-center gap-2 px-2.5 h-full hover:bg-white transition-all group/drive min-w-0"
                >
                  <FolderOpen size={13} className="text-gold shrink-0" />
                  <span className="text-[9px] font-semibold text-slate-800 truncate uppercase tracking-tight">
                    Drive: {galeria.drive_folder_name || 'Pasta Principal'}
                  </span>
                </a>

                {galeria.photo_count > 0 && (
                  <div className="flex items-center gap-1.5 px-2 text-slate-500 border-l border-slate-200 h-full bg-slate-100/30">
                    <ImageIcon size={11} className="text-gold/80" />
                    <span className="text-[10px] font-semibold text-petroleum">
                      {galeria.photo_count}
                    </span>
                  </div>
                )}

                <button
                  onClick={onSync}
                  className="flex items-center justify-center px-2 border-l border-slate-200 h-full hover:bg-white text-gold transition-all"
                >
                  <RefreshCw
                    size={11}
                    className={isUpdating ? 'animate-spin' : ''}
                  />
                </button>
              </div>

              {/* Badge de Fotos fora do input se quiser preencher o lado, ou manter dentro como acima */}
            </div>
          </div>

          {/* Bloco de Ações lateral */}
          <div className="flex items-center gap-3 pl-6 border-l border-slate-100 flex-shrink-0 self-center">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {renderActionButtons()}
            </div>
            <div className="h-8 w-[1px] bg-slate-100 mx-1" />
            <GaleriaContextMenu
              galeria={galeria}
              currentView={currentView}
              onArchive={onArchive}
              onDelete={onDelete}
              onToggleShowOnProfile={onToggleShowOnProfile}
              onRestore={onRestore}
              onPermanentDelete={onPermanentDelete}
              isUpdating={isUpdating}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={() =>
          !isBulkMode && links.url && window.open(links.url, '_blank')
        }
        className={`group relative flex flex-col overflow-hidden rounded-luxury border border-slate-200 bg-white transition-all w-full animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both hover:border-petroleum/70 ${isBulkMode ? 'cursor-default' : 'cursor-pointer'} ${isSelected && isBulkMode ? 'ring-2 ring-gold border-gold' : ''}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {(isUpdating || isDeleting) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        )}

        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900/50">
          {isBulkMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(galeria.id);
              }}
              /* 🎯 O segredo do contraste: Invertemos as cores do fundo e do ícone */
              className={`absolute top-2 left-2 z-30 p-1.5 rounded-luxury border transition-all duration-300 backdrop-blur-md
      ${
        isSelected
          ? 'bg-champagne border-champagne shadow-lg shadow-champagne/20'
          : 'bg-petroleum/80 border-white/10 hover:bg-petroleum'
      }`}
            >
              {isSelected ? (
                /* 🎯 Ícone Petroleum sobre fundo Gold: Contraste perfeito */
                <CheckSquare
                  size={16}
                  strokeWidth={3}
                  /* Forçamos fill="none" para evitar a mancha dourada */
                  fill="none"
                  className="text-petroleum"
                />
              ) : (
                /* 🎯 Ícone Discreto: Apenas contorno branco sobre fundo Petroleum */
                <Square
                  size={16}
                  strokeWidth={2}
                  fill="none"
                  className="text-white/40"
                />
              )}
            </button>
          )}
          {isImageLoading && !isUpdating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
              <div className="loading-luxury-dark w-6 h-6" />
            </div>
          )}

          {imageUrl ? (
            <img
              ref={imgRef}
              src={imageUrl}
              alt={galeria.title}
              onError={handleError}
              onLoad={onImageLoad}
              className={`h-full w-full object-cover transition-all duration-1000 ease-out group-hover:scale-105 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100">
              <ImageIcon className="h-10 w-10 text-slate-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div className="absolute top-3 left-3 flex gap-2">
            <span className="flex items-center justify-center w-8 h-8 bg-black/40 backdrop-blur-md rounded-full border border-white/10 transition-all hover:bg-black/60">
              {!galeria.is_public ? (
                <ShieldCheck
                  size={16}
                  className="text-champagne"
                  strokeWidth={2}
                />
              ) : (
                <Eye size={16} className="text-[#34D399]" strokeWidth={2} />
              )}
            </span>
          </div>

          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {categoryInfo && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-luxury border border-white/10 text-white/90 text-[9px] uppercase tracking-wider font-medium">
                <div className="w-1 h-1 rounded-full bg-white/40" />
                {categoryInfo.label}
              </span>
            )}

            {isEnsaio && (
              <span
                className={`
        flex items-center gap-1.5 px-2.5 py-1 
        backdrop-blur-md rounded-full border 
        text-[10px] font-semibold shadow-md transition-all
        ${
          isSelectionComplete
            ? 'bg-green-500/90 border-green-400/50 text-white'
            : 'bg-amber-500/90 border-amber-400/50 text-white'
        }
      `}
              >
                {isSelectionComplete ? (
                  <>
                    <CheckCircle2 size={11} strokeWidth={3} />
                    <span>Fotos selecionadas</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span>Seleção pendente</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-4">
            <h3 className="text-white text-[14px] md:text-[16px] font-semibold leading-tight tracking-luxury-tight drop-shadow-md">
              {galeria.title}
            </h3>
          </div>
        </div>

        <div className="flex flex-col py-3 px-4 space-y-4 bg-white rounded-luxury">
          {/* Bloco de Informações: Cliente, Local e Data */}
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-start gap-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <User size={12} className="text-gold shrink-0" />
                <span className="font-semibold text-petroleum uppercase tracking-luxury truncate">
                  {galeria.client_name || 'COBERTURA'}
                </span>
              </div>
              {galeria.client_whatsapp && (
                <>
                  <span className="text-petroleum">|</span>
                  <span className="text-petroleum font-medium shrink-0 tracking-tight">
                    {formatPhone(galeria.client_whatsapp)}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center justify-start gap-2.5 text-[11px] text-petroleum w-full">
              {galeria.location && (
                <span className="flex items-center gap-1 font-medium truncate">
                  <MapPin size={12} className="text-gold" />
                  {galeria.location}
                </span>
              )}
              <span className="flex items-center gap-1 font-medium shrink-0">
                <Calendar size={12} className="text-gold" />
                {formatDateSafely(galeria.date)}
              </span>
            </div>
          </div>

          {/* Container do Drive: Mais alto e com melhor definição de bordas */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center h-9 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shadow-sm transition-all hover:border-gold/30">
              <a
                href={`https://drive.google.com/drive/folders/${galeria.drive_folder_id}`}
                target="_blank"
                className="flex-1 flex items-center gap-2 px-3 h-full hover:bg-white transition-all group/drive min-w-0"
              >
                <FolderOpen size={14} className="text-gold shrink-0" />
                <span className="text-[10px] font-semibold text-slate-800 truncate uppercase tracking-tight">
                  Drive: {galeria.drive_folder_name || 'Pasta Principal'}
                </span>
              </a>

              {galeria.photo_count > 0 && (
                <div className="flex items-center gap-1.5 px-3 text-slate-500 border-l border-slate-200 h-full bg-slate-100/30">
                  <ImageIcon size={12} className="text-gold/80" />
                  <span className="text-[10px] font-semibold text-petroleum">
                    {galeria.photo_count}
                  </span>
                </div>
              )}

              <button
                onClick={onSync}
                className="flex items-center justify-center px-3 border-l border-slate-200 h-full hover:bg-white text-gold transition-all"
              >
                <RefreshCw
                  size={13}
                  className={isUpdating ? 'animate-spin' : ''}
                />
              </button>
            </div>
          </div>

          {/* Footer: Botões de Ação */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto w-full">
            <div className="flex flex-wrap items-center gap-1.5">
              {renderActionButtons()}
            </div>
            <div className="flex items-center justify-end min-w-[32px] ml-auto">
              <GaleriaContextMenu
                galeria={galeria}
                currentView={currentView}
                onArchive={onArchive}
                onDelete={onDelete}
                onToggleShowOnProfile={onToggleShowOnProfile}
                onRestore={onRestore}
                onPermanentDelete={onPermanentDelete}
                isUpdating={isUpdating}
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Limpar Seleção"
        message="Deseja realmente remover todas as fotos selecionadas desta galeria? Esta ação não pode ser desfeita."
        confirmText="Sim, Limpar Tudo"
        variant="danger"
        onConfirm={async () => {
          try {
            // 1. Chama a API (Passando array vazio para limpar IDs e Metadata no banco)
            const result = await saveGaleriaSelectionAction(galeria, []);

            if (result.success) {
              // 2. 🎯 ATUALIZAÇÃO LOCAL IMEDIATA
              setLocalSelectionIds([]);

              // Se você estiver exibindo nomes baseados no metadata, limpe-o também
              // ou garanta que o componente pai vai disparar um refresh.

              setIsClearModalOpen(false);
              setToast({
                message: 'Seleção limpa com sucesso!',
                type: 'success',
              });

              // 3. Opcional: Notificar o componente pai para atualizar a lista geral
              onSync();

              setTimeout(() => setToast(null), 3000);
            }
          } catch (err) {
            setToast({ message: 'Erro ao limpar seleção', type: 'error' });
          }
        }}
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <UpgradeModal
        isOpen={Boolean(isUpgradeModalOpen)}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureName={upsellFeature || 'Recurso Premium'}
        featureKey="canCaptureLeads"
        scenarioType="feature"
      />
    </>
  );
}
