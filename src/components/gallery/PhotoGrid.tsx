'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Lightbox } from '@/components/gallery';
import { Download, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { InfoBarDesktop } from './InfoBarDesktop';
import { InfoBarMobile } from './InfoBarMobile';
import MasonryGrid from './MasonryGrid';
import { ConfirmationModal } from '../ui';

export default function PhotoGrid({ photos, galeria }: any) {
  // --- ESTADOS DE CONTROLE ---
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  );
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // --- ESTADOS DE DOWNLOAD ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloadingFavs, setIsDownloadingFavs] = useState(false);
  const [favDownloadProgress, setFavDownloadProgress] = useState(0);

  // --- ESTADOS DE FAVORITOS (PERSISTÊNCIA) ---
  const storageKey = `favoritos_galeria_${galeria.id}`;

  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const toggleFavoriteFromGrid = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  // Salva no localStorage sempre que 'favorites' mudar
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(favorites));
  }, [favorites, storageKey]);

  // Monitor de Scroll para as barras
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  //revisado até aqui

  /* useEffect(() => {
    if (displayLimit > QTD_FOTO_EXIBIDAS) {
      setMasonryKey((prev) => prev + 1);
    }
  }, [displayLimit]);*/

  // --- LÓGICA DE FILTRAGEM ---
  const displayedPhotos = showOnlyFavorites
    ? photos.filter((photo: any) => favorites.includes(photo.id))
    : photos;

  // --- CONFIGURAÇÕES DE DOWNLOAD E LIMITES ---
  const MAX_PHOTOS_LIMIT = 200; // Limite para alerta de quantidade
  const HEAVY_SIZE_THRESHOLD_MB = 100; // Limite para alerta de peso (500MB)

  // nova revisão
  // Dentro do PhotoGrid.tsx
  const [downloadConfirm, setDownloadConfirm] = useState<any>({
    isOpen: false,
    targetList: [],
    zipSuffix: '',
    isFavAction: false,
    totalMB: 0,
  });
  // --- LÓGICA DE DOWNLOAD REFINADA COM PROCESSAMENTO EM LOTE ---
  const handleDownloadZip = async (
    targetList: any[],
    zipSuffix: string,
    isFavAction: boolean,
    confirmed = false,
  ) => {
    if (isDownloading || isDownloadingFavs || targetList.length === 0) return;

    const totalMB =
      targetList.reduce((acc, photo) => acc + (Number(photo.size) || 0), 0) /
      (1024 * 1024);

    // Gatilho do Modal em vez de confirm nativo
    if (
      !confirmed &&
      (targetList.length > MAX_PHOTOS_LIMIT ||
        totalMB > HEAVY_SIZE_THRESHOLD_MB)
    ) {
      setDownloadConfirm({
        isOpen: true,
        targetList,
        zipSuffix,
        isFavAction,
        totalMB,
      });
      return;
    }

    const setProgress = isFavAction
      ? setFavDownloadProgress
      : setDownloadProgress;
    const setStatus = isFavAction ? setIsDownloadingFavs : setIsDownloading;

    try {
      setStatus(true);
      setProgress(0);
      const zip = new JSZip();
      let completedCount = 0; // Contador manual para precisão

      // Loop em saltos de 100 fotos
      // FASE 1: DOWNLOAD (Vai ocupar de 0% a 90% da barra)
      // FASE 1: Download rápido em paralelo
      /*for (let i = 0; i < targetList.length; i += 100) {
        const currentBatch = targetList.slice(i, i + 100);
        await Promise.all(
          currentBatch.map(async (photo) => {
            try {
              const res = await fetch(
                `https://lh3.googleusercontent.com/d/${photoId}=s0`,
              );
              const blob = await res.blob();
              zip.file(`foto-${completedCount + 1}.jpg`, blob);
              completedCount++;
              setProgress((completedCount / targetList.length) * 95); // Vai até 95% no download
            } catch (e) {
              completedCount++;
            }
          }),
        );
      }*/
      await Promise.all(
        targetList.map(async (photo) => {
          try {
            // CORREÇÃO: Usando template string correta `${photo.id}`
            const res = await fetch(
              `https://lh3.googleusercontent.com/d/${photo.id}=s0`,
            );
            const blob = await res.blob();
            zip.file(`foto-${photo.id}.jpg`, blob);
            completedCount++;
            setProgress((completedCount / targetList.length) * 95);
          } catch (e) {
            completedCount++;
          }
        }),
      );
      // FASE 2: Compactação com prioridade de velocidade
      const content = await zip.generateAsync(
        { type: 'blob', compression: 'STORE', streamFiles: true }, // streamFiles ajuda na velocidade
        (meta) => {
          if (meta.percent > 0) setProgress(95 + meta.percent * 0.05); // Os últimos 5% são rápidos
        },
      );

      // FASE 3: Disparo imediato
      saveAs(content, `${galeria.title.replace(/\s+/g, '_')}_${zipSuffix}.zip`);

      // Feedback de sucesso imediato
      setProgress(100);
    } catch (error) {
      console.error(error);
    } finally {
      // Reduzimos o delay do finally para o botão liberar mais rápido
      setTimeout(() => {
        setStatus(false);
        setProgress(0);
      }, 500);
    }
  };

  const downloadAllAsZip = () => handleDownloadZip(photos, 'completa', false);

  const handleDownloadFavorites = () =>
    handleDownloadZip(
      favorites
        .map((id) => photos.find((p: any) => p.id === id))
        .filter(Boolean),
      'favoritas',
      true,
    );

  if (!photos || photos.length === 0) return null;

  useEffect(() => {
    const handleScroll = () => {
      // Ativa o modo compacto após 100px de scroll
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* 1. BARRA DE INFORMAÇÕES EDITORIAL: DESKTOP */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="sticky top-4 z-[100] w-full flex justify-center pointer-events-none"
      >
        <div className="pointer-events-auto">
          <InfoBarDesktop
            galeria={galeria}
            photos={photos}
            favorites={favorites}
            showOnlyFavorites={showOnlyFavorites}
            setShowOnlyFavorites={setShowOnlyFavorites}
            isDownloading={isDownloading}
            downloadProgress={downloadProgress}
            downloadAllAsZip={downloadAllAsZip}
            isScrolled={isScrolled}
            isHovered={isHovered}
            setIsHovered={setIsHovered}
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
            downloadAllAsZip={downloadAllAsZip}
            isDownloading={isDownloading}
            downloadProgress={downloadProgress}
            isScrolled={isScrolled}
            setIsHovered={setIsHovered}
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
        setShowOnlyFavorites={setShowOnlyFavorites}
      />
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
      {/* BOTÃO FLUTUANTE DE DOWNLOAD FAVORITOS */}
      {favorites.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={handleDownloadFavorites}
            disabled={isDownloadingFavs}
            className="flex items-center justify-center gap-3 bg-[#E67E70] hover:bg-[#D66D5F] text-white px-0 py-2 rounded-full shadow-[0_10px_40px_rgba(230,126,112,0.4)] transition-all active:scale-95 group border border-white/20 w-[170px] h-[52px] flex-shrink-0"
          >
            {isDownloadingFavs ? (
              <div className="flex items-center gap-2 justify-center w-full">
                <Loader2 className="animate-spin h-5 w-5 flex-shrink-0" />
                <span className="font-bold tracking-tight text-sm tabular-nums whitespace-nowrap">
                  {favDownloadProgress < 95
                    ? `Baixando ${Math.round(favDownloadProgress)}%`
                    : 'Finalizando...'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full justify-center">
                <div className="bg-white/20 p-1.5 rounded-full flex-shrink-0">
                  <Download size={18} />
                </div>
                <div className="flex flex-col items-start leading-none overflow-hidden">
                  <span className="text-white text-sm md:text-[15px] font-semibold truncate w-full">
                    Baixar {favorites.length === 1 ? 'favorita' : 'favoritas'}
                  </span>
                  <span className="text-[12px] md:text-[14px] opacity-80 italic">
                    {favorites.length}{' '}
                    {favorites.length === 1 ? 'foto' : 'fotos'}
                  </span>
                </div>
              </div>
            )}
          </button>
        </div>
      )}

      <div ref={sentinelRef} />

      <ConfirmationModal
        isOpen={downloadConfirm.isOpen}
        title="Download volumoso"
        variant="primary"
        confirmText="Baixar agora"
        onClose={() =>
          setDownloadConfirm((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={() => {
          setDownloadConfirm((prev) => ({ ...prev, isOpen: false }));
          handleDownloadZip(
            downloadConfirm.targetList,
            downloadConfirm.zipSuffix,
            downloadConfirm.isFavAction,
            true,
          );
        }}
        message={
          <p>
            Você está baixando{' '}
            <span className="font-bold">
              {downloadConfirm.targetList.length} fotos
            </span>
            . O tamanho estimado é de{' '}
            <span className="font-bold">
              {downloadConfirm.totalMB.toFixed(0)}MB
            </span>
            . Isso pode levar alguns minutos.
          </p>
        }
      />
    </div>
  );
}
