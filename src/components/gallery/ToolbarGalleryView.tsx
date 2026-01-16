'use client';
import React, { useState, useEffect } from 'react';
import {
  Download,
  Loader2,
  Link as LinkIcon,
  Check,
  Heart,
  X,
} from 'lucide-react';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { executeShare, getCleanSlug } from '@/core/utils/share-helper';
import { GALLERY_MESSAGES } from '@/constants/messages';
import { handleDownloadPhoto } from '@/core/utils/foto-helpers';

let hasShownWarningThisSession = false;

const Tooltip = ({ text }: { text: string }) => (
  <div className="hidden md:block absolute -bottom-12 left-1/2 -translate-x-1/2 z-[130] animate-in fade-in zoom-in slide-in-from-top-2 duration-500">
    <div className="bg-[#F3E5AB] text-black text-[9px] md:text-[10px]  font-semibold px-2 py-1 rounded shadow-xl whitespace-nowrap relative ring-1 ring-black/10">
      {text}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-[#F3E5AB]" />
    </div>
  </div>
);

export const ToolbarGalleryView = ({
  photoId,
  gallerySlug,
  galleryTitle,
  galeria,
  activeIndex,
  isFavorited,
  onToggleFavorite,
  onClose,
  showClose = true,
}: any) => {
  const [showQualityWarning, setShowQualityWarning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!hasShownWarningThisSession);

  useEffect(() => {
    if (!hasShownWarningThisSession) {
      const startTimer = setTimeout(() => setShowQualityWarning(true), 1000);
      const endTimer = setTimeout(() => {
        setShowQualityWarning(false);
        setIsExpanded(false);
        hasShownWarningThisSession = true;
      }, 8000);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(endTimer);
      };
    } else {
      setIsExpanded(false);
      setShowQualityWarning(false);
    }
  }, []);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${getCleanSlug(gallerySlug)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const textContainerClass = `hidden md:flex flex-col items-start leading-tight transition-all duration-500 overflow-hidden ${
    isExpanded ? 'opacity-100 max-w-[120px] ml-1.5' : 'opacity-0 max-w-0 ml-0'
  }`;

  return (
    <div
      className="relative z-[300] flex items-center bg-black/80 backdrop-blur-2xl p-2 px-3 rounded-2xl border border-white/20 shadow-2xl transition-all duration-700 mx-4"
      onMouseEnter={() => !showQualityWarning && setIsExpanded(true)}
      onMouseLeave={() => !showQualityWarning && setIsExpanded(false)}
    >
      {/* 1. FAVORITAR */}
      {showClose && ( // para nao exibir na visualização unica de foto
        <div className="relative">
          <button
            onClick={onToggleFavorite}
            onMouseEnter={() => setActiveTooltip('fav')}
            onMouseLeave={() => setActiveTooltip(null)}
            className="flex items-center border-r border-white/10 pr-3 mx-1 shrink-0 group"
          >
            <div
              className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all ${isFavorited ? 'bg-[#E67E70]' : 'bg-white/5 group-hover:bg-[#E67E70]'}`}
            >
              <Heart
                fill={isFavorited ? 'white' : 'none'}
                size={18}
                className="text-white"
              />
            </div>
            <div className={textContainerClass}>
              <span className="text-[10px] md:text-[11px]  font-semibold uppercase tracking-wider mb-1 text-white">
                Favoritar
              </span>
              <span className="text-[9px] md:text-[10px]  opacity-80 text-white/70 whitespace-nowrap">
                {isFavorited ? 'Salvo' : 'Salvar foto'}
              </span>
            </div>
          </button>
          {activeTooltip === 'fav' && (
            <Tooltip
              text={
                isFavorited
                  ? 'Remover dos favoritos'
                  : 'Adicionar aos favoritos'
              }
            />
          )}
        </div>
      )}

      {/* 2. WHATSAPP */}
      <div className="relative">
        <button
          onClick={() => {
            const shareUrl = `${window.location.origin}/photo/${photoId}?s=${getCleanSlug(gallerySlug)}`;
            const shareText = GALLERY_MESSAGES.PHOTO_SHARE(
              galleryTitle,
              shareUrl,
            );
            executeShare({ title: galleryTitle, text: shareText });
          }}
          onMouseEnter={() => setActiveTooltip('whats')}
          onMouseLeave={() => setActiveTooltip(null)}
          className="flex items-center border-r border-white/10 pr-3 mx-1 shrink-0 group"
        >
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#25D366] transition-all">
            <WhatsAppIcon className="text-white w-5 h-5" />
          </div>
          <div className={textContainerClass}>
            <span className="text-[10px] md:text-[11px]  font-semibold uppercase tracking-wider mb-1 text-white">
              WhatsApp
            </span>
            <span className="text-[9px] md:text-[10px]  opacity-80 text-white/70 whitespace-nowrap">
              Compartilhar
            </span>
          </div>
        </button>
        {activeTooltip === 'whats' && <Tooltip text="Enviar por WhatsApp" />}
      </div>

      {/* 3. LINK */}
      <div className="relative">
        <button
          onClick={handleCopyLink}
          onMouseEnter={() => setActiveTooltip('link')}
          onMouseLeave={() => setActiveTooltip(null)}
          className="flex items-center border-r border-white/10 pr-3 mx-1 shrink-0 group"
        >
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
            {copied ? (
              <Check size={18} className="text-[#F3E5AB]" />
            ) : (
              <LinkIcon size={18} className="text-white" />
            )}
          </div>
          <div className={textContainerClass}>
            <span className="text-[10px] md:text-[11px]  font-semibold uppercase tracking-wider mb-1 text-white">
              {copied ? 'Copiado' : 'Link'}
            </span>
            <span className="text-[9px] md:text-[10px]  opacity-80 text-white/70 whitespace-nowrap">
              Copiar URL
            </span>
          </div>
        </button>
        {activeTooltip === 'link' && <Tooltip text="Copiar link da imagem" />}
      </div>

      {/* 4. DOWNLOAD */}
      <div
        className={`relative flex items-center shrink-0 ${showClose ? 'border-r border-white/10 pr-3 mx-1' : ''}`}
      >
        {showQualityWarning && (
          <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 z-[1001] w-64 md:w-80 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-b-[#F3E5AB]" />
            <div className="bg-[#F3E5AB] shadow-2xl rounded-2xl p-4 border border-white/20 text-black">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[11px] uppercase tracking-tighter">
                  Alta Resolução Disponível
                </span>
                <X
                  size={14}
                  className="opacity-40 hover:opacity-100 cursor-pointer"
                  onClick={() => {
                    setShowQualityWarning(false);
                    setIsExpanded(false);
                    hasShownWarningThisSession = true;
                  }}
                />
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
          onClick={async () => {
            setIsDownloading(true);
            setShowQualityWarning(false);
            await handleDownloadPhoto(galeria, photoId, activeIndex);
            setIsDownloading(false);
          }}
          onMouseEnter={() => setActiveTooltip('download')}
          onMouseLeave={() => setActiveTooltip(null)}
          className="flex items-center group relative"
        >
          <div className="relative shrink-0">
            {showQualityWarning && (
              <div className="absolute inset-0 rounded-full bg-[#F3E5AB] animate-ping opacity-80" />
            )}
            <div
              className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all ${showQualityWarning ? 'bg-[#F3E5AB] text-black' : 'bg-white/5 text-white group-hover:bg-white group-hover:text-black'}`}
            >
              {isDownloading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Download size={18} />
              )}
            </div>
          </div>
          <div className={textContainerClass}>
            <span className="text-[10px] md:text-[11px]  font-semibold uppercase tracking-wider mb-1 text-white">
              Download
            </span>
            <span className="text-[9px] md:text-[10px]  opacity-80 text-white/70 whitespace-nowrap">
              Original
            </span>
          </div>
        </button>
        {activeTooltip === 'download' && !showQualityWarning && (
          <Tooltip text="Baixar foto original" />
        )}
      </div>

      {/* 5. FECHAR (GALERIA) */}
      {showClose && (
        <div className="relative">
          <button
            onClick={onClose}
            onMouseEnter={() => setActiveTooltip('close')}
            onMouseLeave={() => setActiveTooltip(null)}
            className="flex items-center pl-2 shrink-0 group"
          >
            <div
              className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all  bg-white/5 text-white group-hover:bg-white group-hover:text-black`}
            >
              <X size={18} />
            </div>
            <div className={textContainerClass}>
              <span className="text-[10px] md:text-[11px]  font-semibold uppercase tracking-wider mb-1 text-white">
                Fechar
              </span>
              <span className="text-[9px] md:text-[10px]  opacity-80 text-white/70 whitespace-nowrap">
                Sair
              </span>
            </div>
          </button>
          {activeTooltip === 'close' && (
            <Tooltip text="Voltar para a galeria" />
          )}
        </div>
      )}
    </div>
  );
};
