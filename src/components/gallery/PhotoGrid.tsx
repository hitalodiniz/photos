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
  const QTD_FOTO_EXIBIDAS = 24;

  // --- ESTADOS DE CONTROLE ---
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  );
  const [masonryKey, setMasonryKey] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(QTD_FOTO_EXIBIDAS);

  // --- ESTADOS DE DOWNLOAD ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloadingFavs, setIsDownloadingFavs] = useState(false);
  const [favDownloadProgress, setFavDownloadProgress] = useState(0);

  // --- ESTADOS DE FAVORITOS ---
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // --- LÓGICA DE ESTIMATIVA DE PESO ---
  const ESTIMATED_MB_PER_PHOTO = 5; // Média de 5MB por foto em alta resolução
  const totalPhotosCount = photos?.length || 0;
  const totalEstimatedSizeMB = totalPhotosCount * ESTIMATED_MB_PER_PHOTO;
  const isTooHeavy = totalEstimatedSizeMB > 1000; // Alerta se passar de 1GB

  const toggleFavoriteFromGrid = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

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
  const MAX_PHOTOS_LIMIT = 200; // Limite para alerta de quantidade
  const HEAVY_SIZE_THRESHOLD_MB = 100; // Limite para alerta de peso (500MB)

  // Dentro do PhotoGrid.tsx
  const [downloadConfirm, setDownloadConfirm] = useState<{
    isOpen: boolean;
    targetList: any[];
    zipSuffix: string;
    isFavAction: boolean;
    totalMB: number;
  }>({
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

    const totalSizeBytes = targetList.reduce(
      (acc, photo) => acc + (Number(photo.size) || 0),
      0,
    );
    const totalMB = totalSizeBytes / (1024 * 1024);

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

    const BATCH_SIZE = 100; // Limite de 100 fotos por lote para estabilidade
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
      for (let i = 0; i < targetList.length; i += 100) {
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
      }

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
  const handleDownloadFavorites = () => {
    const favPhotos = photos.filter((p: any) => favorites.includes(p.id));
    handleDownloadZip(favPhotos, 'favoritas', true);
  };

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

  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
            downloadProgress={downloadProgress}
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
            downloadAllAsZip={downloadAllAsZip}
            isDownloading={isDownloading}
            downloadProgress={downloadProgress}
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
            className="flex items-center gap-3 bg-[#E67E70] hover:bg-[#D66D5F] text-white px-6 py-3 rounded-full shadow-2xl transition-all"
          >
            {isDownloadingFavs ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-bold">
                  Baixando ({Math.round(favDownloadProgress)}%)
                </span>
              </div>
            ) : (
              <>
                <Download size={20} />
                <span className="font-medium">
                  Baixar {favorites.length} favoritas
                </span>
              </>
            )}
          </button>
        </div>
      )}

      <div ref={sentinelRef} className="h-10" />

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
