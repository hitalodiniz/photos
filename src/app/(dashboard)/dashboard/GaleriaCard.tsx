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
}: GaleriaCardProps) {
  const { permissions } = usePlan();
  const [upsellFeature, setUpsellFeature] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const canViewLeads = permissions.canCaptureLeads;
  const { navigate, isNavigating } = useNavigation();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState({ url: '', whatsapp: '', message: '' });
  const [isImageLoading, setIsImageLoading] = useState(true);

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

  if (viewMode === 'list') {
    return (
      <div
        onClick={() =>
          !isBulkMode && links.url && window.open(links.url, '_blank')
        }
        className={`group relative flex items-center gap-4 overflow-hidden rounded-luxury border border-petroleum/40 bg-white p-3 transition-all w-full animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both hover:border-petroleum/70 ${
          isBulkMode ? 'cursor-default' : 'cursor-pointer'
        } ${isSelected && isBulkMode ? 'ring-2 ring-gold border-gold' : ''}`}
        style={{ animationDelay: `${index * 30}ms` }}
      >
        {isBulkMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(galeria.id);
            }}
            className="p-1.5 bg-white border border-petroleum/30 rounded-luxury hover:bg-slate-50 transition-colors shrink-0"
          >
            {isSelected ? (
              <CheckSquare
                size={16}
                className="text-gold"
                fill="currentColor"
              />
            ) : (
              <Square size={16} className="text-slate-400" />
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
          <img
            ref={imgRef}
            src={imageUrl}
            alt={galeria.title}
            onError={handleError}
            onLoad={onImageLoad}
            className={`h-full w-full object-cover transition-all duration-500 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
          />
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
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {currentView === 'active' && (
              <>
                <button
                  onClick={handleWhatsAppShare}
                  className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum"
                  title="WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isNavigating) handleEditClick(e);
                  }}
                  disabled={isNavigating}
                  className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                {mounted && (
                  <button
                    onClick={handleCopy}
                    className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum"
                    title="Link"
                  >
                    {copied ? (
                      <Check
                        size={16}
                        className="text-green-500 animate-in zoom-in"
                      />
                    ) : (
                      <Link2 size={16} />
                    )}
                  </button>
                )}
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
                      'Gerando relatório...',
                    );
                  }}
                  className={`p-2 bg-white border border-petroleum/40 rounded-luxury flex items-center justify-center transition-all ${!canViewLeads ? 'text-petroleum/30 grayscale hover:border-gold' : 'text-petroleum interactive-luxury-petroleum'}`}
                  disabled={
                    canViewLeads &&
                    (isNavigating ||
                      !(
                        galeria.leads_enabled || (galeria.leads_count ?? 0) > 0
                      ))
                  }
                >
                  {canViewLeads ? (
                    <Users size={16} />
                  ) : (
                    <div className="relative">
                      <Users size={16} className="opacity-40" />
                      <Lock
                        size={8}
                        className="absolute -top-1 -right-1 text-gold"
                      />
                    </div>
                  )}
                </button>
              </>
            )}
            {/* Alinhamento à Direita via Flex Container */}
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
        className={`group relative flex flex-col overflow-hidden rounded-luxury border border-petroleum/40 bg-white transition-all w-full animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both hover:border-petroleum/70 ${isBulkMode ? 'cursor-default' : 'cursor-pointer'} ${isSelected && isBulkMode ? 'ring-2 ring-gold border-gold' : ''}`}
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
              className="absolute top-2 left-2 z-30 p-1.5 bg-petroleum/80 backdrop-blur-md rounded-luxury border border-white/10 hover:bg-petroleum transition-colors"
            >
              {isSelected ? (
                <CheckSquare
                  size={16}
                  className="text-gold"
                  fill="currentColor"
                />
              ) : (
                <Square size={16} className="text-white/70" />
              )}
            </button>
          )}

          {isImageLoading && !isUpdating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
              <div className="loading-luxury-dark w-6 h-6" />
            </div>
          )}

          <img
            ref={imgRef}
            src={imageUrl}
            alt={galeria.title}
            onError={handleError}
            onLoad={onImageLoad}
            className={`h-full w-full object-cover transition-all duration-1000 ease-out group-hover:scale-110 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
          />
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

        <div className="flex flex-col p-3 space-y-2 bg-white">
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
            <div className="flex-1 flex items-center h-8 rounded-luxury bg-slate-50 border border-petroleum/20 overflow-hidden">
              <a
                href={`https://drive.google.com/drive/folders/${galeria.drive_folder_id}`}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center gap-1.5 px-2.5 h-full hover:bg-white transition-all group/drive min-w-0"
              >
                <FolderOpen
                  size={13}
                  className="text-editorial-gray shrink-0"
                />
                <span className="text-[10px] font-medium text-editorial-gray truncate">
                  Drive: {galeria.drive_folder_name || 'Sem pasta vinculada'}
                </span>
                <span className="text-editorial-label text-petroleum-light opacity-0 group-hover/drive:opacity-100 transition-opacity shrink-0">
                  Abrir
                </span>
              </a>
              <div className="w-[1px] h-3 bg-petroleum/10" />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSync();
                }}
                disabled={isUpdating}
                className="flex items-center justify-center px-2.5 h-full hover:bg-white text-editorial-gray hover:text-gold transition-all disabled:opacity-50 shrink-0"
              >
                {isUpdating ? (
                  <div className="loading-luxury w-3 h-3" />
                ) : (
                  <RefreshCw size={12} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 md:p-2.5 bg-slate-50/50 border-t border-petroleum/10 mt-auto">
          <div className="flex gap-2 md:gap-1.5 flex-1">
            {currentView === 'active' && (
              <>
                <button
                  onClick={handleWhatsAppShare}
                  className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum"
                  title="WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isNavigating) handleEditClick(e);
                  }}
                  disabled={isNavigating}
                  className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                {mounted && (
                  <button
                    onClick={handleCopy}
                    className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum"
                    title="Link"
                  >
                    {copied ? (
                      <Check
                        size={16}
                        className="text-green-500 animate-in zoom-in"
                      />
                    ) : (
                      <Link2 size={16} />
                    )}
                  </button>
                )}
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
                      'Gerando relatório...',
                    );
                  }}
                  className={`p-2 bg-white border border-petroleum/40 rounded-luxury flex items-center justify-center transition-all ${!canViewLeads ? 'text-petroleum/30 grayscale hover:border-gold' : 'text-petroleum interactive-luxury-petroleum'}`}
                  disabled={
                    canViewLeads &&
                    (isNavigating ||
                      !(
                        galeria.leads_enabled || (galeria.leads_count ?? 0) > 0
                      ))
                  }
                >
                  {canViewLeads ? (
                    <Users size={16} />
                  ) : (
                    <div className="relative">
                      <Users size={16} className="opacity-40" />
                      <Lock
                        size={8}
                        className="absolute -top-1 -right-1 text-gold"
                      />
                    </div>
                  )}
                </button>
              </>
            )}
            {/* Alinhamento à Direita via Flex-1 e justify-end no container pai ou div específica */}
            <div className="flex-1 flex justify-end">
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
        featureName="Cadastro de visitantes"
        featureKey="canCaptureLeads"
        scenarioType="feature"
      />
    </>
  );
}
