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
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Galeria } from '@/core/types/galeria';
import { GALLERY_CATEGORIES } from '@/core/config/categories';
import {
  getPublicGalleryUrl,
  copyToClipboard,
  RESOLUTIONS,
} from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { GALLERY_MESSAGES } from '@/core/config/messages';
import { formatMessage } from '@/core/utils/message-helper';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import GaleriaContextMenu from '@/components/dashboard/GaleriaContextMenu';
import { useNavigation } from '@/components/providers/NavigationProvider';
import { usePlan } from '@/core/context/PlanContext';
import UpgradeModal from '@/components/ui/UpgradeModal';
import React from 'react';
import { executeShare } from '@/core/utils/share-helper';
import { div } from 'framer-motion/client';

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

  // --- NOVOS ESTADOS PARA ESTATÍSTICAS ---
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

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

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    executeShare({
      title: galeria.title,
      text: links.message,
      phone: galeria.client_whatsapp,
    });
  };

  const handleOpenBIReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Você pode ajustar a rota conforme sua estrutura (ex: /dashboard/galerias/[id]/bi ou /stats)
    navigate(
      `/dashboard/galerias/${galeria.id}/stats`,
      'Gerando estatísticas da galeria...',
    );
  };

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
        className={`group relative flex items-center gap-4 overflow-hidden rounded-luxury border border-slate-200 bg-white p-3 transition-all w-full animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both hover:border-petroleum/70 ${isBulkMode ? 'cursor-default' : 'cursor-pointer'} ${isSelected && isBulkMode ? 'ring-2 ring-gold border-gold' : ''}`}
        style={{ animationDelay: `${index * 30}ms` }}
      >
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

        {(isUpdating || isDeleting) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        )}

        <div className="relative w-24 h-16 flex-shrink-0 overflow-hidden rounded-luxury bg-slate-50">
          {isImageLoading && !isUpdating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
              <div className="loading-luxury-dark w-4 h-4" />
            </div>
          )}
          {imageUrl ? (
            <img
              ref={imgRef}
              src={imageUrl}
              alt={galeria.title}
              onError={handleError}
              onLoad={onImageLoad}
              className={`h-full w-full object-cover transition-all duration-500 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100">
              <ImageIcon className="h-6 w-6 text-slate-300" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-editorial-ink mb-1 truncate">
              {galeria.title}
            </h3>
            <div className="flex flex-col gap-1.5 w-full">
              <div
                className={`flex items-center gap-1.5 text-[11px] justify-start ${hasClientInfo ? 'text-editorial-gray' : 'invisible h-[15px]'}`}
              >
                <User size={11} className="text-editorial-gray shrink-0" />
                <span className="font-medium text-editorial-gray">
                  {galeria.client_name || 'Placeholder'}
                </span>
                {galeria.client_whatsapp && (
                  <>
                    <span className="text-editorial-gray/40">•</span>
                    <span className="text-editorial-gray font-medium shrink-0">
                      {formatPhone(galeria.client_whatsapp)}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-start gap-2 text-[11px] text-editorial-gray w-full">
                {galeria.location && (
                  <span className="flex items-center gap-1 font-medium truncate">
                    <MapPin size={11} className="text-editorial-gray" />
                    {galeria.location}
                  </span>
                )}
                {galeria.location && (
                  <span className="text-editorial-gray/40">•</span>
                )}
                <span className="flex items-center gap-1 text-[11px] font-medium shrink-0">
                  <Calendar size={11} className="text-editorial-gray" />
                  {formatDateSafely(galeria.date)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-medium text-editorial-gray/70">
                <span className="flex items-center gap-1">
                  <ImageIcon size={10} className="text-editorial-gray" />
                  {galeria.photo_count || 0} fotos
                </span>
                {galeria.cover_image_ids &&
                  galeria.cover_image_ids.length > 1 && (
                    <>
                      <span className="text-editorial-gray/40">•</span>
                      <span className="text-editorial-gray bg-gold/5 px-1.5 rounded-full border border-gold/10">
                        {galeria.cover_image_ids.length} capas
                      </span>
                    </>
                  )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-start gap-2 flex-shrink-0">
            {renderActionButtons()}
            <div className="flex justify-end min-w-[32px]">
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

          <div className="absolute top-3 right-3">
            {categoryInfo && (
              <span className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md rounded-luxury text-white border border-white/20 text-[8px]">
                {categoryInfo.label}
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-4">
            <h3 className="text-white text-[15px] truncate font-semibold leading-tight tracking-luxury-tight drop-shadow-md italic">
              {galeria.title}
            </h3>
          </div>
        </div>

        <div className="flex flex-col py-1 px-3 space-y-4 bg-white">
          <div className="flex flex-col gap-1 py-0.5 w-full">
            <div className="flex items-center justify-start gap-1.5 text-[11px] text-editorial-gray">
              <div className="flex items-center gap-1.5 min-w-0">
                <User size={11} className="text-editorial-gray shrink-0" />
                <span className="font-semibold text-editorial-gray uppercase tracking-luxury truncate">
                  {galeria.client_name || 'Placeholder'}
                </span>
              </div>
              {galeria.client_whatsapp && (
                <>
                  <span className="text-editorial-gray/40">•</span>
                  <span className="text-editorial-gray font-medium shrink-0">
                    {formatPhone(galeria.client_whatsapp)}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center justify-start gap-2 text-[11px] text-editorial-gray w-full">
              {galeria.location && (
                <span className="flex items-center gap-1 font-medium truncate">
                  <MapPin size={11} className="text-editorial-gray" />
                  {galeria.location}
                </span>
              )}
              {galeria.location && (
                <span className="text-editorial-gray/40">•</span>
              )}
              <span className="flex items-center gap-1 text-[11px] font-medium shrink-0">
                <Calendar size={11} className="text-editorial-gray" />
                {formatDateSafely(galeria.date)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center h-8 rounded-luxury-sm bg-slate-50 border border-petroleum/20 overflow-hidden">
              <a
                href={`https://drive.google.com/drive/folders/${galeria.drive_folder_id}`}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center gap-1.5 px-2.5 h-full hover:bg-white transition-all group/drive min-w-0"
                title="Acessar pasta do Google Drive"
              >
                <FolderOpen size={13} className="text-gold shrink-0" />
                <span className="text-[10px] font-medium text-editorial-gray truncate">
                  Drive: {galeria.drive_folder_name || 'Sem pasta vinculada'}
                </span>
              </a>

              {galeria.photo_count > 0 && (
                <div className="flex items-center gap-1.5 px-2 text-editorial-gray border-l border-petroleum/10 h-full bg-slate-100/50">
                  <ImageIcon size={11} className="text-gold/70" />
                  <span
                    className="text-[10px] font-medium text-petroleum"
                    title="Quantidade de fotos na galeria"
                  >
                    {galeria.photo_count || 0}
                  </span>
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSync();
                }}
                disabled={isUpdating}
                className="flex items-center justify-center px-2.5 border-l border-slate-200 h-full hover:bg-white text-gold hover:text-gold transition-all"
                title="Sincronizar com o Google Drive"
              >
                {isUpdating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 bg-slate-50/50 border-t border-petroleum/10 mt-auto w-full">
            {/* Esquerda: Botões de Ação */}
            <div className="flex flex-wrap items-center gap-1.5">
              {renderActionButtons()}
            </div>

            {/* Direita: Menu de Contexto */}
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
