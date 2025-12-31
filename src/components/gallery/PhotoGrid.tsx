'use client';
import React, { useState, useEffect, useRef } from 'react';
import imagesLoaded from 'imagesloaded';
import { Lightbox } from '@/components/gallery';
import { Download, Heart, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { InfoBarDesktop } from './InfoBarDesktop';
import { InfoBarMobile } from './InfoBarMobile';
import MasonryGrid from './MasonryGrid';

export default function PhotoGrid({ photos, galeria }: any) {
  const QTD_FOTO_EXIBIDAS = 24;

  // --- ESTADOS DE CONTROLE ORIGINAIS ---
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  );
  const [masonryKey, setMasonryKey] = useState(0);

  // --- ESTADOS DE DOWNLOAD SEPARADOS ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [setDownloadProgress] = useState(0);
  const [isDownloadingFavs, setIsDownloadingFavs] = useState(false);
  const [favDownloadProgress, setFavDownloadProgress] = useState(0);

  // --- ESTADOS DE FAVORITOS E FILTRO ---
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Defina a função aqui
  const toggleFavoriteFromGrid = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const [displayLimit, setDisplayLimit] = useState(QTD_FOTO_EXIBIDAS);
  /*const [displayLimit, setDisplayLimit] = useState(() => {
    if (typeof window === 'undefined') return QTD_FOTO_EXIBIDAS;
    const cols = getCurrentColumns();
    return normalizeLimit(QTD_FOTO_EXIBIDAS, cols);
  });*/

  // --- CARREGAR FAVORITOS DO LOCALSTORAGE ---
  useEffect(() => {
    const saved = localStorage.getItem(`fav_${galeria.id}`);
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, [galeria.id]);

  useEffect(() => {
    if (displayLimit > QTD_FOTO_EXIBIDAS) {
      setMasonryKey((prev) => prev + 1);
    }
  }, [displayLimit]);

  // --- LÓGICA DE FILTRAGEM ---
  const displayedPhotos = showOnlyFavorites
    ? photos.filter((photo: any) => favorites.includes(photo.id))
    : photos;

  // --- CONFIGURAÇÕES DE DOWNLOAD E LIMITES ---
  const MAX_PHOTOS = 150;
  const isOverLimit = photos.length > MAX_PHOTOS;
  const ESTIMATED_MB_PER_PHOTO = 10;
  const totalSizeMB = photos.length * ESTIMATED_MB_PER_PHOTO;
  const isVeryHeavy = totalSizeMB > 500;

  const breakpointColumnsObj = {
    default: 5,
    1536: 4,
    1280: 3,
    1024: 3,
    768: 2,
  };

  const getImageUrl = (photoId: string, suffix: string = 'w600') => {
    return `https://lh3.googleusercontent.com/d/${photoId}=${suffix}`;
  };

  // --- LÓGICA DE DOWNLOAD REFINADA (COM ESTADOS INDEPENDENTES) ---
  const handleDownloadZip = async (
    targetList: any[],
    zipSuffix: string,
    isFavAction: boolean,
  ) => {
    if (isDownloading || isDownloadingFavs || targetList.length === 0) return;

    const setProgress = isFavAction
      ? setFavDownloadProgress
      : setDownloadProgress;
    const setStatus = isFavAction ? setIsDownloadingFavs : setIsDownloading;

    try {
      setStatus(true);
      setProgress(0);
      const zip = new JSZip();

      for (let i = 0; i < targetList.length; i++) {
        const photo = targetList[i];
        const fileId = photo.id;
        const url = `https://lh3.googleusercontent.com/d/${fileId}=s0`;

        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Erro na rede');
          const blob = await response.blob();
          zip.file(`foto-${i + 1}.jpg`, blob);
          // Atualiza progresso específico do botão clicado
          setProgress(((i + 1) / targetList.length) * 100);
        } catch (err) {
          console.error(`Erro ao processar foto ${i}:`, err);
        }
      }

      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE',
      });
      saveAs(content, `${galeria.title.replace(/\s+/g, '_')}_${zipSuffix}.zip`);
    } catch (error) {
      console.error('Erro no ZIP:', error);
      alert('Erro ao gerar o arquivo ZIP.');
    } finally {
      setStatus(false);
      setProgress(0);
    }
  };

  const downloadAllAsZip = () => handleDownloadZip(photos, 'completa', false);
  const handleDownloadFavorites = () => {
    const favPhotos = photos.filter((p: any) => favorites.includes(p.id));
    handleDownloadZip(favPhotos, 'favoritas', true);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const currentPosition = window.innerHeight + window.scrollY;

      // Quando faltar ~2000px para o fim, carrega mais
      if (currentPosition >= scrollHeight - 2000) {
        setDisplayLimit((prev) =>
          Math.min(prev + QTD_FOTO_EXIBIDAS, displayedPhotos.length),
        );
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayedPhotos.length]);

  if (!photos || photos.length === 0) return null;

  const refreshFavorites = () => {
    const saved = localStorage.getItem(`fav_${galeria.id}`);
    setFavorites(saved ? JSON.parse(saved) : []);
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Ativa o modo compacto após 100px de scroll
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const observer = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayLimit((prev) => Math.min(prev + 24, displayedPhotos.length));
      }
    });
    if (sentinelRef.current) {
      observer.current.observe(sentinelRef.current);
    }
    return () => observer.current?.disconnect();
  }, [displayedPhotos.length]);

  const gridRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    if (gridRef.current) {
      imagesLoaded(gridRef.current, () => {
        setIsReady(true);
      });
    }
  }, [displayedPhotos]);

  return (
    <div className="w-full flex flex-col items-center gap-6 pb-10">
      {/* 1. BARRA DE INFORMAÇÕES EDITORIAL: DESKTOP */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        // O segredo está aqui: o STICKY deve estar nesta div pai para ela flutuar
        className="sticky top-4 z-[100] w-full flex justify-center pointer-events-none"
      >
        {/* pointer-events-none no pai e pointer-events-auto no filho garante que você consiga clicar na barra mas não bloqueie cliques fora dela
         */}
        <div className="pointer-events-auto">
          <InfoBarDesktop
            galeria={galeria}
            photos={photos}
            favorites={favorites}
            showOnlyFavorites={showOnlyFavorites}
            setShowOnlyFavorites={setShowOnlyFavorites}
            isDownloading={isDownloading}
            downloadAllAsZip={downloadAllAsZip}
            isScrolled={isScrolled}
            isHovered={isHovered}
          />
        </div>

        {/* 2. CONTAINER DA BARRA MOBILE (STICKY) */}

        <div className="md:hidden pointer-events-auto w-full flex justify-center">
          <InfoBarMobile
            galeria={galeria}
            photos={photos}
            favorites={favorites}
            showOnlyFavorites={showOnlyFavorites}
            setShowOnlyFavorites={setShowOnlyFavorites}
            downloadAllAsZip={() =>
              handleDownloadZip(photos, 'completa', false)
            }
            isDownloading={isDownloading}
            isScrolled={isScrolled}
          />
        </div>
      </div>
      {/* 2. GRID MASONRY */}
      <MasonryGrid
        galleryTitle={galeria.title}
        displayedPhotos={displayedPhotos}
        favorites={favorites}
        toggleFavoriteFromGrid={toggleFavoriteFromGrid}
        setSelectedPhotoIndex={setSelectedPhotoIndex}
        photos={photos}
        showOnlyFavorites={showOnlyFavorites}
        masonryKey={masonryKey}
      />
      {/* 4. INDICADOR DE CARREGAMENTO */}
      {displayLimit < displayedPhotos.length && (
        <div className="flex justify-center py-20 w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F3E5AB]" />
        </div>
      )}
      {/* 5. LIGHTBOX */}
      {selectedPhotoIndex !== null && photos.length > 0 && (
        <Lightbox
          photos={photos}
          activeIndex={selectedPhotoIndex}
          totalPhotos={photos.length}
          galleryTitle={galeria.title}
          galeria={galeria}
          location={galeria.location || ''}
          onClose={() => {
            setSelectedPhotoIndex(null);
            refreshFavorites(); // Força a barra a atualizar ao fechar
          }}
          onNext={() =>
            setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length)
          }
          onPrev={() =>
            setSelectedPhotoIndex(
              (selectedPhotoIndex - 1 + photos.length) % photos.length,
            )
          }
        />
      )}
      {/* BOTÃO FLUTUANTE DE DOWNLOAD RÁPIDO */}
      {favorites.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={handleDownloadFavorites}
            disabled={isDownloadingFavs}
            className="flex items-center gap-3 bg-[#E67E70] hover:bg-[#D66D5F] text-white px-4 md:px-4 py-2 md:py-2 rounded-full shadow-[0_10px_40px_rgba(230,126,112,0.4)] transition-all active:scale-95 group border border-white/20"
          >
            {isDownloadingFavs ? (
              <div className="flex items-center gap-">
                <Loader2 className="animate-spin h-5 w-5" />
                <span className="font-bold tracking-widest text-sm">
                  A baixar ({Math.round(favDownloadProgress)}%)
                </span>
              </div>
            ) : (
              <>
                <div className="bg-white/20 p-1.5 rounded-full group-hover:bg-white/30 transition-colors">
                  <Download size={18} />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="gap-1.5 text-white text-sm md:text-[14px] font-medium italic">
                    Baixar favoritas
                  </span>
                  <span className="text-[10px] md:text-[12px] opacity-80 italic">
                    {favorites.length}{' '}
                    {favorites.length === 1
                      ? 'foto escolhida'
                      : 'fotos escolhidas'}
                  </span>
                </div>
              </>
            )}
          </button>
        </div>
      )}
      <div ref={sentinelRef} className="h-10" />
    </div>
  );
}
