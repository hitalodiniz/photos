'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, CheckCircle2, Download, Eye, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import Lightbox from './Lightbox';
import { ToolBarDesktop } from './ToolBarDesktop';
import MasonryGrid from './MasonryGrid';
import {
  convertToDirectDownloadUrl,
  getDownloadDirectGoogleUrl,
  RESOLUTIONS,
} from '@/core/utils/url-helper';
import {
  groupPhotosByWeight,
  estimatePhotoDownloadSize,
} from '@/core/utils/foto-helpers';
import { ToolBarMobile } from './ToolBarMobile';
import UpgradeModal from '@/components/ui/UpgradeModal';
import { getGalleryPermission } from '@/core/utils/plan-helpers';
import { DownloadCenterSheet } from './DownloadCenterSheet';
import { emitGaleriaEvent } from '@/core/services/galeria-stats.service';
import { useShare } from '@/hooks/useShare';
import { usePlan } from '@/core/context/PlanContext';
import {
  ZIP_LIMIT_TO_RESOLUTION,
  MAX_PHOTOS_PER_GALLERY_BY_PLAN,
} from '@/core/config/plans';
import { ConfirmationModal, Toast } from '@/components/ui';
import { saveGaleriaSelectionAction } from '@/core/services/galeria.service';
import { GaleriaTour } from './ToolBarDesktopTour';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { span } from 'framer-motion/client';

