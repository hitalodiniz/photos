'use client';

import {
  Calendar,
  MapPin,
  User,
  Pencil,
  Trash2,
  FolderOpen,
  Loader2,
  Check,
  Copy,
  Inbox,
  Archive,
  XCircle,
  ShieldCheck,
  Eye,
  Users,
  RefreshCw,
  UserRound,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Galeria } from '@/core/types/galeria';
import { GALLERY_CATEGORIES } from '@/constants/categories';
import {
  getPublicGalleryUrl,
  copyToClipboard,
  RESOLUTIONS,
} from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { GALLERY_MESSAGES } from '@/constants/messages';
import { executeShare } from '@/core/utils/share-helper';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { normalizePhoneNumber } from '@/core/utils/masks-helpers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import GaleriaContextMenu from '@/components/dashboard/GaleriaContextMenu';

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
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState({ url: '', whatsapp: '', message: '' });
  // 🎯 Estado para controlar o carregamento da imagem de capa
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (galeria && mounted) {
      const publicUrl = getPublicGalleryUrl(galeria.photographer, galeria.slug);
      const message = GALLERY_MESSAGES.LUXURY_SHARE(
        galeria.client_name,
        galeria.title,
        galeria.date,
        publicUrl,
      );
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

  const { imgSrc: imageUrl, handleError, handleLoad } = useGoogleDriveImage({
    photoId: galeria.cover_image_url || '',
    width: RESOLUTIONS.THUMB,
    priority: index < 4,
    fallbackToProxy: false,
    useProxyDirectly: true,
  });

  // Função para unificar o load da imagem
  const onImageLoad = () => {
    setIsImageLoading(false);
    handleLoad();
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!links.message) return;
    const success = await copyToClipboard(links.message);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

  // Modo Lista: Layout horizontal
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => {
          if (!isBulkMode && links.url) {
            window.open(links.url, '_blank');
          }
        }}
        className={`group relative flex items-center gap-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-3 transition-all duration-300 hover:shadow-lg hover:shadow-gold/10 w-full animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both hover:border-gold/50 ${
          isBulkMode ? 'cursor-default' : 'cursor-pointer'
        } ${isSelected && isBulkMode ? 'ring-2 ring-gold border-gold' : ''}`}
        style={{ animationDelay: `${index * 30}ms` }}
      >
        {/* Checkbox de seleção em lote - Modo Lista */}
        {isBulkMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(galeria.id);
            }}
            className="p-1.5 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 transition-colors shrink-0"
          >
            {isSelected ? (
              <CheckSquare size={16} className="text-gold" fill="currentColor" />
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

        {/* Imagem - Compacta */}
        <div className="relative w-24 h-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
          {isImageLoading && !isUpdating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
              <LoadingSpinner size="xs" />
            </div>
          )}
          <img
            src={imageUrl}
            alt={galeria.title}
            loading={index < 4 ? 'eager' : 'lazy'}
            decoding="async"
            onError={handleError}
            onLoad={onImageLoad}
            className={`h-full w-full object-cover transition-all duration-500 ${
              isImageLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 mb-1 truncate">
              {galeria.title}
            </h3>
            {/* Metadados em uma linha */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDateSafely(galeria.date)}
              </span>
              {galeria.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {galeria.location}
                </span>
              )}
            </div>
          </div>

          {/* Ações - Apenas Compartilhar e Editar visíveis */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentView === 'active' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWhatsAppShare(e);
                  }}
                  className="p-2 text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-emerald-50 transition-colors"
                  title="Compartilhar via WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(galeria);
                  }}
                  className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-900 hover:text-white transition-all"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
              </>
            )}
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

  // Modo Grid: Layout original (simplificado)
  return (
    <div
      onClick={() => {
        if (!isBulkMode && links.url) {
          window.open(links.url, '_blank');
        }
      }}
      className={`group relative flex flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white transition-all duration-300 hover:shadow-2xl hover:shadow-gold/15 w-full animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both ${
        isBulkMode ? 'cursor-default' : 'cursor-pointer'
      } ${isSelected && isBulkMode ? 'ring-2 ring-gold border-gold' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {(isUpdating || isDeleting) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      )}

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        {/* Checkbox de seleção em lote - Modo Grid */}
        {isBulkMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(galeria.id);
            }}
            className="absolute top-2 left-2 z-30 p-1.5 bg-white/90 backdrop-blur-sm rounded-md border border-slate-200 shadow-lg hover:bg-white transition-colors"
          >
            {isSelected ? (
              <CheckSquare size={18} className="text-gold" fill="currentColor" />
            ) : (
              <Square size={18} className="text-slate-400" />
            )}
          </button>
        )}

        {/* 🎯 Spinner de carregamento da imagem */}
        {isImageLoading && !isUpdating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
            <LoadingSpinner size="xs" />
          </div>
        )}

        <img
          src={imageUrl}
          alt={galeria.title}
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding="async"
          onError={handleError}
          onLoad={onImageLoad}
          className={`h-full w-full object-cover transition-all duration-1000 ease-out group-hover:scale-110 ${
            isImageLoading ? 'opacity-0' : 'opacity-100'
          }`}
        />

        <div className="absolute top-3 left-3 flex gap-2">
          <span
            title={
              !galeria.is_public
                ? 'Acesso restrito via senha'
                : 'Acesso público liberado'
            }
            className="flex items-center justify-center w-8 h-8 bg-black/40 backdrop-blur-md rounded-full border border-white/20 shadow-lg transition-all hover:bg-black/60"
          >
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
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded text-[8px] font-semibold tracking-widest text-white border border-gold/40 uppercase shadow-sm">
              <span className="text-champagne leading-none">
                {categoryInfo.icon}
              </span>
              {categoryInfo.label}
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-4">
          <h3 className="text-white text-base font-semibold leading-tight tracking-tight drop-shadow-md">
            {galeria.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-col p-4 space-y-3">
        {/* Metadados simplificados em uma linha */}
        <div className="flex items-center gap-3 text-xs text-slate-500 py-1">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {formatDateSafely(galeria.date)}
          </span>
          {galeria.location && (
            <>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {galeria.location}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center h-9 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden">
            <a
              href={`https://drive.google.com/drive/folders/${galeria.drive_folder_id}`}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center gap-2 px-3 h-full hover:bg-white transition-all group/drive min-w-0"
            >
              <FolderOpen size={14} className="text-gold shrink-0" />
              <span className="text-[11px] font-medium text-slate-600 truncate">
                {galeria.drive_folder_name || 'Pasta do Drive'}
              </span>
              <span className="text-[9px] font-bold text-gold uppercase tracking-widest opacity-0 group-hover/drive:opacity-100 transition-opacity shrink-0">
                Abrir
              </span>
            </a>

            <div className="w-[1px] h-4 bg-slate-200" />

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSync();
              }}
              disabled={isUpdating}
              title="Sincronizar com o Drive"
              className="flex items-center justify-center px-3 h-full hover:bg-white text-slate-400 hover:text-gold transition-all disabled:opacity-50 shrink-0"
            >
              {isUpdating ? (
                <Loader2 size={13} className="animate-spin text-gold" />
              ) : (
                <RefreshCw size={13} />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-slate-50/50 border-t border-slate-100 mt-auto">
        {/* Apenas Compartilhar e Editar visíveis */}
        <div className="flex gap-1.5">
          {currentView === 'active' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleWhatsAppShare(e);
                }}
                className="p-2 text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-emerald-50 transition-colors"
                title="Compartilhar via WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(galeria);
                }}
                className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-900 hover:text-white transition-all"
                title="Editar"
              >
                <Pencil size={16} />
              </button>
            </>
          )}
        </div>

        {/* Menu de Contexto */}
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
  );
}