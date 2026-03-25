'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Download,
  Loader2,
  X,
  Link as LinkIcon,
  Check,
  Play,
  Pause,
  Camera,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { getCleanSlug } from '@/core/utils/share-helper';
import { handleDownloadPhoto } from '@/core/utils/foto-helpers';

interface VerticalActionBarProps {
  handleShare: () => void;
  photoId: string | number;
  photoName?: string; // 🎯 Nova prop
  gallerySlug: string;
  galleryTitle: string;
  galeria: any;
  canUseFavorites: boolean;
  canUseSlideshow: boolean;
  activeIndex: number;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  isSlideshowActive: boolean;
  onToggleSlideshow: () => void;
  onClose?: () => void;
  showClose?: boolean;
  hasShownQualityWarning?: boolean; // 🎯 Controlado pelo Lightbox
  onQualityWarningShown?: () => void; // 🎯 Callback quando o tooltip é mostrado
  mode: 'selection' | 'favorite';
}

export function VerticalActionBar({
  handleShare,
  photoId,
  photoName,
  canUseFavorites,
  canUseSlideshow,
  gallerySlug,
  galleryTitle,
  galeria,
  activeIndex,
  isFavorited,
  onToggleFavorite,
  isSlideshowActive,
  onToggleSlideshow,
  showClose = true,
  hasShownQualityWarning = false,
  onQualityWarningShown,
  mode,
}: VerticalActionBarProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showQualityWarning, setShowQualityWarning] = useState(false);
  const endTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🎯 Mostrar tooltip de alta resolução apenas na primeira vez que o lightbox abre
  useEffect(() => {
    if (!hasShownQualityWarning && onQualityWarningShown) {
      startTimerRef.current = setTimeout(() => {
        setShowQualityWarning(true);
        onQualityWarningShown(); // Notifica o Lightbox que o tooltip foi mostrado
      }, 1000); // Aparece após 1 segundo

      return () => {
        if (startTimerRef.current) {
          clearTimeout(startTimerRef.current);
          startTimerRef.current = null;
        }
      };
    }
  }, [hasShownQualityWarning, onQualityWarningShown]);

  // 🎯 Fechar tooltip automaticamente após 7 segundos quando ele aparecer
  useEffect(() => {
    if (showQualityWarning) {
      // Limpar qualquer timer anterior
      if (endTimerRef.current) {
        clearTimeout(endTimerRef.current);
      }

      // Iniciar timer de 7 segundos para fechar
      endTimerRef.current = setTimeout(() => {
        setShowQualityWarning(false);
        endTimerRef.current = null;
      }, 7000);

      return () => {
        if (endTimerRef.current) {
          clearTimeout(endTimerRef.current);
          endTimerRef.current = null;
        }
      };
    }
  }, [showQualityWarning]);

  // 🎯 Fechar tooltip quando a foto muda (se ainda estiver visível)
  useEffect(() => {
    if (showQualityWarning) {
      // Limpar o timer de fechamento automático se existir
      if (endTimerRef.current) {
        clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
      setShowQualityWarning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId]);

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

  return (
    <div
      className="fixed top-1/2 z-[250] flex flex-col gap-3 bg-white/95 dark:bg-black/95 backdrop-blur-2xl p-3 rounded-luxury border border-black/20 dark:border-white/20 shadow-2xl transition-all duration-700"
      style={{
        right: '112px', // Entre o botão de navegação (96px) e as miniaturas (0px)
        transform: 'translateY(-50%)',
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. FAVORITAR */}
      {showClose && canUseFavorites && (
        <button
          onClick={onToggleFavorite}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all group relative"
          aria-label={
            isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
          }
        >
          <div
            className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
              isFavorited
                ? 'bg-red-600'
                : 'bg-black/5 dark:bg-white/5 group-hover:bg-[rgb(var(--pub-bar-bg))]'
            }`}
          >
            {mode === 'selection' ? (
              <Check
                size={20}
                className={`transition-colors duration-300 ${
                  isFavorited
                    ? ''
                    : 'text-black dark:text-white group-hover:text-[rgb(var(--pub-bar-icon))]'
                }`}
              />
            ) : (
              <Heart
                fill={isFavorited ? 'currentColor' : 'none'}
                size={20}
                className={`transition-colors duration-300 ${
                  isFavorited
                    ? 'text-white'
                    : 'text-black dark:text-white group-hover:text-[rgb(var(--pub-bar-icon))]'
                }`}
              />
            )}
          </div>
          {/* Tooltip Dinâmico */}
          <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            <div className="pub-bar-bg pub-bar-text text-[10px] font-semibold px-2 py-1 rounded shadow-xl border pub-bar-drawer-border">
              {mode === 'selection'
                ? isFavorited
                  ? 'Remover da seleção'
                  : 'Selecionar'
                : isFavorited
                  ? 'Remover dos favoritos'
                  : 'Adicionar aos favoritos'}
            </div>
          </div>
        </button>
      )}

      {/* 2. WHATSAPP */}
      <button
        onClick={handleShare}
        className="btn-luxury-base w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 hover:bg-[#25D366] hover:border-[#25D366] group relative transition-all"
        aria-label="Compartilhar no WhatsApp"
      >
        <WhatsAppIcon className="text-black dark:text-white group-hover:text-white w-5 h-5 transition-colors duration-300" />
        {/* Tooltip */}
        <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <div className="pub-bar-bg pub-bar-text text-[10px] font-semibold px-2 py-1 rounded shadow-xl tracking-normal normal-case border pub-bar-drawer-border">
            Compartilhar no WhatsApp
          </div>
        </div>
      </button>

      {/* 3. COPIAR LINK */}
      <button
        onClick={handleCopyLink}
        className="btn-luxury-base w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 hover:bg-[rgb(var(--pub-bar-bg))] group relative transition-all"
        aria-label="Copiar link"
      >
        {copied ? (
          <Check
            size={20}
            className="pub-bar-accent transition-colors duration-300"
            strokeWidth={2}
          />
        ) : (
          <LinkIcon
            size={20}
            className="text-black dark:text-white group-hover:text-[rgb(var(--pub-bar-icon))] transition-colors duration-300"
            strokeWidth={2}
          />
        )}
        {/* Tooltip */}
        <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <div className="pub-bar-bg pub-bar-text text-[10px] font-semibold px-2 py-1 rounded shadow-xl tracking-normal normal-case border pub-bar-drawer-border">
            {copied ? 'Link copiado!' : 'Copiar link'}
          </div>
        </div>
      </button>

      {/* 4. SLIDESHOW */}
      {showClose && canUseSlideshow && (
        <button
          onClick={onToggleSlideshow}
          className={`btn-luxury-base w-12 h-12 rounded-full group relative transition-all ${
            isSlideshowActive
              ? 'pub-bar-control-active'
              : 'bg-black/5 dark:bg-white/5 hover:bg-[rgb(var(--pub-bar-bg))]'
          }`}
          aria-label={
            isSlideshowActive ? 'Pausar slideshow' : 'Iniciar slideshow'
          }
        >
          {isSlideshowActive ? (
            <Pause
              size={20}
              className="transition-colors duration-300"
              strokeWidth={2}
            />
          ) : (
            <Play
              size={20}
              className="text-black dark:text-white group-hover:text-[rgb(var(--pub-bar-icon))] transition-colors duration-300"
              strokeWidth={2}
            />
          )}
          {/* Tooltip */}
          <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            <div className="pub-bar-bg pub-bar-text text-[10px] font-semibold px-2 py-1 rounded shadow-xl tracking-normal normal-case border pub-bar-drawer-border">
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
            <div
              className="absolute left-full top-1/2 -translate-y-1/2 border-[8px] border-transparent 
            border-l-[rgb(var(--pub-bar-cta-bg))] pointer-events-none"
            />
            <div
              className="pub-bar-btn-cta shadow-2xl rounded-luxury p-4 border pub-bar-drawer-border relative"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[11px] uppercase tracking-luxury-tight">
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
                  className="opacity-40 cursor-pointer transition-opacity relative z-[10001]"
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
            await handleDownloadPhoto(galeria, photoId, activeIndex, photoName);
            setIsDownloading(false);
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all group relative"
          aria-label="Baixar"
          disabled={isDownloading}
          type="button"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {showQualityWarning && (
              <div className="absolute -inset-1 rounded-full bg-[rgb(var(--pub-bar-cta-bg))] animate-ping opacity-80" />
            )}
            <div
              className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
                showQualityWarning
                  ? 'pub-bar-btn-cta'
                  : 'bg-black/5 dark:bg-white/5 group-hover:bg-[rgb(var(--pub-bar-bg))]'
              }`}
            >
              {isDownloading ? (
                <Loader2
                  className={`animate-spin ${showQualityWarning ? '' : 'text-black dark:text-white group-hover:text-[rgb(var(--pub-bar-icon))]'}`}
                  size={20}
                  strokeWidth={2}
                />
              ) : (
                <Download
                  size={20}
                  strokeWidth={2}
                  className={
                    showQualityWarning
                      ? ''
                      : 'text-black dark:text-white group-hover:text-[rgb(var(--pub-bar-icon))]'
                  }
                />
              )}
            </div>
          </div>
          {/* Tooltip */}
          {!showQualityWarning && (
            <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              <div className="pub-bar-bg pub-bar-text text-[10px] font-semibold px-2 py-1 rounded shadow-xl border pub-bar-drawer-border">
                Baixar
              </div>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
