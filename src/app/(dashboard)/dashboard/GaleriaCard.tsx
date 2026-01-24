'use client';

import {
  Calendar,
  MapPin,
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
import { executeShare } from '@/core/utils/share-helper';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import GaleriaContextMenu from '@/components/dashboard/GaleriaContextMenu';
import { useNavigation } from '@/components/providers/NavigationProvider';
import { Users } from 'lucide-react';

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
  const { navigate, isNavigating } = useNavigation();
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

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    
    // 🎯 Se começar com 55 e tiver 12 ou 13 dígitos, remove o DDI
    if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
      cleaned = cleaned.substring(2);
    }

    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const hasClientInfo = galeria.client_name && galeria.client_name !== 'Cobertura';

  const { imgSrc: imageUrl, handleError, handleLoad, imgRef } = useGoogleDriveImage({
    photoId: galeria.cover_image_url || '',
    width: RESOLUTIONS.THUMB,
    priority: index < 4,
    fallbackToProxy: false,
    useProxyDirectly: true,
  });

  // Função para unificar o load da imagem
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
    // 🎯 O loading agora é gerenciado pelo Dashboard (index.tsx)
    // via a função onEdit que dispara o redirect global.
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

  // Modo Lista: Layout horizontal
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => {
          if (!isBulkMode && links.url) {
            window.open(links.url, '_blank');
          }
        }}
        className={`group relative flex items-center gap-4 overflow-hidden rounded-luxury border border-petroleum/40 bg-white p-3 transition-all w-full animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both hover:border-petroleum/70 ${
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
            className="p-1.5 bg-white border border-petroleum/30 rounded-luxury hover:bg-slate-50 transition-colors shrink-0"
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
            <h3 className="text-sm font-semibold text-editorial-ink mb-1 truncate">
              {galeria.title}
            </h3>
            {/* Metadados em uma linha */}
            <div className="flex flex-col gap-1.5 w-full">
              <div className={`flex items-center gap-1.5 text-[11px] justify-start ${hasClientInfo ? 'text-editorial-gray' : 'invisible h-[15px]'}`}>
                <User size={11} className="text-editorial-gray shrink-0" />
                <span className="font-medium text-editorial-gray">{galeria.client_name || 'Placeholder'}</span>
                {galeria.client_whatsapp && (
                  <>
                    <span className="text-editorial-gray/40">•</span>
                    <span className="text-editorial-gray">{formatPhone(galeria.client_whatsapp)}</span>
                  </>
                )}
              </div>
              <div className="flex w-full items-center gap-2 text-[11px] text-editorial-gray">
                {galeria.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-editorial-gray" />
                    {galeria.location}
                  </span>
                )}
                {galeria.location && <span className="text-editorial-gray/40">•</span>}
                <span className="flex items-center gap-1">
                  <Calendar size={11} className="text-editorial-gray" />
                  {formatDateSafely(galeria.date)}
                </span>
              </div>
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
                  className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum "
                  title="Compartilhar via WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isUpdating && !isNavigating) {
                      handleEditClick(e);
                    }
                  }}
                  disabled={isUpdating || isNavigating}
                  className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum disabled:opacity-50"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                {mounted && (
                  <button
                    onClick={handleCopy}
                    className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum transition-all flex items-center justify-center"
                    title="Copiar link da galeria"
                  >
                    {copied ? (
                      <Check size={16} className="text-green-500 animate-in zoom-in duration-300" />
                    ) : (
                      <Link2 size={16} />
                    )}
                  </button>
                )}
                {/* 🎯 Lead Report - Sempre visível, desabilitado se não houver leads/ativado */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/galerias/${galeria.id}/leads`, 'Gerando relatório...');
                  }}
                  className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum flex items-center justify-center disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                  title={galeria.leads_enabled || (galeria.leads_count ?? 0) > 0 ? "Ver Leads" : "Captura de Leads desativada"}
                  disabled={isNavigating || !(galeria.leads_enabled || (galeria.leads_count ?? 0) > 0)}
                >
                  <Users size={16} />
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
      className={`group relative flex flex-col overflow-hidden rounded-luxury border border-petroleum/40 bg-white transition-all w-full animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both hover:border-petroleum/70 ${
        isBulkMode ? 'cursor-default' : 'cursor-pointer'
      } ${isSelected && isBulkMode ? 'ring-2 ring-gold border-gold' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {(isUpdating || isDeleting) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      )}

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900/50">
        {/* Checkbox de seleção em lote - Modo Grid */}
        {isBulkMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(galeria.id);
            }}
            className="absolute top-2 left-2 z-30 p-1.5 bg-petroleum/80 backdrop-blur-md rounded-luxury border border-white/10 hover:bg-petroleum transition-colors"
          >
            {isSelected ? (
              <CheckSquare size={18} className="text-gold" fill="currentColor" />
            ) : (
              <Square size={18} className="text-white/40" />
            )}
          </button>
        )}

        {/* 🎯 Spinner de carregamento da imagem */}
        {isImageLoading && !isUpdating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="loading-luxury-dark w-6 h-6" />
          </div>
        )}

        <img
          ref={imgRef}
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

        {/* Gradiente linear suave na base da imagem (transparente para preto 60%) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute top-3 left-3 flex gap-2">
          <span
            title={
              !galeria.is_public
                ? 'Acesso restrito via senha'
                : 'Acesso público liberado'
            }
            className="flex items-center justify-center w-8 h-8 bg-black/40 backdrop-blur-md rounded-full border border-white/10 transition-all hover:bg-black/60 font-[8px]"
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
            <span className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md rounded-luxury text-editorial-label text-white border border-white/20 text-[8px]">
              {categoryInfo.label}
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-4">
          <h3 className="text-white text-[15px] truncate font-semibold leading-tight tracking-tight drop-shadow-md italic">
            {galeria.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-col p-3 md:p-3 space-y-2 bg-white">
        {/* Metadados simplificados em uma linha */}
        <div className="flex flex-col gap-1 py-0.5 w-full">
          <div className={`flex items-center justify-start gap-1.5 text-[11px] text-editorial-gray`}>
            <div className="flex items-center gap-1.5 min-w-0">
              <User size={11} className="text-editorial-gray shrink-0" />
              <span className="font-semibold text-editorial-gray uppercase tracking-luxury truncate">
                {galeria.client_name || 'Cobertura'}
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
            {galeria.location && <span className="text-editorial-gray/40">•</span>}
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
              <FolderOpen size={13} className="text-editorial-gray shrink-0" />
              <span className="text-[10px] font-medium text-editorial-gray truncate  ">
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
              title="Sincronizar com o Drive"
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
        {/* Ações - Apenas Compartilhar e Editar visíveis */}
        <div className="flex gap-2 md:gap-1.5">
          {currentView === 'active' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleWhatsAppShare(e);
                }}
                className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum "
                title="Compartilhar via WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isNavigating) {
                    handleEditClick(e);
                  }
                }}
                disabled={isNavigating}
                className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum  disabled:opacity-50"
                title="Editar"
              >
                <Pencil size={16} />
              </button>
              {mounted && (
                <button
                  onClick={handleCopy}
                  className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum "
                  title="Copiar link da galeria"
                >
                  {copied ? (
                    <Check
                      size={16}
                      className="text-green-500 animate-in zoom-in duration-300"
                    />
                  ) : (
                    <Link2 size={16} />
                  )}
                </button>
              )}
              {/* 🎯 Lead Report - Sempre visível, desabilitado se não houver leads/ativado */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/dashboard/galerias/${galeria.id}/leads`, 'Gerando relatório...');
                }}
                className="p-2 text-petroleum bg-white border border-petroleum/40 rounded-luxury interactive-luxury-petroleum flex items-center justify-center disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                title={galeria.leads_enabled || (galeria.leads_count ?? 0) > 0 ? "Ver Leads" : "Leads não disponíveis"}
                disabled={isNavigating || !(galeria.leads_enabled || (galeria.leads_count ?? 0) > 0)}
              >
                <Users size={16} />
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
