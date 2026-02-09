'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import Lightbox from './Lightbox';
import { ToolBarDesktop } from './ToolBarDesktop';
import MasonryGrid from './MasonryGrid';
import {
  convertToDirectDownloadUrl,
  getDownloadUrl,
  TAMANHO_MAXIMO_FOTO_SEM_COMPACTAR,
} from '@/core/utils/url-helper';
import { formatMessage } from '@/core/utils/message-helper';
import { GALLERY_MESSAGES } from '@/core/config/messages';
import { executeShare } from '@/core/utils/share-helper';
import {
  groupPhotosByWeight,
  estimatePhotoDownloadSize,
} from '@/core/utils/foto-helpers';
import { DownloadCenterModal } from './DownloadCenterModal';
import { ToolBarMobile } from './ToolBarMobile';
import { V } from 'node_modules/vitest/dist/chunks/reporters.d.Rsi0PyxX';
import UpgradeModal from '@/components/ui/UpgradeModal';

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
  const [upsellFeature, setUpsellFeature] = useState<{
    label: string;
    feature: string;
  } | null>(null);

  // --- 2. ESTADOS DE DOWNLOAD E DADOS ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloadingFavs, setIsDownloadingFavs] = useState(false);
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
      photos.reduce(
        (acc: number, p: any) => acc + estimatePhotoDownloadSize(p),
        0,
      ) /
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

  const parseLinks = (
    jsonString: string | null | undefined,
  ): { url: string; label: string }[] => {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        // 🎯 REMOVEMOS o filtro "typeof link === 'string'" para aceitar os objetos {url, label}
        return parsed.map((item, index) => {
          if (typeof item === 'object' && item !== null) {
            return {
              url: item.url || '',
              label: item.label || `Link ${index + 1}`,
            };
          }
          return {
            url: String(item),
            label: `Link ${index + 1}`,
          };
        });
      }
      return [{ url: jsonString, label: 'Qualidade Máxima' }];
    } catch {
      return [{ url: jsonString, label: 'Qualidade Máxima' }];
    }
  };

  const externalLinks = useMemo(
    () => parseLinks(galeria?.zip_url_full),
    [galeria?.zip_url_full],
  );

  // --- 6. HANDLERS ---
  const toggleFavoriteFromGrid = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const handleExternalDownload = async (rawUrl: string, filename: string) => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);

      // 🎯 CONVERSÃO AUTOMÁTICA: Garante o formato de download direto
      const directUrl = convertToDirectDownloadUrl(rawUrl);

      const response = await fetch(directUrl);

      // Se o fetch falhar (CORS ou erro de rede), pula para o catch
      if (!response.ok) throw new Error('CORS or Network error');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Limpeza de memória
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // 🎯 FALLBACK: Força a abertura em uma nova aba
      const directUrl = convertToDirectDownloadUrl(rawUrl);

      // O parâmetro '_blank' garante a nova aba
      window.open(directUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloading(false);
    }
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

    // 2. Cálculos iniciais (Tamanho estimado baseado no alvo de 1.0MB)
    const firstPhotoGlobalIndex = photos.indexOf(targetList[0]);

    if (!confirmed && !isFavAction) {
      setShowVolumeDashboard(true);
      return;
    }

    // 3. Definição dinâmica de estados
    const setProgress = setDownloadProgress;
    const setStatus = isFavAction ? setIsDownloadingFavs : setIsDownloading;

    try {
      setStatus(true);
      setProgress(0);
      const zip = new JSZip();
      let completedCount = 0;

      // Otimização de concorrência baseada no dispositivo
      const batchSize = window.innerWidth < 768 ? 20 : 50; // Reduzido ligeiramente para estabilidade em fotos maiores

      // 4. Processamento em Lotes (Batches)
      for (let i = 0; i < targetList.length; i += batchSize) {
        const currentBatch = targetList.slice(i, i + batchSize);
        await Promise.all(
          currentBatch.map(async (photo, indexInBatch) => {
            try {
              let blob;
              const sizeInBytes = Number(photo.size) || 0;
              const tetoMaximo = TAMANHO_MAXIMO_FOTO_SEM_COMPACTAR;

              // 🎯 LÓGICA INTELIGENTE:
              // Se a foto já for menor que 1.5MB, baixa o original direto do Google.
              // Se for maior, usa o proxy para reduzir para 2560px.
              if (sizeInBytes > 0 && sizeInBytes <= tetoMaximo) {
                // Busca original (usando a função que você já tem de download direto)
                const res = await fetch(getDownloadUrl(photo.id));
                if (!res.ok) throw new Error('Erro no original');
                blob = await res.blob();
              } else {
                // Busca via Proxy para comprimir arquivos gigantes
                const proxyUrl = `/api/galeria/cover/${photo.id}?w=2560`;
                const res = await fetch(proxyUrl);
                if (!res.ok) throw new Error('Erro no proxy');
                blob = await res.blob();
              }

              const globalPhotoNumber =
                firstPhotoGlobalIndex + i + indexInBatch + 1;

              const finalFileName =
                galeria.rename_files_sequential === true ||
                galeria.rename_files_sequential === 'true'
                  ? `foto-${globalPhotoNumber}.jpg`
                  : photo.name || `foto-${globalPhotoNumber}.jpg`;

              zip.file(finalFileName, blob, { binary: true });
            } catch (e) {
              console.error(`Falha na foto ${photo.id}:`, e);
            } finally {
              completedCount++;
              setProgress((completedCount / targetList.length) * 95);
            }
          }),
        );

        // Respiro para a Main Thread
        if (i + batchSize < targetList.length)
          await new Promise((r) =>
            setTimeout(r, window.innerWidth < 768 ? 400 : 150),
          );
      }

      // 5. Geração do arquivo final (Blob)
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE', // Não comprimimos novamente para poupar CPU do cliente
        streamFiles: true,
      });

      // 6. Nomeação e Download
      saveAs(content, `${galeria.title.replace(/\s+/g, '_')}_${zipSuffix}.zip`);

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

  const handleShare = () => {
    const url = window.location.href;
    const title = galeria.title;

    const customTemplate = galeria.photographer?.message_templates?.guest_share;
    let shareText: string;

    if (customTemplate && customTemplate.trim() !== '') {
      shareText = formatMessage(customTemplate, galeria, url);
    } else {
      shareText = GALLERY_MESSAGES.GUEST_SHARE(title, url);
    }

    executeShare({
      title: title,
      text: shareText,
    });
  };

  return (
    <div className="relative w-full">
      <div
        ref={anchorRef}
        className="absolute top-0 h-10 w-full pointer-events-none"
      />

      {/* INFO BARS */}
      <div className="sticky top-0 z-[100] w-full pointer-events-none">
        <ToolBarDesktop
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
            handleExternalDownload,
            externalLinks,
            setUpsellFeature,
          }}
          tags={tagsDaGaleria}
          handleShare={handleShare}
        />
        <ToolBarMobile
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
            handleExternalDownload,
            externalLinks,
          }}
          tags={tagsDaGaleria}
          handleShare={handleShare}
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
        <DownloadCenterModal
          isOpen={showVolumeDashboard}
          onClose={() => setShowVolumeDashboard(false)}
          volumes={VOLUMES}
          favoriteVolumes={FAVORITE_VOLUMES}
          downloadedVolumes={downloadedVolumes}
          activeDownloadingIndex={activeDownloadingIndex}
          downloadProgress={downloadProgress}
          isDownloading={isDownloading}
          handleDownloadZip={handleDownloadZip}
          totalGallerySizeMB={totalGallerySizeMB}
        />
      )}

      {/* BOTÃO FLUTUANTE DE DOWNLOAD FAVORITOS */}
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
              <span className="text-[11px] font-bold uppercase tracking-luxury-tight">
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
          onNavigateToIndex={(index) => setSelectedPhotoIndex(index)}
        />
      )}
      <UpgradeModal
        isOpen={!!upsellFeature}
        onClose={() => setUpsellFeature(null)}
        featureName={upsellFeature?.label || ''}
        featureKey={upsellFeature?.feature as any}
      />
    </div>
  );
}
