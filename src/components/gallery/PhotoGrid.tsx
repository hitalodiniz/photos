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

  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setFavorites(JSON.parse(saved));
  }, [storageKey]);

  const toggleFavoriteFromGrid = (id: string) => {
    // A atualização ocorre imediatamente no estado local
    setFavorites((prev) => {
      const isRemoving = prev.includes(id);

      // Se estiver removendo e o filtro de favoritos estiver ativo,
      // a foto sumirá do grid conforme o estado limpa
      if (isRemoving) {
        return prev.filter((f) => f !== id);
      }

      // Caso contrário, adiciona ao array
      return [...prev, id];
    });
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
      let completedCount = 0;

      // FASE 1: DOWNLOAD EM LOTES
      for (let i = 0; i < targetList.length; i += 100) {
        const currentBatch = targetList.slice(i, i + 100);

        await Promise.all(
          currentBatch.map(async (photo, indexInBatch) => {
            try {
              // CORREÇÃO 1: URL com Proxy para evitar CORS
              const res = await fetch(`/api/proxy-image?id=${photo.id}`);
              if (!res.ok) throw new Error(`Erro ${res.status}`);

              // CORREÇÃO 2: Baixar como BLOB de imagem (NÃO ZIP AQUI)
              const blob = await res.blob();

              // Garante que o arquivo tenha a extensão .jpg dentro do ZIP
              const photoIndex = i + indexInBatch + 1;
              zip.file(`foto-${photoIndex}.jpg`, blob, {
                binary: true,
              });
            } catch (e) {
              console.error(`Erro na foto ${photo.id}:`, e);
            } finally {
              completedCount++;
              setProgress((completedCount / targetList.length) * 95);
            }
          }),
        );

        if (i + 100 < targetList.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // FASE 2: GERAR O ZIP FINAL
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE', // 'STORE' é mais rápido para imagens já compactadas
        streamFiles: true,
      });

      // CORREÇÃO 3: Forçar o tipo MIME do arquivo final para ZIP
      const finalZip = new Blob([content], { type: 'application/zip' });

      // FASE 3: DISPARO DO DOWNLOAD
      const fileName = `${galeria.title.replace(/\s+/g, '_')}_${zipSuffix}.zip`;

      // Uso do saveAs (ou link temporário se saveAs falhar)
      saveAs(finalZip, fileName);

      setProgress(100);
    } catch (error) {
      console.error('Erro no ZIP:', error);
      alert('Erro ao gerar o arquivo compactado.');
    } finally {
      setTimeout(() => {
        setStatus(false);
        setProgress(0);
      }, 1500);
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
    <div className="relative  w-full">
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
        galeria={galeria}
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
          favorites={favorites}
          onToggleFavorite={toggleFavoriteFromGrid}
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
