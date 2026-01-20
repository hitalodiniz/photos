'use client';
import React, { useState, useEffect } from 'react';
import { Heart, Download, Loader2, X, Link as LinkIcon, Check, Play, Pause } from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { executeShare, getCleanSlug } from '@/core/utils/share-helper';
import { GALLERY_MESSAGES } from '@/constants/messages';
import { handleDownloadPhoto } from '@/core/utils/foto-helpers';

let hasShownWarningThisSession = false;

interface VerticalActionBarProps {
  photoId: string | number;
  gallerySlug: string;
  galleryTitle: string;
  galeria: any;
  activeIndex: number;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  isSlideshowActive: boolean;
  onToggleSlideshow: () => void;
  onClose?: () => void;
  showClose?: boolean;
}

export function VerticalActionBar({
  photoId,
  gallerySlug,
  galleryTitle,
  galeria,
  activeIndex,
  isFavorited,
  onToggleFavorite,
  isSlideshowActive,
  onToggleSlideshow,
  onClose,
  showClose = true,
}: VerticalActionBarProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showQualityWarning, setShowQualityWarning] = useState(false);

  // Mostrar tooltip de alta resolução na primeira vez
  useEffect(() => {
    if (!hasShownWarningThisSession) {
      const timer = setTimeout(() => {
        setShowQualityWarning(true);
        hasShownWarningThisSession = true;
      }, 1000); // Aparece após 1 segundo
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCopyLink = async () => {
    const cleanSlug = getCleanSlug(gallerySlug);
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${cleanSlug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const handleWhatsApp = () => {
    const cleanSlug = getCleanSlug(gallerySlug);
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${cleanSlug}`;
    const shareText = GALLERY_MESSAGES.PHOTO_SHARE(galleryTitle, shareUrl);
    executeShare({ title: galleryTitle, text: shareText, url: shareUrl });
  };

  const handleNativeShare = async () => {
    const cleanSlug = getCleanSlug(gallerySlug);
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${cleanSlug}`;
    const shareText = GALLERY_MESSAGES.PHOTO_SHARE(galleryTitle, shareUrl);

    if (navigator.share) {
      try {
        await navigator.share({
          title: galleryTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
      }
    } else {
      executeShare({ title: galleryTitle, text: shareText, url: shareUrl });
    }
  };

  return (
    <div
      className="fixed top-1/2 z-[240] flex flex-col gap-3 bg-black/95 backdrop-blur-2xl p-3 rounded-[0.5rem] border border-white/20 shadow-2xl transition-all duration-700"
      style={{ 
        right: '112px', // Entre o botão de navegação (96px) e as miniaturas (0px)
        transform: 'translateY(-50%)',
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. FAVORITAR */}
      {showClose && (
        <button
          onClick={onToggleFavorite}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all group relative"
          aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <div
            className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
              isFavorited ? 'bg-[#E67E70]' : 'bg-white/5 group-hover:bg-[#E67E70]'
            }`}
          >
            <Heart
              fill={isFavorited ? 'white' : 'none'}
              size={20}
              className="text-white"
              strokeWidth={2}
            />
          </div>
          {/* Tooltip */}
          <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            <div className="bg-[#F3E5AB] text-black text-[10px] font-semibold px-2 py-1 rounded shadow-xl">
              {isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            </div>
          </div>
        </button>
      )}

      {/* 2. WHATSAPP */}
      <button
        onClick={handleWhatsApp}
        className="w-12 h-12 rounded-full bg-white/5 hover:bg-[#25D366] flex items-center justify-center transition-all group relative"
        aria-label="Compartilhar no WhatsApp"
      >
        <WhatsAppIcon className="text-white w-5 h-5" />
        {/* Tooltip */}
        <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <div className="bg-[#F3E5AB] text-black text-[10px] font-semibold px-2 py-1 rounded shadow-xl">
            WhatsApp
          </div>
        </div>
      </button>

      {/* 3. COPIAR LINK */}
      <button
        onClick={handleCopyLink}
        className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all group relative"
        aria-label="Copiar link"
      >
        {copied ? (
          <Check size={20} className="text-[#F3E5AB]" strokeWidth={2} />
        ) : (
          <LinkIcon size={20} className="text-white" strokeWidth={2} />
        )}
        {/* Tooltip */}
        <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <div className="bg-[#F3E5AB] text-black text-[10px] font-semibold px-2 py-1 rounded shadow-xl">
            {copied ? 'Link copiado!' : 'Copiar link'}
          </div>
        </div>
      </button>

      {/* 4. SLIDESHOW */}
      {showClose && (
        <button
          onClick={onToggleSlideshow}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all group relative ${
            isSlideshowActive ? 'bg-[#F3E5AB]' : 'bg-white/5 hover:bg-white/10'
          }`}
          aria-label={isSlideshowActive ? 'Pausar slideshow' : 'Iniciar slideshow'}
        >
          {isSlideshowActive ? (
            <Pause size={20} className="text-black" strokeWidth={2} />
          ) : (
            <Play size={20} className="text-white" strokeWidth={2} />
          )}
          {/* Tooltip */}
          <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            <div className="bg-[#F3E5AB] text-black text-[10px] font-semibold px-2 py-1 rounded shadow-xl">
              {isSlideshowActive ? 'Pausar slideshow' : 'Iniciar slideshow'}
            </div>
          </div>
        </button>
      )}

      {/* 5. DOWNLOAD */}
      <div className="relative">
        {showQualityWarning && (
          <div 
            className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-[10000] w-64 animate-in fade-in slide-in-from-left-4 duration-700"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="absolute left-full top-1/2 -translate-y-1/2 border-[8px] border-transparent border-l-[#F3E5AB] pointer-events-none" />
            <div 
              className="bg-[#F3E5AB] shadow-2xl rounded-[0.5rem] p-4 border border-white/20 text-black relative"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[11px] uppercase tracking-tighter">
                  Alta Resolução Disponível
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowQualityWarning(false);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="opacity-40 hover:opacity-100 cursor-pointer transition-opacity relative z-[10001]"
                  style={{ pointerEvents: 'auto' }}
                  aria-label="Fechar tooltip"
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] leading-tight font-medium">
                Esta é uma versão otimizada. Para obter o{' '}
                <strong>arquivo original em alta definição</strong>, clique no
                botão de download acima.
              </p>
            </div>
          </div>
        )}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            setIsDownloading(true);
            setShowQualityWarning(false);
            await handleDownloadPhoto(galeria, photoId, activeIndex);
            setIsDownloading(false);
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all group relative"
          aria-label="Baixar foto"
          disabled={isDownloading}
          type="button"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {showQualityWarning && (
              <div className="absolute -inset-1 rounded-full bg-[#F3E5AB] animate-ping opacity-80" />
            )}
            <div
              className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
                showQualityWarning
                  ? 'bg-[#F3E5AB] text-black'
                  : 'bg-white/5 hover:bg-white/10 text-white'
              }`}
            >
              {isDownloading ? (
                <Loader2 className="animate-spin" size={20} strokeWidth={2} />
              ) : (
                <Download size={20} strokeWidth={2} />
              )}
            </div>
          </div>
          {/* Tooltip */}
          {!showQualityWarning && (
            <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              <div className="bg-[#F3E5AB] text-black text-[10px] font-semibold px-2 py-1 rounded shadow-xl">
                Baixar foto
              </div>
            </div>
          )}
        </button>
      </div>

    </div>
  );
}
