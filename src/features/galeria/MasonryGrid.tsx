'use client';
import React, { memo, useEffect, useRef, useState, useCallback, cache } from 'react';
import { useSearchParams } from 'next/navigation';
import { Heart, Loader2, ImageIcon } from 'lucide-react';
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
import { GALLERY_MESSAGES } from '@/constants/messages';
import { getCleanSlug, executeShare } from '@/core/utils/share-helper';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { GridPhotoActions } from './GridPhotoActions';
import { useSupabaseSession, authService } from '@photos/core-auth';

// --- MASONRY GRID PRINCIPAL ---
interface Photo {
  id: string;
  url: string;
  width: number;
  height: number;
  tag?: string;
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
}

const MasonryGrid = ({
  galleryTitle,
  galeria,
  displayedPhotos,
  favorites,
  toggleFavoriteFromGrid,
  setSelectedPhotoIndex,
  showOnlyFavorites,
  setShowOnlyFavorites,
  columns,
}: MasonryGridProps) => {
  const CARDS_PER_PAGE = 50;
  const [displayLimit, setDisplayLimit] = useState(CARDS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const handleShareWhatsAppGrid = (photoId: string) => {
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${getCleanSlug(galeria.slug)}`;
    const shareText = GALLERY_MESSAGES.PHOTO_SHARE(galleryTitle, shareUrl);
    executeShare({ title: galleryTitle, text: shareText });
  };

  // 🎯 Função para compartilhamento nativo no mobile (Web Share API)
  const handleNativeShareGrid = async (photoId: string) => {
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${getCleanSlug(galeria.slug)}`;
    const shareText = GALLERY_MESSAGES.PHOTO_SHARE(galleryTitle, shareUrl);

    // Verifica se a Web Share API está disponível
    if (navigator.share) {
      try {
        await navigator.share({
          title: galleryTitle,
          text: shareText
        });
      } catch (error) {
        // Usuário cancelou ou erro no compartilhamento
        if ((error as Error).name !== 'AbortError') {
          console.error('Erro ao compartilhar:', error);
          // Fallback: copia o link para a área de transferência
          handleCopyLinkGrid(photoId);
        }
      }
    } else {
      // Fallback: se não suportar Web Share API, copia o link
      handleCopyLinkGrid(photoId);
    }
  };

  const handleCopyLinkGrid = (photoId: string) => {
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${getCleanSlug(galeria.slug)}`;
    navigator.clipboard.writeText(shareUrl);
  };

  const currentCols = isMobile ? columns.mobile : columns.desktop;
  const btnScale = isMobile
    ? currentCols === 2
      ? 0.8
      : 1
    : currentCols <= 4
      ? 1
      : Math.max(0.6, 1 - (currentCols - 4) * 0.1);
  const iconSize = Math.round(18 * btnScale);

  const limitedPhotos = showOnlyFavorites
    ? displayedPhotos
    : displayedPhotos.slice(0, displayLimit);

  return (
    <div className="w-full h-auto">
      {showOnlyFavorites && displayedPhotos.length === 0 ? (
        <div className="text-center py-10 md:py-20 px-4 animate-in fade-in duration-700">
          <Heart size={48} className="text-[#D4AF37] mb-4 mx-auto opacity-80" />
          <p className={`italic text-[14px] md:text-[18px] mb-8 transition-colors duration-500 ${
              galeria.grid_bg_color === '#FFFFFF' || galeria.grid_bg_color === '#F3E5AB'
                ? 'text-slate-600' : 'text-white/90'
            }`}>
            Nenhuma foto favorita selecionada
          </p>
          <button
            onClick={() => setShowOnlyFavorites(false)}
            className="mx-auto px-6 py-2.5 rounded-luxury bg-[#D4AF37] text-black hover:bg-white border border-[#D4AF37] transition-all uppercase text-[11px] font-bold tracking-widest shadow-lg"
          >
            Exibir todas as fotos
          </button>
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto px-0 md:px-8 pt-2 pb-2">
          <Gallery withCaption>
            <div className="w-full transition-all duration-700 grid gap-0.5 md:gap-1.5 grid-flow-row-dense"
                 style={{ gridTemplateColumns: `repeat(${columns.mobile}, minmax(0, 1fr))` }}>
              <style jsx>{`
                @media (min-width: 768px) {
                  div { grid-template-columns: repeat(${Math.min(5, columns.tablet)}, minmax(0, 1fr)) !important; }
                }
                @media (min-width: 1280px) {
                  div { grid-template-columns: repeat(${Math.min(8, columns.desktop)}, minmax(0, 1fr)) !important; }
                }
              `}</style>

              {limitedPhotos.map((photo, index) => {
                const isSelected = favorites.includes(photo.id);
                const thumbUrl = getDirectGoogleUrl(photo.id, RESOLUTIONS.THUMB);
                const fullUrl = getHighResImageUrl(photo.id);

                return (
                  <Item
                    key={photo.id}
                    original={fullUrl}
                    thumbnail={thumbUrl}
                    width={photo.width}
                    height={photo.height}
                    caption={`${galleryTitle} - Foto ${index + 1}`}
                  >
                    {({ ref }) => (
                      <div className={`relative group shadow-sm hover:shadow-xl transition-all duration-500 rounded-none overflow-hidden border border-black/5 ring-1 ring-white/10 ${
                          showOnlyFavorites ? 'aspect-square bg-white/5' : photo.height > photo.width ? 'md:row-span-2' : 'row-span-1'
                        }`}>
                        <a href="#" ref={ref as any} onClick={(e) => { e.preventDefault(); setSelectedPhotoIndex(index); }}
                           className="block cursor-zoom-in relative w-full h-full">
                          <SafeImage
                            photoId={photo.id}
                            width={photo.width}
                            height={photo.height}
                            priority={index < 4}
                            showOnlyFavorites={showOnlyFavorites}
                            className="relative z-10"
                          />
                        </a>
                        <GridPhotoActions
                          photoId={photo.id}
                          galleryTitle={galleryTitle}
                          gallerySlug={galeria.slug}
                          isFavorited={isSelected}
                          onToggleFavorite={() => toggleFavoriteFromGrid(photo.id)}
                          onShareWhatsApp={() => handleShareWhatsAppGrid(photo.id)}
                          onNativeShare={() => handleNativeShareGrid(photo.id)}
                          onCopyLink={() => handleCopyLinkGrid(photo.id)}
                          onDownload={() => handleDownloadPhoto(galeria, photo.id, index)}
                          btnScale={btnScale}
                          iconSize={iconSize}
                          isMobile={isMobile}
                          currentCols={currentCols}
                        />
                      </div>
                    )}
                  </Item>
                );
              })}
            </div>
          </Gallery>

          {!showOnlyFavorites && (
            <div className="w-full">
              {!allLoaded && (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-[#F3E5AB] opacity-50" size={32} />
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

// --- COMPONENTE DE IMAGEM OTIMIZADO ---
const SafeImage = memo(({ photoId, width, height, priority, className, showOnlyFavorites }: any) => {
  const [imageSize, setImageSize] = useState<string | null>(null);
  const [realResolution, setRealResolution] = useState<{w: number, h: number} | null>(null);
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
  });

  const combinedRef = useCallback((img: HTMLImageElement | null) => {
    localImgRef.current = img;
    imgRef(img);
  }, [imgRef]);

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

      if (!hasPermission || !imgSrc || !isLoaded) {
        if (!cancelled) {
          setImageSize(null);
          setRealResolution(null);
        }
        return;
      }

      try {
        const response = await fetch(imgSrc, { 
          method: 'HEAD', 
          mode: 'cors',
          cache: 'no-cache' 
        });
        
        const size = response.headers.get('content-length');
        
        if (!cancelled) {
          if (size) {
            const kb = parseInt(size, 10) / 1024;
            setImageSize(kb > 1024 ? `${(kb/1024).toFixed(1)}MB` : `${Math.round(kb)}KB`);
          } else {
            setImageSize("OK");
          }
        }
      } catch {
        if (!cancelled) setImageSize("---");
      }

      if (!cancelled && localImgRef.current) {
        const checkRes = () => {
          if (localImgRef.current?.naturalWidth) {
            if (!cancelled) {
              setRealResolution({
                w: localImgRef.current.naturalWidth,
                h: localImgRef.current.naturalHeight
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
    return () => { cancelled = true; };
  }, [imgSrc, isLoaded, userAuthenticated, showDebugForce, photoId]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-white/5" 
         style={{ aspectRatio: showOnlyFavorites ? '1/1' : `${width}/${height}` }}>
      
      {isLoading && <div className="absolute inset-0 flex items-center justify-center z-10"><LoadingSpinner size="xs" /></div>}

      <img
        ref={combinedRef}
        src={imgSrc}
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} object-cover w-full h-full transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ position: 'absolute', inset: 0 }}
      />

      {isLoaded && imageSize && (userAuthenticated || showDebugForce) && (
        <div 
          className="absolute bottom-1.5 left-1.5 z-[30] bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1.5 shadow-lg"
          title={`Resolução: ${realResolution?.w}x${realResolution?.h}px | Origem: ${usingProxy ? 'Servidor' : 'Drive'}`}
        >
          <span className={`text-[9px] font-bold ${usingProxy ? 'text-blue-400' : 'text-green-500'}`}>
            {usingProxy ? 'A' : 'D'}
          </span>
          <span className="text-[#F3E5AB] text-[9px] font-mono font-medium">
            {imageSize}
          </span>
        </div>
      )}
    </div>
  );
});

SafeImage.displayName = 'SafeImage';
export default MasonryGrid;