export default function PhotoGrid({
  photos,
  galeria,
  canStartTour = true,
}: any) {
  const isMobile = useIsMobile();
  const { planKey, permissions } = usePlan();

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  );
  const [showSelectionFromUrl, setShowSelectionFromUrl] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [activeTag, setActiveTag] = useState<string[]>([]);
  const [showVolumeDashboard, setShowVolumeDashboard] = useState(false);
  const [canShowFavButton, setCanShowFavButton] = useState(false);
  const [upsellFeature, setUpsellFeature] = useState<{
    label: string;
    feature: string;
  } | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSavingSelections, setIsSavingSelections] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloadingFavs, setIsDownloadingFavs] = useState(false);
  const [downloadedVolumes, setDownloadedVolumes] = useState<number[]>([]);
  const [activeDownloadingIndex, setActiveDownloadingIndex] = useState<
    number | string | null
  >(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [lastLightboxClosedAt, setLastLightboxClosedAt] = useState<
    number | null
  >(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const storageKey = `favoritos_galeria_${galeria.id}`;

  const parsePossiblySerializedJson = (input: unknown): unknown => {
    let current = input;
    for (let i = 0; i < 3; i++) {
      if (typeof current !== 'string') break;
      const trimmed = current.trim();
      if (!trimmed) return [];
      try {
        current = JSON.parse(trimmed);
      } catch {
        break;
      }
    }
    return current;
  };

  const normalizeTag = (value: unknown) =>
    String(value || '')
      .trim()
      .toUpperCase();
  const normalizeId = (value: unknown) => String(value || '').trim();
  const maxPhotosByPlan =
    MAX_PHOTOS_PER_GALLERY_BY_PLAN[planKey] ??
    MAX_PHOTOS_PER_GALLERY_BY_PLAN.FREE;
  const effectiveGalleryPhotoLimit =
    typeof galeria?.photo_count === 'number' && galeria.photo_count >= 0
      ? Math.min(galeria.photo_count, maxPhotosByPlan)
      : maxPhotosByPlan;

  const photosWithTags = useMemo(() => {
    const safePhotos = Array.isArray(photos) ? photos : [];
    const withType = (p: any) => ({
      ...p,
      type: p.mimeType?.startsWith('video/')
        ? ('video' as const)
        : ('photo' as const),
    });
    if (!galeria?.photo_tags)
      return safePhotos.map(withType).slice(0, effectiveGalleryPhotoLimit);
    try {
      const parsedTags = parsePossiblySerializedJson(galeria.photo_tags);
      if (!Array.isArray(parsedTags))
        return safePhotos.map(withType).slice(0, effectiveGalleryPhotoLimit);
      const tagsMap = new Map(
        parsedTags
          .filter((t: any) => t?.id != null)
          .map((t: any) => [normalizeId(t.id), normalizeTag(t.tag)]),
      );
      return safePhotos
        .map((p: any) =>
          withType({
            ...p,
            tag: tagsMap.get(normalizeId(p.id)) || normalizeTag(p.tag) || p.tag,
          }),
        )
        .slice(0, effectiveGalleryPhotoLimit);
    } catch (err) {
      console.error('Erro ao processar tags no Grid:', err);
      return safePhotos.map(withType).slice(0, effectiveGalleryPhotoLimit);
    }
  }, [photos, galeria?.photo_tags, effectiveGalleryPhotoLimit]);

  const VOLUMES = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const LIMIT = (isMobile ? 200 : 500) * 1024 * 1024;
    return groupPhotosByWeight(photosWithTags, LIMIT);
  }, [photosWithTags]);

  const FAVORITE_VOLUMES = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const LIMIT = (isMobile ? 200 : 500) * 1024 * 1024;
    const targetList = favorites
      .map((id) => photosWithTags.find((p: any) => p.id === id))
      .filter(Boolean);
    return groupPhotosByWeight(targetList, LIMIT);
  }, [favorites, photosWithTags]);

  const totalGallerySizeMB = useMemo(() => {
    return (
      photosWithTags.reduce(
        (acc: number, p: any) => acc + estimatePhotoDownloadSize(p),
        0,
      ) /
      (1024 * 1024)
    );
  }, [photosWithTags]);

  const tagsDaGaleria = useMemo(
    () => [
      'Todas as fotos',
      ...Array.from(
        new Set(photosWithTags.map((p: any) => p.tag).filter(Boolean)),
      ),
    ],
    [photosWithTags],
  );
  const hasRealTags = tagsDaGaleria.length > 1;

  const displayedPhotos = useMemo(
    () =>
      photosWithTags.filter((photo: any) => {
        const matchesFavorite = showOnlyFavorites
          ? favorites.includes(photo.id)
          : true;
        const selectedTags = Array.isArray(activeTag)
          ? activeTag.map(normalizeTag)
          : [normalizeTag(activeTag)];
        const photoTag = normalizeTag(photo.tag);
        const matchesTag =
          selectedTags.length === 0 || selectedTags.includes(photoTag);
        return matchesFavorite && matchesTag;
      }),
    [photosWithTags, showOnlyFavorites, favorites, activeTag],
  );

  const [columns, setColumns] = useState({
    mobile: Math.min(2, galeria.columns_mobile || 2),
    tablet: Math.min(5, Math.max(2, galeria.columns_tablet || 3)),
    desktop: Math.min(8, Math.max(3, galeria.columns_desktop || 5)),
  });

  useEffect(() => {
    if (galeria.selection_ids && galeria.selection_ids.length > 0) {
      setFavorites(galeria.selection_ids);
      return;
    }
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const { items, timestamp } = JSON.parse(savedData);
        const isExpired = Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000;
        if (isExpired) {
          localStorage.removeItem(storageKey);
          setFavorites([]);
        } else {
          setFavorites(items || []);
          localStorage.setItem(
            storageKey,
            JSON.stringify({ items, timestamp: Date.now() }),
          );
        }
      } catch (e) {
        console.error('Erro ao processar favoritos:', e);
      }
    }
  }, [galeria.selection_ids, storageKey]);

  useEffect(() => {
    if (favorites.length > 0) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ items: favorites, timestamp: Date.now() }),
      );
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [favorites, storageKey]);

  useEffect(() => {
    const updateFabVisibility = () => {
      if (typeof window === 'undefined') return;
      const scrolled = window.scrollY > 1;
      setIsScrolled(scrolled);
      // Com poucas fotos a página não gera scroll: scrollY fica 0 e o FAB sumia.
      // Se não há overflow rolável, exibir o botão mesmo no topo.
      const hasScrollableOverflow =
        document.documentElement.scrollHeight > window.innerHeight + 8;
      setCanShowFavButton(scrolled || !hasScrollableOverflow);
    };
    updateFabVisibility();
    const raf = requestAnimationFrame(() => updateFabVisibility());
    window.addEventListener('scroll', updateFabVisibility, { passive: true });
    window.addEventListener('resize', updateFabVisibility);
    const gridEl = gridRef.current;
    const ro =
      gridEl && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateFabVisibility())
        : null;
    if (gridEl && ro) ro.observe(gridEl);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('scroll', updateFabVisibility);
      window.removeEventListener('resize', updateFabVisibility);
    };
  }, [photosWithTags.length, favorites.length]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const selectionParam = urlParams.get('selection');
      if (selectionParam === 'true' && galeria.selection_ids?.length > 0) {
        setShowSelectionFromUrl(true);
        setShowOnlyFavorites(true);
        setFavorites(galeria.selection_ids);
      }
    }
  }, [galeria.selection_ids]);

  const canUseFavorites = useMemo(() => {
    const planAllows = !!getGalleryPermission(galeria, 'canFavorite');
    const isEnabledOnGallery = !!galeria.enable_favorites;
    return planAllows && isEnabledOnGallery;
  }, [galeria]);

  const canUseSlideshow = useMemo(() => {
    const planAllows = !!getGalleryPermission(galeria, 'canShowSlideshow');
    const isEnabledOnGallery = !!galeria.enable_slideshow;
    return planAllows && isEnabledOnGallery;
  }, [galeria]);

  const canDownloadFavorites = useMemo(
    () => canUseFavorites && FAVORITE_VOLUMES.length > 0,
    [canUseFavorites, FAVORITE_VOLUMES],
  );

  const parseLinks = (
    jsonString: string | null | undefined,
  ): { url: string; label: string }[] => {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        return parsed.map((item, index) => {
          if (typeof item === 'object' && item !== null) {
            return {
              url: item.url || '',
              label: item.label || `Link ${index + 1}`,
            };
          }
          return { url: String(item), label: `Link ${index + 1}` };
        });
      }
      return [{ url: jsonString, label: 'Qualidade Maxima' }];
    } catch {
      return [{ url: jsonString, label: 'Qualidade Maxima' }];
    }
  };

  const externalLinks = useMemo(
    () => parseLinks(galeria?.zip_url_full),
    [galeria?.zip_url_full],
  );

  const toggleFavoriteFromGrid = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const handleExternalDownload = async (rawUrl: string, filename: string) => {
    if (isDownloading) return;
    try {
      setIsDownloading(true);
      const directUrl = convertToDirectDownloadUrl(rawUrl);
      const response = await fetch(directUrl);
      if (!response.ok) throw new Error('CORS or Network error');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const directUrl = convertToDirectDownloadUrl(rawUrl);
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
    if (isDownloading || isDownloadingFavs || targetList.length === 0) return;
    if (chunkIndex !== undefined) setActiveDownloadingIndex(chunkIndex);
    if (!confirmed && !isFavAction) {
      setShowVolumeDashboard(true);
      return;
    }

    const zipSizeLimitBytes = permissions.zipSizeLimitBytes;
    const targetResolution = ZIP_LIMIT_TO_RESOLUTION[zipSizeLimitBytes] ?? 1600;
    const setProgress = setDownloadProgress;
    const setStatus = isFavAction ? setIsDownloadingFavs : setIsDownloading;
    const firstPhotoGlobalIndex = photosWithTags.indexOf(targetList[0]);

    try {
      setStatus(true);
      setProgress(0);
      const zip = new JSZip();
      let completedCount = 0;
      const batchSize = window.innerWidth < 768 ? 20 : 50;

      for (let i = 0; i < targetList.length; i += batchSize) {
        const currentBatch = targetList.slice(i, i + batchSize);
        await Promise.all(
          currentBatch.map(async (photo, indexInBatch) => {
            try {
              const sizeInBytes = Number(photo.size) || 0;
              let url: string;
              if (targetResolution === 0 || sizeInBytes <= zipSizeLimitBytes) {
                url = getDownloadDirectGoogleUrl(
                  photo.id,
                  RESOLUTIONS.DOWNLOAD,
                );
              } else {
                url = getDownloadDirectGoogleUrl(photo.id, targetResolution);
              }
              const res = await fetch(url);
              if (!res.ok) throw new Error('Erro no download');
              const blob = await res.blob();
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
        if (i + batchSize < targetList.length)
          await new Promise((r) =>
            setTimeout(r, window.innerWidth < 768 ? 400 : 150),
          );
      }

      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE',
        streamFiles: true,
      });
      saveAs(content, `${galeria.title.replace(/\s+/g, '_')}_${zipSuffix}.zip`);
      setProgress(100);
      if (typeof chunkIndex === 'number')
        setDownloadedVolumes((prev) => [...new Set([...prev, chunkIndex])]);
      emitGaleriaEvent({
        galeria,
        eventType: isFavAction ? 'download_favorites' : 'download',
        metadata: {
          count: targetList.length,
          suffix: zipSuffix,
          volume: typeof chunkIndex === 'number' ? chunkIndex + 1 : undefined,
        },
      });
    } catch (error) {
      console.error('Erro critico na geracao do ZIP:', error);
    } finally {
      setTimeout(() => {
        setStatus(false);
        setProgress(0);
        setActiveDownloadingIndex(null);
      }, 1500);
    }
  };

  const handleDownloadFavorites = () => setShowVolumeDashboard(true);

  const handleSaveSelections = async () => {
    if (favorites.length === 0) return;
    if (galeria.selection_ids?.length > 0) return;
    setIsSavingSelections(true);
    try {
      const result = await saveGaleriaSelectionAction(galeria, favorites);
      if (result.success) {
        await emitGaleriaEvent({
          galeria,
          eventType: 'selection',
          metadata: {
            id_fotos_selecionadas: favorites,
            quantidade_fotos_selecionadas: favorites.length,
          },
        });
        setToast({
          message: 'Seleção enviada com sucesso! O fotografo sera notificado.',
          type: 'success',
        });
        setIsConfirmModalOpen(false);
      } else {
        console.error('Erro ao salvar:', result.error);
        setToast({ message: `Erro ao enviar: ${result.error}`, type: 'error' });
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      setIsSavingSelections(false);
    }
  };

  const { shareAsGuest } = useShare({ galeria });
  const handleShare = async () => {
    emitGaleriaEvent({
      galeria,
      eventType: 'share',
      metadata: { method: 'web_share', title: galeria.title },
    });
    shareAsGuest();
  };

  const themeKey =
    galeria?.theme_key && galeria.theme_key.trim() !== ''
      ? galeria.theme_key
      : undefined;

  return (
    <div
      className="relative w-full min-h-full"
      {...(themeKey ? { 'data-theme': themeKey } : {})}
    >
      {/* TOOLBARS — cada uma é sticky e carrega seu próprio data-theme */}
      {!isMobile && (
        <GaleriaTour
          galeriaId={galeria.id}
          canUseFavorites={canUseFavorites}
          hasTags={hasRealTags}
          canStartTour={canStartTour}
          onOpenDrawer={setOpenDrawer}
        />
      )}
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
          downloadAllAsZip: () => setShowVolumeDashboard(true),
          isScrolled,
          isHovered,
          setIsHovered,
          handleShare,
          handleExternalDownload,
          externalLinks,
          setUpsellFeature,
          getGalleryPermission,
          themeKey,
        }}
        tags={tagsDaGaleria}
        handleShare={handleShare}
        openDrawer={openDrawer}
        setOpenDrawer={setOpenDrawer}
      />
      <ToolBarMobile
        {...{
          galeria,
          photos,
          favorites,
          showOnlyFavorites,
          setShowOnlyFavorites,
          downloadAllAsZip: () => setShowVolumeDashboard(true),
          isDownloading,
          downloadProgress,
          isScrolled,
          columns,
          setColumns,
          activeTag,
          setActiveTag,
          handleShare,
          handleExternalDownload,
          externalLinks,
          getGalleryPermission,
          themeKey,
        }}
        tags={tagsDaGaleria}
        handleShare={handleShare}
      />

      {/* SEÇÃO EDITORIAL: DESCRIÇÃO DA GALERIA */}
      {typeof galeria.description === 'string' &&
        galeria.description.trim() !== '' && (
          <section
            className="relative w-full bg-white px-6 md:px-12 pt-6 pb-4 overflow-hidden"
            aria-label="Sobre esta galeria"
          >
            <div className="mx-auto max-w-[1200px] flex flex-col w-full">
              <div className="relative w-full py-2">
                <p className="relative text-left text-base md:text-[18px] leading-[1.8] tracking-tight animate-in fade-in duration-1000">
                  <span
                    className="inline font-serif text-[1.1em] md:text-[2em] leading-[1.8] text-gold/50 select-none mr-px align-top -top-10"
                    aria-hidden="true"
                  >
                    “
                  </span>
                  <span className="inline-block max-w-[calc(100%-1rem)] align-top font-sans font-light text-petroleum/80 whitespace-pre-line first-letter:text-6xl first-letter:font-serif first-letter:font-normal first-letter:mr-2 first-letter:float-left first-letter:text-gold first-letter:leading-[0.7] first-letter:mt-2">
                    {galeria.description.trim()}
                    <span
                      className="inline font-serif text-[1.1em] md:text-[1.15em] leading-[1.8] text-gold select-none ml-px align-baseline"
                      aria-hidden="true"
                    >
                      ”
                    </span>
                  </span>
                </p>
              </div>

              {/* 2. Divisor Final Total (Separação das Fotos) */}
              {/* Atravessa toda a largura do contêiner de 800px */}
              <div className="mt-1 w-full h-[1px] bg-gold/50 animate-in fade-in duration-1000 delay-300" />
            </div>

            {/* Espaçamento final refinado antes do grid de fotos */}
            <div className="w-full h-2" />
          </section>
        )}
      {/* GRID */}
      <div ref={gridRef} className="mt-1">
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
            canUseFavorites: canUseFavorites && galeria.enable_favorites,
            tagSelectionMode: 'manual',
          }}
          mode={galeria.has_contracting_client === 'ES' ? 'admin' : 'public'}
          allowLightboxInAdmin={galeria.has_contracting_client === 'ES'}
          galleryTitle={galeria.title}
        />
      </div>

      {/* CENTRAL DE DOWNLOADS */}
      <DownloadCenterSheet
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
        canUseFavorites={canUseFavorites && galeria.enable_favorites}
        canDownloadFavorites={canDownloadFavorites}
        showOnlyFavorites={showOnlyFavorites}
        downloadAllAsZip={() => {
          setShowVolumeDashboard(false);
          handleDownloadZip(photosWithTags, 'Completo', false, true, 'all');
        }}
        externalLinks={externalLinks}
        handleExternalDownload={handleExternalDownload}
        galeriaTitle={galeria.title}
        themeKey={themeKey}
      />

      {/* BOTÃO FLUTUANTE FAVORITOS */}
      {favorites.length > 0 && !showVolumeDashboard && canShowFavButton && (
        <div
          className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[150] animate-in fade-in zoom-in slide-in-from-bottom-5 duration-300 w-fit"
          {...(themeKey ? { 'data-theme': themeKey } : {})}
        >
          {galeria.has_contracting_client === 'ES' ? (
            <div className="flex items-center gap-2">
              {!showOnlyFavorites ? (
                <button
                  onClick={() => setShowOnlyFavorites(true)}
                  className="btn-luxury-primary"
                >
                  <Eye size={18} />
                  <div className="flex">
                    Ver {favorites.length}{' '}
                    {favorites.length === 1
                      ? 'foto selecionada'
                      : 'fotos selecionadas'}
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                  <button
                    type="button"
                    onClick={() => setShowOnlyFavorites(false)}
                    className="btn-secondary-white"
                  >
                    <ArrowLeft size={18} />
                    <div className="flex">Ver todas as fotos</div>
                  </button>
                  {galeria.selection_ids?.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setIsConfirmModalOpen(true)}
                      className="btn-luxury-primary"
                    >
                      <CheckCircle2 size={18} strokeWidth={2.5} />
                      <div className="flex">Enviar seleção</div>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleDownloadFavorites}
              disabled={isDownloadingFavs}
              className="btn-luxury-primary"
            >
              {isDownloadingFavs ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              <div className="flex">
                Baixar {favorites.length}{' '}
                {favorites.length === 1 ? 'foto favorita' : 'fotos favoritas'}
              </div>
            </button>
          )}
        </div>
      )}

      {/* LIGHTBOX */}
      {selectedPhotoIndex !== null && photosWithTags.length > 0 && (
        <Lightbox
          photos={displayedPhotos}
          activeIndex={selectedPhotoIndex}
          totalPhotos={displayedPhotos.length}
          galleryTitle={galeria.title}
          galeria={galeria}
          location={galeria.location || ''}
          favorites={favorites}
          canUseFavorites={galeria.enable_favorites && canUseFavorites}
          canUseSlideshow={galeria.enable_slideshow && canUseSlideshow}
          onToggleFavorite={toggleFavoriteFromGrid}
          lastClosedAt={lastLightboxClosedAt}
          onClose={() => {
            setLastLightboxClosedAt(Date.now());
            setSelectedPhotoIndex(null);
          }}
          onNext={() =>
            setSelectedPhotoIndex(
              (selectedPhotoIndex + 1) % displayedPhotos.length,
            )
          }
          onPrev={() =>
            setSelectedPhotoIndex(
              (selectedPhotoIndex - 1 + displayedPhotos.length) %
                displayedPhotos.length,
            )
          }
          onNavigateToIndex={(index) => setSelectedPhotoIndex(index)}
          mode={
            galeria.has_contracting_client === 'ES' ? 'selection' : 'favorite'
          }
        />
      )}

      {/* CONFIRMAÇÃO SELEÇÃO */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={async () => {
          await handleSaveSelections();
          setIsConfirmModalOpen(false);
        }}
        variant="primary"
        title="Finalizar Seleção"
        confirmText="Sim, Enviar seleção"
        isLoading={isSavingSelections}
        themeKey={themeKey}
        message={
          <div className="space-y-2">
            <p>
              Voce selecionou <strong>{favorites.length} fotos</strong>.
            </p>
            <p>
              Ao confirmar, sua seleção sera enviada para o fotógrafo e nao
              podera mais ser alterada atraves deste link.
            </p>
            <p className="text-[11px] mt-4 opacity-70">
              Esta acao encerra sua etapa de escolha.
            </p>
          </div>
        }
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <UpgradeModal
        isOpen={!!upsellFeature}
        onClose={() => setUpsellFeature(null)}
        featureName={upsellFeature?.label || ''}
        featureKey={upsellFeature?.feature as any}
        scenarioType="feature"
      />
    </div>
  );
}
