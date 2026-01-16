'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Download,
  X,
  CheckCircle2,
  Package,
  Loader2,
  Heart,
  Wifi,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { Lightbox } from '@/components/gallery';
import { InfoBarDesktop } from './InfoBarDesktop';
import { InfoBarMobile } from './InfoBarMobile';
import MasonryGrid from './MasonryGrid';
import { getDownloadUrl } from '@/core/utils/url-helper';
import { GALLERY_MESSAGES } from '@/constants/messages';
import { executeShare } from '@/core/utils/share-helper';
import { groupPhotosByWeight } from '@/core/utils/foto-helpers';

export default function PhotoGrid({ photos, galeria }: any) {
  // --- 1. ESTADOS DE INTERFACE ---
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  );
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [activeTag, setActiveTag] = useState('Todas');
  const [showVolumeDashboard, setShowVolumeDashboard] = useState(false);
  const [canShowFavButton, setCanShowFavButton] = useState(false);

  // --- 2. ESTADOS DE DOWNLOAD E DADOS ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloadingFavs, setIsDownloadingFavs] = useState(false);
  const [favDownloadProgress, setFavDownloadProgress] = useState(0);
  const [downloadedVolumes, setDownloadedVolumes] = useState<number[]>([]);
  const [activeDownloadingIndex, setActiveDownloadingIndex] = useState<
    number | string | null
  >(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  // --- 3. REFS E CONSTANTES ---
  const gridRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const storageKey = `favoritos_galeria_${galeria.id}`;

  // --- 4. MEMOS (CÁLCULOS) ---
  const VOLUMES = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const LIMIT = (isMobile ? 200 : 500) * 1024 * 1024;
    return groupPhotosByWeight(photos, LIMIT);
  }, [photos]);

  const FAVORITE_VOLUMES = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const LIMIT = (isMobile ? 200 : 500) * 1024 * 1024;
    const targetList = favorites
      .map((id) => photos.find((p: any) => p.id === id))
      .filter(Boolean);
    return groupPhotosByWeight(targetList, LIMIT);
  }, [favorites, photos]);

  const totalGallerySizeMB = useMemo(() => {
    return (
      photos.reduce((acc: number, p: any) => acc + (Number(p.size) || 0), 0) /
      (1024 * 1024)
    );
  }, [photos]);

  const tagsDaGaleria = useMemo(
    () => [
      'Todas',
      ...Array.from(new Set(photos.map((p: any) => p.tag).filter(Boolean))),
    ],
    [photos],
  );

  const displayedPhotos = useMemo(
    () =>
      photos.filter((photo: any) => {
        const matchesFavorite = showOnlyFavorites
          ? favorites.includes(photo.id)
          : true;
        const matchesTag = activeTag === 'Todas' || photo.tag === activeTag;
        return matchesFavorite && matchesTag;
      }),
    [photos, showOnlyFavorites, favorites, activeTag],
  );

  const [columns, setColumns] = useState({
    mobile: Math.min(2, galeria.columns_mobile || 2),
    tablet: Math.min(5, Math.max(2, galeria.columns_tablet || 3)),
    desktop: Math.min(8, Math.max(3, galeria.columns_desktop || 5)),
  });

  // --- 5. EFFECTS (LÓGICA E SINCRONIZAÇÃO) ---

  // Persistência: Carregar (30 dias)
  // 1. CARREGAR E RENOVAR (Roda ao abrir a página)
  useEffect(() => {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const { items, timestamp } = JSON.parse(savedData);

        // Verifica se já expirou (30 dias sem visita)
        const isExpired = Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000;

        if (isExpired) {
          localStorage.removeItem(storageKey);
          setFavorites([]);
        } else {
          setFavorites(items || []);

          // ESTRATÉGIA DE RENOVAÇÃO:
          // Se ele entrou e os dados são válidos, salvamos de novo com o timestamp de HOJE.
          // Isso empurra a expiração para +30 dias a partir de agora.
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              items: items,
              timestamp: Date.now(),
            }),
          );
        }
      } catch (e) {
        console.error('Erro ao processar favoritos:', e);
      }
    }
  }, [storageKey]);

  // 2. SALVAR MUDANÇAS (Roda ao favoritar/desfavoritar)
  useEffect(() => {
    if (favorites.length > 0) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          items: favorites,
          timestamp: Date.now(),
        }),
      );
    } else {
      // Se a lista ficar vazia, removemos a chave para limpar o storage
      localStorage.removeItem(storageKey);
    }
  }, [favorites, storageKey]);

  // Scroll e Observer
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCanShowFavButton(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' },
    );

    if (anchorRef.current) observer.observe(anchorRef.current);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  // --- 6. HANDLERS ---
  const toggleFavoriteFromGrid = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const handleDownloadZip = async (
    targetList: any[],
    zipSuffix: string,
    isFavAction: boolean,
    confirmed = false,
    chunkIndex?: number | string,
  ) => {
    // 1. Guard Clauses (Proteção de execução)
    if (isDownloading || isDownloadingFavs || targetList.length === 0) return;
    if (chunkIndex !== undefined) setActiveDownloadingIndex(chunkIndex);

    // 2. Cálculos iniciais
    const firstPhotoGlobalIndex = photos.indexOf(targetList[0]);
    const totalMB =
      targetList.reduce((acc, photo) => acc + (Number(photo.size) || 0), 0) /
      (1024 * 1024);

    if (!confirmed && !isFavAction) {
      setShowVolumeDashboard(true);
      return;
    }

    // 3. Definição dinâmica de estados
    const setProgress = isFavAction
      ? setFavDownloadProgress
      : setDownloadProgress;
    const setStatus = isFavAction ? setIsDownloadingFavs : setIsDownloading;

    try {
      setStatus(true);
      setProgress(0);
      const zip = new JSZip();
      let completedCount = 0;

      // Otimização de concorrência baseada no dispositivo
      const batchSize = window.innerWidth < 768 ? 30 : 100;

      // 4. Processamento em Lotes (Batches)
      for (let i = 0; i < targetList.length; i += batchSize) {
        const currentBatch = targetList.slice(i, i + batchSize);
        await Promise.all(
          currentBatch.map(async (photo, indexInBatch) => {
            try {
              // Chamada direta ao Google (Bypass Vercel)
              const res = await fetch(getDownloadUrl(photoId));
              if (!res.ok) throw new Error(`Erro na foto ${photo.id}`);

              const blob = await res.blob();
              const globalPhotoNumber =
                firstPhotoGlobalIndex + i + indexInBatch + 1;
              // Adiciona ao ZIP na memória do cliente
              zip.file(`foto-${globalPhotoNumber}.jpg`, blob, { binary: true });
            } catch (e) {
              console.error(`Falha ao processar foto individual no ZIP:`, e);
            } finally {
              completedCount++;
              setProgress((completedCount / targetList.length) * 95);
            }
          }),
        );
        // Pequeno respiro para a Main Thread não travar em dispositivos fracos
        if (i + batchSize < targetList.length)
          await new Promise((r) =>
            setTimeout(r, window.innerWidth < 768 ? 300 : 100),
          );
      }

      // 5. Geração do arquivo final (Blob)
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE',
        streamFiles: true,
      });
      // 6. Nomeação e Download
      saveAs(
        content,
        `${galeria.title.replace(/\s+/g, '_')}_${zipSuffix}_${totalMB.toFixed(0)}MB.zip`,
      );
      setProgress(100);
      if (typeof chunkIndex === 'number')
        setDownloadedVolumes((prev) => [...new Set([...prev, chunkIndex])]);
    } catch (error) {
      console.error('Erro crítico na geração do ZIP:', error);
    } finally {
      setTimeout(() => {
        setStatus(false);
        setProgress(0);
        setActiveDownloadingIndex(null);
      }, 1500);
    }
  };

  const handleDownloadFavorites = () => setShowVolumeDashboard(true);
  const downloadAllAsZip = () => handleDownloadZip(photos, 'completa', false);

  return (
    <div className="relative w-full">
      <div
        ref={anchorRef}
        className="absolute top-0 h-10 w-full pointer-events-none"
      />

      {/* INFO BARS */}
      <div className="sticky top-0 z-[100] w-full pointer-events-none">
        <InfoBarDesktop
          {...{
            galeria,
            photos,
            favorites,
            columns,
            setColumns,
            activeTag,
            setActiveTag,
            showOnlyFavorites,
            setShowOnlyFavorites,
            isDownloading,
            downloadProgress,
            downloadAllAsZip,
            isScrolled,
            isHovered,
            setIsHovered,
          }}
          tags={tagsDaGaleria}
          handleShare={() =>
            executeShare({
              title: galeria.title,
              text: GALLERY_MESSAGES.GUEST_SHARE(
                galeria.title,
                window.location.href,
              ),
              url: window.location.href,
            })
          }
        />
        <InfoBarMobile
          {...{
            galeria,
            photos,
            favorites,
            showOnlyFavorites,
            setShowOnlyFavorites,
            downloadAllAsZip,
            isDownloading,
            downloadProgress,
            isScrolled,
            columns,
            setColumns,
            activeTag,
            setActiveTag,
          }}
          tags={tagsDaGaleria}
          handleShare={() =>
            executeShare({
              title: galeria.title,
              text: GALLERY_MESSAGES.GUEST_SHARE(
                galeria.title,
                window.location.href,
              ),
              url: window.location.href,
            })
          }
        />
      </div>

      <div ref={gridRef}>
        <MasonryGrid
          {...{
            galeria,
            displayedPhotos,
            favorites,
            toggleFavoriteFromGrid,
            setSelectedPhotoIndex,
            photos,
            showOnlyFavorites,
            setShowOnlyFavorites,
            columns,
          }}
          galleryTitle={galeria.title}
        />
      </div>

      {/* MODAL CENTRAL DE DOWNLOADS (TEMA BRANCO) */}
      {showVolumeDashboard && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-6 md:p-6 animate-in fade-in duration-300">
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="absolute inset-0"
            onClick={() => setShowVolumeDashboard(false)}
          />

          <div className="w-full md:max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col h-auto max-h-[85vh] overflow-hidden relative animate-in zoom-in-95 duration-300">
            {/* 1. TOPO COMPACTO */}
            <div className="flex flex-col shrink-0 bg-white">
              {totalGallerySizeMB > 100 && (
                <div className="bg-[#F3E5AB]/20 py-2 flex items-center justify-center gap-2 border-b border-[#F3E5AB]/30 shrink-0">
                  <svg
                    className="w-3 h-3 text-[#D4AF37]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                    />
                  </svg>
                  <span className="text-[10px] p-2 font-semibold uppercase tracking-widest text-[#D4AF37]">
                    Wi-Fi recomendado
                  </span>
                </div>
              )}

              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                <div className="min-w-0 text-left">
                  <h2 className="text-xl text-gray-900 leading-none">
                    Download das fotos
                  </h2>
                  <p className="text-[#D4AF37] text-[10px] font-semibold tracking-tight mt-1.5">
                    {downloadedVolumes.length} / {VOLUMES.length} pacotes
                    baixados
                  </p>
                </div>
                <button
                  onClick={() => setShowVolumeDashboard(false)}
                  className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 2. LISTA OTIMIZADA */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-2 bg-gray-50/50 min-h-0 no-scrollbar">
              {/* SEÇÃO DE FAVORITOS DINÂMICA */}
              {FAVORITE_VOLUMES.length > 0 && (
                <>
                  {FAVORITE_VOLUMES.map((favChunk, index) => {
                    const isCurrent = activeDownloadingIndex === `fav-${index}`;
                    const sizeMB =
                      favChunk.reduce(
                        (acc, p) => acc + (Number(p.size) || 0),
                        0,
                      ) /
                      (1024 * 1024);

                    return (
                      <button
                        key={`fav-${index}`}
                        disabled={isDownloading}
                        onClick={() =>
                          handleDownloadZip(
                            favChunk,
                            `Favoritas_${index + 1}`,
                            false, // Mude para false para ele usar o progresso que o modal exibe
                            true,
                            `fav-${index}` as any,
                          )
                        }
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all shadow-sm ${
                          isCurrent
                            ? 'border-[#D4AF37] bg-white ring-1 ring-[#D4AF37]/20'
                            : 'bg-white border-gray-100 hover:border-[#F3E5AB]'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-[#F3E5AB] text-[#D4AF37]'
                              : 'bg-[#F3E5AB]/20 text-[#D4AF37]'
                          }`}
                        >
                          {/* Ícone de Coração para Favoritos */}
                          <Heart
                            size={18}
                            fill={isCurrent ? '#D4AF37' : 'none'}
                          />
                        </div>

                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-tight">
                            {FAVORITE_VOLUMES.length > 1
                              ? `Favoritas ${String(index + 1).padStart(2, '0')}`
                              : 'Suas Favoritas'}
                          </p>
                          <p className="text-[9px] font-medium text-gray-400 tracking-wider">
                            {favChunk.length} fotos • {sizeMB.toFixed(0)} MB
                          </p>
                        </div>

                        {/* Ícone de status/download à direita */}
                        <div className="shrink-0 text-[#D4AF37]">
                          {isCurrent ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Download size={16} className="opacity-40" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                  <div className="h-px bg-gray-200 my-2 mx-2" />
                </>
              )}

              {/* LISTAGEM DOS VOLUMES */}
              {VOLUMES.map((chunk, i) => {
                const isDownloaded = downloadedVolumes.includes(i);
                const isCurrentlyDownloading = activeDownloadingIndex === i;
                const firstPhotoIndex = photos.indexOf(chunk[0]) + 1;
                const lastPhotoIndex = firstPhotoIndex + chunk.length - 1;
                const sizeMB =
                  chunk.reduce((acc, p) => acc + (Number(p.size) || 0), 0) /
                  (1024 * 1024);

                return (
                  <button
                    key={i}
                    disabled={isDownloading}
                    onClick={() =>
                      handleDownloadZip(chunk, `Vol_${i + 1}`, false, true, i)
                    }
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all active:scale-[0.98] ${
                      isCurrentlyDownloading
                        ? 'border-[#D4AF37] bg-white ring-1 ring-[#D4AF37]/20 shadow-md'
                        : isDownloaded
                          ? 'bg-white/60 border-green-100 opacity-60'
                          : 'bg-white border-gray-100 shadow-sm'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isCurrentlyDownloading
                          ? 'bg-[#F3E5AB] text-[#D4AF37]'
                          : isDownloaded
                            ? 'bg-green-50 text-green-800'
                            : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <Package size={18} />
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        Volume {String(i + 1).padStart(2, '0')}
                      </p>
                      <p
                        className={`text-[9px] font-medium ${isCurrentlyDownloading ? 'text-[#D4AF37]' : 'text-gray-400'}`}
                      >
                        Fotos {firstPhotoIndex} a {lastPhotoIndex} •{' '}
                        {sizeMB.toFixed(0)} MB
                      </p>
                    </div>

                    {/* Ícone de status à direita */}
                    <div className="shrink-0">
                      {isCurrentlyDownloading ? (
                        <Loader2
                          size={16}
                          className="text-[#D4AF37] animate-spin"
                        />
                      ) : isDownloaded ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                        <Download
                          size={16}
                          className="text-[#D4AF37] opacity-40"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 3. BASE DINÂMICA */}
            <div className="px-6 py-5 bg-white border-t border-gray-100 shrink-0">
              {isDownloading ? (
                <div className="w-full text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-semibold uppercase text-[#D4AF37] animate-pulse block mb-2">
                      {activeDownloadingIndex !== null &&
                      String(activeDownloadingIndex).includes('fav')
                        ? `Baixando Favoritas ${String(Number(String(activeDownloadingIndex).split('-')[1]) + 1).padStart(2, '0')}...`
                        : activeDownloadingIndex !== null
                          ? `Baixando Volume ${String(Number(activeDownloadingIndex) + 1).padStart(2, '0')}...`
                          : 'Processando...'}
                    </span>
                    <span className="text-xs font-semibold text-gray-900">
                      {Math.round(downloadProgress)}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D4AF37] transition-all"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-center text-[10px] text-gray-700 uppercase font-semibold tracking-widest">
                  Selecione um volume para baixar
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* BOTÃO FLUTUANTE DE DOWNLOAD FAVORITOS */}
      {/* Condições para aparecer:
    1. Ter favoritos (favorites.length > 0)
    2. O modal de volumes estar fechado (!showVolumeDashboard)
    3. O usuário ter scrollado para baixo (!isHeroExpanded -> isScrolled)
*/}
      {favorites.length > 0 && !showVolumeDashboard && isScrolled && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] animate-in fade-in zoom-in duration-500 w-fit">
          <button
            onClick={handleDownloadFavorites}
            disabled={isDownloadingFavs}
            className="flex items-center justify-center rounded-[0.7rem] h-12 bg-[#F3E5AB] text-black border border-white/20 
      shadow-[0_10px_40px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 px-4 gap-3 shrink-0"
          >
            {/* ... conteúdo interno do botão (Loader ou Ícones) ... */}
            <Download size={18} />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[11px] font-semibold uppercase tracking-tight">
                Baixar Favoritas
              </span>
              <span className="text-[9px] font-medium opacity-70 italic">
                {favorites.length} {favorites.length === 1 ? 'foto' : 'fotos'}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* BOTÃO FLUTUANTE FAVORITOS */}
      {favorites.length > 0 && !showVolumeDashboard && canShowFavButton && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] animate-in fade-in zoom-in slide-in-from-bottom-5 duration-300 pointer-events-auto w-fit">
          <button
            onClick={handleDownloadFavorites}
            disabled={isDownloadingFavs}
            className="flex items-center justify-center rounded-[0.7rem] h-12 bg-[#F3E5AB] text-black border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-all px-6 gap-3"
          >
            {isDownloadingFavs ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            <div className="flex flex-col items-start leading-tight text-left">
              <span className="text-[11px] font-bold uppercase tracking-tight">
                Baixar Favoritas
              </span>
              <span className="text-[9px] font-medium opacity-70 italic">
                {favorites.length} {favorites.length === 1 ? 'foto' : 'fotos'}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* LIGHTBOX */}
      {selectedPhotoIndex !== null && photos.length > 0 && (
        <Lightbox
          photos={photos}
          activeIndex={selectedPhotoIndex}
          totalPhotos={photos.length}
          galleryTitle={galeria.title}
          galeria={galeria}
          location={galeria.location || ''}
          favorites={favorites}
          onToggleFavorite={toggleFavoriteFromGrid}
          onClose={() => setSelectedPhotoIndex(null)}
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
    </div>
  );
}
