'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Loader2,
  Link as LinkIcon,
  Check,
  Heart,
  X,
  Share2,
  Play,
  Pause,
  SquareStack,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { executeShare, getCleanSlug } from '@/core/utils/share-helper';
import { GALLERY_MESSAGES } from '@/constants/messages';
import { handleDownloadPhoto } from '@/core/utils/foto-helpers';
import { div } from 'framer-motion/client';

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
  isMobile = false,
  isSlideshowActive = false,
  onToggleSlideshow,
  showThumbnails = false,
  onToggleThumbnails,
  hasShownQualityWarning = false, // 🎯 Controlado pelo Lightbox
  onQualityWarningShown, // 🎯 Callback quando o tooltip é mostrado
}: any) => {
  const [showQualityWarning, setShowQualityWarning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!hasShownQualityWarning);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null); // 🎯 Ref para controlar timers
  const startTimerRef = useRef<NodeJS.Timeout | null>(null); // 🎯 Ref para o timer de início
  const hasTriggeredWarningRef = useRef(false); // 🎯 Ref para evitar múltiplas execuções
  const isMountedRef = useRef(true); // 🎯 Ref para verificar se componente está montado
  const hasShownQualityWarningRef = useRef(hasShownQualityWarning); // 🎯 Ref para valor atual
  const onQualityWarningShownRef = useRef(onQualityWarningShown); // 🎯 Ref para callback

  // Atualiza refs quando valores mudam
  useEffect(() => {
    hasShownQualityWarningRef.current = hasShownQualityWarning;
    onQualityWarningShownRef.current = onQualityWarningShown;
  }, [hasShownQualityWarning, onQualityWarningShown]);

  // 🎯 Mostrar tooltip de alta resolução apenas na primeira vez que o lightbox abre
  // Este useEffect executa apenas uma vez na montagem inicial (quando isMobile é true)
  useEffect(() => {
    // Debug logs
    console.log('[ToolbarGalleryView] useEffect de inicialização executado:', {
      isMobile,
      hasShownQualityWarning: hasShownQualityWarningRef.current,
      hasTriggeredWarningRef: hasTriggeredWarningRef.current,
      showQualityWarning,
      onQualityWarningShown: !!onQualityWarningShown,
      isMounted: isMountedRef.current,
    });

    // 🎯 REGRA: Se não for mobile, não faz nada
    if (!isMobile) {
      console.log('[ToolbarGalleryView] ⚠️ Não é mobile, ignorando');
      return;
    }

    // Se já foi mostrado no Lightbox, não faz nada
    if (hasShownQualityWarningRef.current) {
      console.log('[ToolbarGalleryView] ⚠️ Já foi mostrado no Lightbox, ignorando');
      return;
    }

    // Se já foi acionado, não executa novamente
    if (hasTriggeredWarningRef.current) {
      console.log('[ToolbarGalleryView] ⚠️ Já foi acionado, ignorando');
      return;
    }

    // Se chegou aqui, é mobile e ainda não mostrou
    console.log('[ToolbarGalleryView] ✅ Iniciando timers para mostrar tooltip (MOBILE)');
    hasTriggeredWarningRef.current = true; // Marca como acionado usando ref
    isMountedRef.current = true;
    
    // Limpa timers anteriores se existirem (segurança)
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    
    // Timer para mostrar o tooltip após 1 segundo
    startTimerRef.current = setTimeout(() => {
      console.log('[ToolbarGalleryView] ⏰ Timer de início executado, isMounted:', isMountedRef.current, 'hasShown:', hasShownQualityWarningRef.current);
      if (isMountedRef.current && !hasShownQualityWarningRef.current) {
        console.log('[ToolbarGalleryView] ⏰ Mostrando tooltip agora');
        setShowQualityWarning(true);
      } else {
        console.log('[ToolbarGalleryView] ⚠️ Não mostrando tooltip - componente desmontado ou já mostrado');
      }
    }, 1000);
    
    // Timer para esconder o tooltip após 8 segundos
    warningTimerRef.current = setTimeout(() => {
      console.log('[ToolbarGalleryView] ⏰ Timer de fim executado, isMounted:', isMountedRef.current);
      if (isMountedRef.current) {
        console.log('[ToolbarGalleryView] ⏰ Escondendo tooltip agora');
        setShowQualityWarning(false);
        setIsExpanded(false);
        // Só agora notifica o Lightbox que o tooltip foi mostrado
        if (onQualityWarningShownRef.current) {
          console.log('[ToolbarGalleryView] 📢 Notificando Lightbox que tooltip foi mostrado');
          onQualityWarningShownRef.current();
        }
      }
    }, 8000);

    // Cleanup: NÃO limpa os timers aqui - deixa eles executarem
    // Os timers só serão limpos quando o componente realmente desmontar
    return () => {
      console.log('[ToolbarGalleryView] 🧹 Cleanup do useEffect de inicialização (componente desmontando)');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 🎯 Executa apenas UMA VEZ na montagem inicial (isMobile é estável)

  // 🎯 useEffect separado para reagir a mudanças em hasShownQualityWarning
  useEffect(() => {
    // Atualiza o ref quando o valor muda
    hasShownQualityWarningRef.current = hasShownQualityWarning;
    
    // Se foi marcado como mostrado, esconde o tooltip imediatamente
    if (hasShownQualityWarning) {
      console.log('[ToolbarGalleryView] ⚠️ hasShownQualityWarning mudou para true, escondendo tooltip');
      // Limpa timers se ainda estiverem ativos
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      // Atualiza estado - necessário quando hasShownQualityWarning muda externamente
      // Este setState é intencional para sincronizar o estado local com a prop externa
      setShowQualityWarning(false);
      setIsExpanded(false);
    }
  }, [hasShownQualityWarning]);

  // Cleanup quando componente realmente desmonta
  useEffect(() => {
    return () => {
      console.log('[ToolbarGalleryView] 🧹 Componente desmontando REALMENTE - limpando timers');
      isMountedRef.current = false;
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      // Reset para permitir nova tentativa na próxima montagem
      hasTriggeredWarningRef.current = false;
    };
  }, []); // Só executa no unmount

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${getCleanSlug(gallerySlug)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 🎯 Função para compartilhamento nativo no mobile (Web Share API)
  const handleNativeShare = async () => {
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${getCleanSlug(gallerySlug)}`;
    const shareText = GALLERY_MESSAGES.PHOTO_SHARE(galleryTitle, shareUrl);

    // Verifica se a Web Share API está disponível
    if (navigator.share) {
      try {
        await navigator.share({
          title: galleryTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // Usuário cancelou ou erro no compartilhamento
        if ((error as Error).name !== 'AbortError') {
          console.error('Erro ao compartilhar:', error);
          // Fallback: copia o link para a área de transferência
          handleCopyLink();
        }
      }
    } else {
      // Fallback: se não suportar Web Share API, copia o link
      handleCopyLink();
    }
  };

  const textContainerClass = `hidden md:flex flex-col items-start leading-tight transition-all duration-500 overflow-hidden ${
    isExpanded ? 'opacity-100 max-w-[120px] ml-1.5' : 'opacity-0 max-w-0 ml-0'
  }`;

  // Debug: Log para verificar renderização mobile e mudanças de estado
  useEffect(() => {
    if (isMobile) {
      console.log('[ToolbarGalleryView] 🔍 Estado atual (MOBILE):', {
        showQualityWarning,
        hasShownQualityWarning,
        hasTriggeredWarningRef: hasTriggeredWarningRef.current,
        willRenderTooltip: showQualityWarning,
      });
    }
  }, [isMobile, showQualityWarning, hasShownQualityWarning]);

  // 🎯 VERSÃO MOBILE: Barra fixa na parte inferior com botão de compartilhamento nativo
  if (isMobile) {
    return (
      <div className="w-full flex items-center justify-around" data-mobile-toolbar>
        {/* 1. FAVORITAR */}
        {showClose && (
          <button
            onClick={onToggleFavorite}
            className="flex-1 flex items-center justify-center py-3 active:scale-95 transition-all touch-manipulation"
            aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isFavorited ? 'bg-[#E67E70]' : 'bg-slate-200 dark:bg-white/10'}`}
            >
              <Heart
                fill={isFavorited ? 'white' : 'none'}
                size={22}
                className={isFavorited ? 'text-white' : 'text-slate-700 dark:text-white'}
                strokeWidth={2.5}
              />
            </div>
          </button>
        )}

        {/* 2. MINIATURAS (Toggle - Estilo Instagram) */}
        {showClose && onToggleThumbnails && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleThumbnails();
            }}
            className="flex-1 flex items-center justify-center py-3 active:scale-95 transition-all touch-manipulation"
            aria-label={showThumbnails ? 'Ocultar miniaturas' : 'Mostrar miniaturas'}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showThumbnails ? 'bg-[#F3E5AB]' : 'bg-slate-200 dark:bg-white/10 active:bg-slate-300 dark:active:bg-white/20'}`}>
              <SquareStack size={22} className={showThumbnails ? 'text-black' : 'text-slate-700 dark:text-white'} strokeWidth={2.5} />
            </div>
          </button>
        )}

        {/* 3. COMPARTILHAR (Share nativo - abre menu com WhatsApp, Instagram, Twitter, etc.) */}
        <button
          onClick={handleNativeShare}
          className="flex-1 flex items-center justify-center py-3 active:scale-95 transition-all touch-manipulation"
          aria-label="Compartilhar foto"
        >
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center active:bg-slate-300 dark:active:bg-white/20 transition-all">
            <Share2 size={22} className="text-slate-700 dark:text-white" strokeWidth={2.5} />
          </div>
        </button>

        {/* 4. SLIDESHOW (Play/Pause) */}
        {showClose && onToggleSlideshow && (
          <button
            onClick={onToggleSlideshow}
            className="flex-1 flex items-center justify-center py-3 active:scale-95 transition-all touch-manipulation"
            aria-label={isSlideshowActive ? 'Pausar slideshow' : 'Iniciar slideshow'}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSlideshowActive ? 'bg-[#F3E5AB]' : 'bg-slate-200 dark:bg-white/10 active:bg-slate-300 dark:active:bg-white/20'}`}>
              {isSlideshowActive ? (
                <Pause size={22} className="text-black" strokeWidth={2.5} />
              ) : (
                <Play size={22} className="text-slate-700 dark:text-white" strokeWidth={2.5} />
              )}
            </div>
          </button>
        )}

        {/* 5. DOWNLOAD */}
        <div className="relative flex-1 flex items-center justify-center" style={{ overflow: 'visible' }}>
          {showQualityWarning && (
            <div 
              data-quality-warning="true"
              className="absolute z-[10001] left-1/2 -translate-x-1/2"
              style={{ 
                pointerEvents: 'auto',
                opacity: 1,
                visibility: 'visible',
                position: 'absolute',
                bottom: 'calc(100% + 12px)', // Acima do botão de download
                width: 'min(240px, calc(100vw - 6rem))', // Largura com margem generosa (6rem total = 3rem de cada lado)
                maxWidth: 'calc(100vw - 6rem)', // Garante margem de 3rem de cada lado para dar respiro
                willChange: 'transform', // Otimiza performance
                display: 'block', // Força display block
              }}
              ref={(el) => {
                if (el) {
                  console.log('[ToolbarGalleryView] 🎯 Tooltip renderizado no DOM:', {
                    element: el,
                    computedStyle: window.getComputedStyle(el),
                    offsetHeight: el.offsetHeight,
                    offsetWidth: el.offsetWidth,
                  });
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {/* Seta apontando para baixo - centralizada */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#F3E5AB] pointer-events-none" />
              
              {/* Tooltip - Sem animações que causam piscar */}
              <div 
                data-quality-warning="true"
                className="bg-[#F3E5AB] shadow-2xl rounded-[0.5rem] border border-white/20 text-black relative w-ful pr-6"
                style={{ 
                  pointerEvents: 'auto',
                  transform: 'translateZ(0)', // Força aceleração de hardware
                  opacity: 1,
                  visibility: 'visible',
                  position: 'relative', // Garante posicionamento relativo
                  boxSizing: 'border-box', // Garante que padding não aumente o tamanho
                  padding: '0.5rem', // p-3 padrão
                  marginRight: '2rem',
                  wordWrap: 'break-word', // Quebra palavras longas
                  overflowWrap: 'break-word', // Quebra palavras se necessário
                  hyphens: 'auto', // Adiciona hífens quando necessário
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchCancel={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div className="flex justify-between items-center gap-2 mb-1.5">
                  <span className="font-bold text-[10px] uppercase tracking-tighter flex-1 leading-tight">
                    Alta Resolução Disponível
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowQualityWarning(false);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowQualityWarning(false);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="opacity-40 hover:opacity-100 active:opacity-100 cursor-pointer transition-opacity relative z-[10001] touch-manipulation shrink-0 flex items-center justify-center"
                    style={{ 
                      pointerEvents: 'auto',
                      minWidth: '32px',
                      minHeight: '32px',
                    }}
                    aria-label="Fechar tooltip"
                    type="button"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
                <p className="text-[10px] leading-tight font-medium break-words hyphens-auto">
                  Esta é uma versão otimizada. Para obter o{' '}
                  <strong>arquivo original em alta definição</strong>, clique no
                  botão de download abaixo.
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
            className="flex-1 flex items-center justify-center py-3 active:scale-95 transition-all touch-manipulation relative"
            aria-label="Baixar foto"
            disabled={isDownloading}
          >
            <div className="relative w-12 h-12">
              {showQualityWarning && (
                <div className="absolute -inset-1 rounded-full bg-[#F3E5AB] animate-ping opacity-80" />
              )}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                showQualityWarning ? 'bg-[#F3E5AB]' : 'bg-slate-200 dark:bg-white/10 active:bg-slate-300 dark:active:bg-white/20'
              }`}>
                {isDownloading ? (
                  <Loader2 className={`animate-spin ${showQualityWarning ? 'text-black' : 'text-slate-700 dark:text-white'}`} size={22} strokeWidth={2.5} />
                ) : (
                  <Download size={22} className={showQualityWarning ? 'text-black' : 'text-slate-700 dark:text-white'} strokeWidth={2.5} />
                )}
              </div>
            </div>
          </button>
        </div>

        {/* 6. FECHAR - Botão maior conforme boas práticas de usabilidade */}
        {showClose && (
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center py-3 active:scale-95 transition-all touch-manipulation"
            aria-label="Fechar galeria"
            style={{
              // Tamanho conforme boas práticas: 60x60px (acima do mínimo de 48x48px)
              minWidth: '60px',
              minHeight: '60px',
            }}
          >
            <div 
              className="rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center active:bg-slate-300 dark:active:bg-white/20 transition-all"
              style={{
                // Área de toque de 60x60px para melhor usabilidade (acima do mínimo de 48x48px)
                width: '60px',
                height: '60px',
                minWidth: '60px',
                minHeight: '60px',
              }}
            >
              <X size={26} className="text-slate-700 dark:text-white" strokeWidth={2.5} />
            </div>
          </button>
        )}
      </div>
    );
  }

  // 🎯 VERSÃO DESKTOP: Toolbar original no topo (direita) - com hover e expansão
  return (
    <div
      className="relative z-[300] flex items-center bg-black/95 backdrop-blur-2xl p-2 px-3 rounded-[0.5rem] border border-white/20 shadow-2xl transition-all duration-700 mx-4"
      onMouseEnter={() => !isMobile && setIsExpanded(true)}
      onMouseLeave={() => !isMobile && setIsExpanded(false)}
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

      {/* 4. SLIDESHOW (Play/Pause) - Desktop */}
      {showClose && onToggleSlideshow && (
        <div className="relative">
          <button
            onClick={onToggleSlideshow}
            onMouseEnter={() => setActiveTooltip('slideshow')}
            onMouseLeave={() => setActiveTooltip(null)}
            className="flex items-center border-r border-white/10 pr-3 mx-1 shrink-0 group"
          >
            <div className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all ${isSlideshowActive ? 'bg-[#F3E5AB] text-black' : 'bg-white/5 text-white group-hover:bg-white group-hover:text-black'}`}>
              {isSlideshowActive ? (
                <Pause size={18} />
              ) : (
                <Play size={18} />
              )}
            </div>
            <div className={textContainerClass}>
              <span className="text-[10px] md:text-[11px]  font-semibold uppercase tracking-wider mb-1 text-white">
                {isSlideshowActive ? 'Pausar' : 'Slideshow'}
              </span>
              <span className="text-[9px] md:text-[10px]  opacity-80 text-white/70 whitespace-nowrap">
                {isSlideshowActive ? 'Parar' : 'Automático'}
              </span>
            </div>
          </button>
          {activeTooltip === 'slideshow' && (
            <Tooltip text={isSlideshowActive ? 'Pausar slideshow' : 'Iniciar slideshow automático'} />
          )}
        </div>
      )}

      {/* 5. DOWNLOAD */}
      <div className="relative flex items-center shrink-0">
        {showQualityWarning && (
          /* 🎯 Ajustamos de left-1/2 para left-auto e right-0 (ou um valor negativo leve) */
          /* O -translate-x-4 garante que o box não "fuja" da tela no mobile */
          <div className="absolute top-full mt-4 right-[-10px] md:right-0 z-[1001] w-64 md:w-80 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* 🎯 A Seta: Posicionada fixamente sob o centro do botão de download */}
            {/* No desktop, o botão tem 44px (w-11), então a seta deve estar a 22px da direita */}
            <div className="absolute bottom-full right-[23px] md:right-[95px] border-[8px] border-transparent border-b-[#F3E5AB]" />

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
                    if (onQualityWarningShown) {
                      onQualityWarningShown();
                    }
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
            {showQualityWarning && isMobile && (
              <div className="absolute inset-0 rounded-full bg-[#F3E5AB] animate-ping opacity-80" />
            )}
            <div
              className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all ${showQualityWarning && isMobile ? 'bg-[#F3E5AB] text-black' : 'bg-white/5 text-white group-hover:bg-white group-hover:text-black'}`}
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
            className={`flex items-center ${isMobile ? 'flex-1 justify-center py-3' : 'pl-2 shrink-0'} group active:scale-95 transition-all touch-manipulation`}
            aria-label="Fechar galeria"
            style={{
              // Garante tamanho mínimo de toque: 44x44px (WCAG) ou 48x48dp (Material Design)
              minWidth: isMobile ? '48px' : 'auto',
              minHeight: isMobile ? '48px' : 'auto',
            }}
          >
            <div
              className={`${isMobile ? 'w-12 h-12' : 'w-9 h-9 md:w-11 md:h-11'} rounded-full flex items-center justify-center transition-all bg-white/5 text-white group-hover:bg-white group-hover:text-black`}
              style={{
                // Garante área de toque mínima mesmo no mobile
                minWidth: isMobile ? '48px' : undefined,
                minHeight: isMobile ? '48px' : undefined,
              }}
            >
              <X size={isMobile ? 22 : 18} strokeWidth={isMobile ? 2.5 : 2} />
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
