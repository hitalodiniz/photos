'use client';
import React, {
  memo,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Heart, HeartOff, Loader2 } from 'lucide-react';
import 'photoswipe/dist/photoswipe.css';
import { Gallery, Item } from 'react-photoswipe-gallery';
import { Galeria } from '@/core/types/galeria';
import {
  getHighResImageUrl,
  getDirectGoogleUrl,
  RESOLUTIONS,
} from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { handleDownloadPhoto } from '@/core/utils/foto-helpers';

import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { GridPhotoActions } from './GridPhotoActions';
import { useSupabaseSession, authService } from '@photos/core-auth';
import { useShare } from '@/hooks/useShare';

// --- TIPOS ---

interface Photo {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  tag?: string;
  canUseFavorites: boolean;
}

interface SafeImageProps {
  photoId: string;
  width: number;
  height: number;
  priority: boolean;
  className?: string;
  onImageDimensionsDetected?: (width: number, height: number) => void;
  mode: 'public' | 'admin';
  index?: number;
}

interface MasonryItemProps {
  photo: Photo;
  index: number;
  galleryTitle: string;
  galeria: Galeria;
  favorites: string[];
  toggleFavoriteFromGrid: (id: string) => void;
  setSelectedPhotoIndex: (index: number) => void;
  handleShareWhatsAppGrid: (photoId: string) => void;
  handleNativeShareGrid: (photoId: string) => void;
  handleCopyLinkGrid: (photoId: string) => void;
  btnScale: number;
  iconSize: number;
  isMobile: boolean;
  currentCols: number;
  isSelected: boolean;
  columnWidth: number;
  canUseFavorites: boolean;
  tagSelectionMode: 'manual' | 'bulk' | 'drive';
  mode?: 'public' | 'admin';
  isMouseDown: boolean;
  setIsMouseDown: (value: boolean) => void;
  handleSelect: (index: number, shiftKey: boolean) => void;
}

interface MasonryGridProps {
  galleryTitle: string;
  galeria: Galeria;
  displayedPhotos: Photo[];
  favorites: string[];
  toggleFavoriteFromGrid: (id: string) => void;
  setSelectedPhotoIndex: (index: number) => void;
  showOnlyFavorites: boolean;
  setShowOnlyFavorites: (value: boolean) => void;
  columns: { mobile: number; tablet: number; desktop: number };
  canUseFavorites: boolean;
  tagSelectionMode: 'manual' | 'bulk' | 'drive';
  mode?: 'public' | 'admin'; // define se mostra 'Coração' ou 'Marcação'
  availableTags?: string[]; //pílulas de tags do fotógrafo
  onAssignTag?: (ids: string[], tag: string) => void; // callback para o banco
}

// --- COMPONENTE DE IMAGEM OTIMIZADO ---

const SafeImage = memo(
  ({
    photoId,
    width,
    height,
    priority,
    className,
    onImageDimensionsDetected,
    index = 0,
    mode,
  }: SafeImageProps) => {
    const [imageSize, setImageSize] = useState<string | null>(null);
    const [realResolution, setRealResolution] = useState<{
      w: number;
      h: number;
    } | null>(null);
    const [userAuthenticated, setUserAuthenticated] = useState<boolean>(false);
    const localImgRef = useRef<HTMLImageElement | null>(null);

    const searchParams = useSearchParams();
    const showDebugForce = searchParams.get('v') === 's';

    const { isAuthenticated, isLoading: authLoading } = useSupabaseSession();

    const {
      imgSrc,
      isLoaded,
      isLoading,
      handleError,
      handleLoad,
      imgRef,
      usingProxy,
    } = useGoogleDriveImage({
      photoId,
      width: '500',
      priority,
      fallbackToProxy: true,
      index, // 🎯 Passando o index para o delay do hook
    });

    const combinedRef = useCallback(
      (img: HTMLImageElement | null) => {
        localImgRef.current = img;
        imgRef(img);
      },
      [imgRef],
    );

    useEffect(() => {
      if (!authLoading) {
        setUserAuthenticated(isAuthenticated);
      }
    }, [isAuthenticated, authLoading]);

    useEffect(() => {
      const subscription = authService.onAuthStateChange((_event, session) => {
        setUserAuthenticated(!!session?.user);
      });
      return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
      let cancelled = false;

      const handleMetadata = async () => {
        const hasPermission = showDebugForce || userAuthenticated;

        // 🎯 AJUSTE CRÍTICO: Se for modo admin (organizador de fotos),
        // cancelamos a busca de metadados em massa para economizar requisições.
        /// Isso remove 50% das requisições que causam o 429.
        if (!hasPermission || !imgSrc || !isLoaded || mode === 'admin') {
          if (!cancelled) {
            setImageSize(null);
            setRealResolution(null);
          }
          return;
        }

        try {
          // Mesmo no público, vamos dar um fôlego para o Google
          await new Promise((resolve) => setTimeout(resolve, index * 20));
          if (cancelled) return;

          if (cancelled) return;

          const response = await fetch(imgSrc, {
            method: 'HEAD',
            mode: 'cors',
            cache: 'force-cache',
          });

          const size = response.headers.get('content-length');

          if (!cancelled) {
            if (size) {
              const kb = parseInt(size, 10) / 1024;
              setImageSize(
                kb > 1024
                  ? `${(kb / 1024).toFixed(1)}MB`
                  : `${Math.round(kb)}KB`,
              );
            } else {
              setImageSize('OK');
            }
          }
        } catch {
          if (!cancelled) setImageSize('---');
        }

        if (!cancelled && localImgRef.current) {
          const checkRes = () => {
            if (localImgRef.current?.naturalWidth) {
              if (!cancelled) {
                setRealResolution({
                  w: localImgRef.current.naturalWidth,
                  h: localImgRef.current.naturalHeight,
                });
              }
            } else if (!cancelled) {
              setTimeout(checkRes, 100);
            }
          };
          checkRes();
        }
      };

      handleMetadata();
      return () => {
        cancelled = true;
      };
    }, [
      imgSrc,
      isLoaded,
      userAuthenticated,
      showDebugForce,
      photoId,
      mode,
      index,
    ]);

    const onInternalLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      if (onImageDimensionsDetected) {
        onImageDimensionsDetected(naturalWidth, naturalHeight);
      }
      handleLoad();
    };

    return (
      <div className="relative w-full h-full overflow-hidden bg-white/5">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <LoadingSpinner size="xs" />
          </div>
        )}

        {imgSrc && (
          <img
            ref={combinedRef}
            src={imgSrc}
            onLoad={onInternalLoad}
            onError={handleError}
            alt=""
            className={`${className} object-cover w-full h-full transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ position: 'absolute', inset: 0 }}
          />
        )}

        {isLoaded && imageSize && (userAuthenticated || showDebugForce) && (
          <div
            className="absolute bottom-1.5 left-1.5 z-[30] bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1.5 shadow-lg"
            title={`Resolução: ${realResolution?.w}x${realResolution?.h}px | Origem: ${usingProxy ? 'Servidor' : 'Drive'}`}
          >
            <span
              className={`text-[9px] font-bold ${usingProxy ? 'text-blue-400' : 'text-green-500'}`}
            >
              {usingProxy ? 'A' : 'D'}
            </span>
            <span className="text-champagne text-[9px] font-mono font-medium">
              {imageSize}
            </span>
          </div>
        )}
      </div>
    );
  },
);

SafeImage.displayName = 'SafeImage';

// --- COMPONENTE MASONRY ITEM ---

const MasonryItem = memo(
  ({
    photo,
    index,
    galleryTitle,
    galeria,
    favorites,
    toggleFavoriteFromGrid,
    setSelectedPhotoIndex,
    handleShareWhatsAppGrid,
    handleNativeShareGrid,
    handleCopyLinkGrid,
    btnScale,
    iconSize,
    isMobile,
    currentCols,
    isSelected,
    columnWidth,
    canUseFavorites,
    tagSelectionMode,
    mode,
    isMouseDown,
    setIsMouseDown,
    handleSelect,
  }: MasonryItemProps & { isDragging?: boolean }) => {
    const [orientation, setOrientation] = useState({
      isPortrait: photo.height > photo.width,
      realW: photo.width,
      realH: photo.height,
      hasDetected: false,
    });

    const thumbUrl = getDirectGoogleUrl(photo.id, RESOLUTIONS.THUMB);
    const fullUrl = getHighResImageUrl(photo.id);

    // 🎯 Callback para corrigir dimensões invertidas vindas da API
    const onDimensionsDetected = useCallback(
      (realW: number, realH: number) => {
        const isPortrait = realH > realW;

        // Só atualiza se houver discordância com os metadados da API ou se for a primeira detecção
        setOrientation((prev) => {
          if (
            prev.hasDetected &&
            prev.isPortrait === isPortrait &&
            prev.realW === realW
          )
            return prev;

          // if (prev.isPortrait !== isPortrait) {
          //   console.log(
          //     `📸 Correção na Foto ${index}: API dizia ${prev.isPortrait ? 'Retrato' : 'Paisagem'}, Imagem é ${isPortrait ? 'Retrato' : 'Paisagem'}.`,
          //   );
          // }

          return {
            isPortrait,
            realW,
            realH,
            hasDetected: true,
          };
        });
      },
      [index],
    );

    // 🎯 Cálculo de span ultra-preciso (1 row = 1px)
    const rowSpan = useMemo(() => {
      if (!columnWidth) return 'span 200';

      const ratio = orientation.realH / orientation.realW;
      const span = Math.floor(columnWidth * ratio);

      return `span ${span}`;
    }, [orientation.realH, orientation.realW, columnWidth]);

    return (
      <Item
        original={fullUrl}
        thumbnail={thumbUrl}
        width={orientation.realW}
        height={orientation.realH}
        caption={`${galleryTitle} - Foto ${index + 1}`}
      >
        {({ ref }) => (
          <div
            id={`grid-item-${photo.id}`}
            className="relative group transition-all duration-500 overflow-hidden"
            style={{
              gridRow: rowSpan,
              padding: '1px',
            }}
            // 🎯 Captura o início do clique para seleção ou início de arrasto
            onMouseDown={(e) => {
              if (mode === 'admin') {
                // e.button === 0 garante que é o clique esquerdo
                if (e.button === 0) {
                  setIsMouseDown(true);
                  handleSelect(index, e.shiftKey);
                }
              }
            }}
            onMouseEnter={() => {
              // 🎯 O Masonry reordena os itens, mas o index passado via props
              // sempre refere-se à posição correta no array.
              if (mode === 'admin' && isMouseDown && !isSelected) {
                handleSelect(index, false);
              }
            }}
          >
            <div
              className={`w-full h-full relative overflow-hidden border transition-all duration-500 rounded-none bg-white/5 ${
                isSelected && mode === 'admin'
                  ? 'border-gold ring-2 ring-gold/50 shadow-2xl z-20'
                  : 'border-black/5 ring-1 ring-white/10 shadow-sm hover:shadow-xl'
              }`}
            >
              <a
                href="#"
                ref={ref as any}
                onClick={(e) => {
                  e.preventDefault();
                  // 🎯 Se estiver em modo bulk (Admin), o clique seleciona/deseleciona
                  if (mode === 'public') {
                    // Modo normal: abre seu Lightbox customizado
                    setSelectedPhotoIndex(index);
                  }
                }}
                className={`block relative w-full h-full ${
                  mode === 'admin' ? 'cursor-pointer' : 'cursor-zoom-in'
                }`}
              >
                <SafeImage
                  photoId={photo.id}
                  width={photo.width}
                  height={photo.height}
                  priority={index < 10}
                  className="relative z-10"
                  onImageDimensionsDetected={onDimensionsDetected}
                  mode={mode}
                />

                {/* 🎯 Badge de Tag Existente (Refatorado) */}
                {photo.tag && (
                  <div
                    className="absolute z-30 flex items-center justify-center backdrop-blur-md border border-white/10 rounded-full shadow-sm pointer-events-none"
                    style={{
                      // Reduzi o posicionamento para acompanhar a escala menor
                      top: isMobile ? '5px' : '8px',
                      right: isMobile ? '5px' : '8px',
                      // Reduzi base de 10px para 8px (20% menor)
                      paddingLeft: `${8 * btnScale}px`,
                      paddingRight: `${8 * btnScale}px`,
                      // Reduzi base de 24px para 20px (aprox. 20% menor)
                      height: `${20 * btnScale}px`,
                      backgroundColor: 'rgba(0, 0, 0, 0.2)', // Levemente mais transparente para sutileza
                    }}
                  >
                    <span
                      className="text-white font-medium whitespace-nowrap leading-none tracking-tight"
                      style={{
                        // Reduzi base de 11px para 9px e mobile de 9px para 8px
                        fontSize:
                          isMobile && currentCols === 2
                            ? '8px'
                            : `${9 * btnScale}px`,
                      }}
                    >
                      {photo.tag}
                    </span>
                  </div>
                )}

                {/* 🎯 Check de Seleção Estilo Google Fotos */}
                {mode === 'admin' && (
                  <div
                    className={`absolute inset-0 transition-all duration-300 z-20 ${
                      isSelected
                        ? 'bg-gold/10'
                        : 'bg-transparent group-hover:bg-black/10'
                    }`}
                  >
                    <div
                      className={`absolute top-3 left-3 p-1 rounded-full border-2 transition-all ${
                        isSelected
                          ? 'bg-champagne border-champagne text-petroleum scale-110'
                          : 'bg-white/20 border-white/40 text-transparent group-hover:text-white/60'
                      }`}
                    >
                      <Check size={12} strokeWidth={4} />
                    </div>
                  </div>
                )}
              </a>
              {mode === 'public' && (
                <GridPhotoActions
                  canUseFavorites={canUseFavorites}
                  isFavorited={isSelected}
                  onToggleFavorite={() => toggleFavoriteFromGrid(photo.id)}
                  onShareWhatsApp={() => handleShareWhatsAppGrid(photo.id)}
                  onNativeShare={() => handleNativeShareGrid(photo.id)}
                  onCopyLink={() => handleCopyLinkGrid(photo.id)}
                  onDownload={() =>
                    handleDownloadPhoto(galeria, photo.id, index, photo.name)
                  }
                  btnScale={btnScale}
                  iconSize={iconSize}
                  isMobile={isMobile}
                  currentCols={currentCols}
                />
              )}
            </div>
          </div>
        )}
      </Item>
    );
  },
);

MasonryItem.displayName = 'MasonryItem';

// --- MASONRY GRID PRINCIPAL ---

const MasonryGrid = ({
  mode = 'public',
  availableTags = [],
  onAssignTag,
  galleryTitle,
  galeria,
  displayedPhotos,
  favorites,
  toggleFavoriteFromGrid,
  setSelectedPhotoIndex,
  showOnlyFavorites,
  setShowOnlyFavorites,
  columns,
  canUseFavorites,
  tagSelectionMode = 'manual',
}: MasonryGridProps) => {
  const CARDS_PER_PAGE = 50;
  const [displayLimit, setDisplayLimit] = useState(CARDS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(0);

  // 🎯 Sincronização precisa de colunas para o MasonryItem
  const [currentCols, setCurrentCols] = useState(columns.mobile);
  const [isMobile, setIsMobile] = useState(false);

  // seleção em bloco de fotos
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );
  const [isMouseDown, setIsMouseDown] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width < 768) setCurrentCols(columns.mobile);
      else if (width < 1280) setCurrentCols(Math.min(5, columns.tablet));
      else setCurrentCols(Math.min(8, columns.desktop));
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, [columns]);

  // 🎯 Medição da largura real do container para cálculos precisos
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      setGridWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 🎯 Cálculo simplificado da largura da coluna (o padding interno do item fará o gap visual)
  const columnWidth = useMemo(() => {
    if (!gridWidth) return 0;
    return gridWidth / currentCols;
  }, [gridWidth, currentCols]);

  const allLoaded = showOnlyFavorites || displayLimit >= displayedPhotos.length;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          displayLimit < displayedPhotos.length &&
          !showOnlyFavorites
        ) {
          setDisplayLimit((prev) =>
            Math.min(prev + CARDS_PER_PAGE, displayedPhotos.length),
          );
        }
      },
      { rootMargin: '0px 0px 400px 0px', threshold: 0.01 },
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [displayLimit, displayedPhotos.length, showOnlyFavorites]);

  const { sharePhoto, copyLink, copied } = useShare({ galeria });

  const handleShareWhatsAppGrid = (photoId: string) => {
    sharePhoto(photoId);
  };

  const handleNativeShareGrid = async (photoId: string) => {
    await sharePhoto(photoId);
  };

  const handleCopyLinkGrid = (photoId: string) => {
    copyLink(photoId);
  };

  const btnScale = isMobile
    ? currentCols === 2
      ? 0.8
      : 1
    : currentCols <= 4
      ? 1
      : Math.max(0.6, 1 - (currentCols - 4) * 0.1);
  const iconSize = Math.round(18 * btnScale);

  const limitedPhotos = useMemo(() => {
    // Se o plano/galeria não permite favoritos, ignoramos o filtro de showOnlyFavorites
    const finalPhotos =
      showOnlyFavorites && canUseFavorites ? displayedPhotos : displayedPhotos;

    return showOnlyFavorites ? finalPhotos : finalPhotos.slice(0, displayLimit);
  }, [showOnlyFavorites, canUseFavorites, displayedPhotos, displayLimit]);

  // Função para tratar seleção em lote (Shift)
  const handleSelect = useCallback(
    (index: number, shiftKey: boolean) => {
      const photoId = displayedPhotos[index].id;

      if (shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);

        // Pega o intervalo baseado na posição do ARRAY original (única forma consistente)
        const rangeIds = displayedPhotos.slice(start, end + 1).map((p) => p.id);

        // 🎯 AJUSTE: Garante que estamos ADICIONANDO ao que já existia,
        // sem remover seleções manuais fora do intervalo
        rangeIds.forEach((id) => {
          if (!favorites.includes(id)) {
            toggleFavoriteFromGrid(id);
          }
        });
      } else {
        toggleFavoriteFromGrid(photoId);
      }
      setLastSelectedIndex(index);
    },
    [displayedPhotos, favorites, lastSelectedIndex, toggleFavoriteFromGrid],
  );
  // Adicione os listeners globais de mouse para o drag
  useEffect(() => {
    const handleMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="w-full h-auto">
      {showOnlyFavorites && displayedPhotos.length === 0 ? (
        <div className="text-center py-10 md:py-20 px-4 animate-in fade-in duration-700">
          <Heart size={48} className="text-champagne mb-4 mx-auto opacity-80" />
          <p
            className={`italic text-[14px] md:text-[18px] mb-8 transition-colors duration-500
                text-gray-600`}
          >
            Nenhuma foto favorita selecionada
          </p>
          <button
            onClick={() => setShowOnlyFavorites(false)}
            className="mx-auto px-6 py-2.5 rounded-luxury bg-champagne text-black
             hover:bg-white border border-champagne transition-all uppercase text-[10px] font-semibold tracking-luxury-widest shadow-lg"
          >
            Exibir todas as fotos
          </button>
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto px-1" ref={gridContainerRef}>
          <Gallery withCaption>
            <div
              className={`w-full transition-all duration-700 grid grid-flow-row-dense ${
                mode === 'admin' ? 'select-none touch-none' : ''
              }`}
              style={{
                gridTemplateColumns: `repeat(${currentCols}, 1fr)`,
                gridAutoRows: '1px',
                gap: 0,
              }}
              // Segurança extra para resetar o mouse caso ele saia do grid
              onMouseLeave={() => setIsMouseDown(false)}
            >
              {limitedPhotos.map((photo, index) => (
                <MasonryItem
                  key={photo.id}
                  photo={photo}
                  index={index}
                  mode={mode}
                  isSelected={favorites.includes(photo.id)}
                  galleryTitle={galleryTitle}
                  galeria={galeria}
                  favorites={favorites}
                  toggleFavoriteFromGrid={toggleFavoriteFromGrid}
                  setSelectedPhotoIndex={setSelectedPhotoIndex}
                  handleShareWhatsAppGrid={handleShareWhatsAppGrid}
                  handleNativeShareGrid={handleNativeShareGrid}
                  handleCopyLinkGrid={handleCopyLinkGrid}
                  btnScale={btnScale}
                  iconSize={iconSize}
                  isMobile={isMobile}
                  currentCols={currentCols}
                  columnWidth={columnWidth}
                  canUseFavorites={galeria.enable_favorites}
                  tagSelectionMode={tagSelectionMode}
                  isMouseDown={isMouseDown}
                  setIsMouseDown={setIsMouseDown}
                  handleSelect={handleSelect}
                />
              ))}
            </div>
          </Gallery>

          {!showOnlyFavorites && (
            <div className="w-full">
              {!allLoaded && (
                <div className="flex justify-center py-10">
                  <Loader2
                    className="animate-spin text-champagne opacity-50"
                    size={32}
                  />
                </div>
              )}
              <div ref={sentinelRef} className="h-2 w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MasonryGrid;
