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

export default function PhotoGrid({ photos, galeria }: any) {
  const { planKey, permissions } = usePlan();

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  );
  const [showSelectionFromUrl, setShowSelectionFromUrl] = useState(false);
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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 1);
      setCanShowFavButton(window.scrollY > 1);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          message: 'Selecao enviada com sucesso! O fotografo sera notificado.',
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
      {favorites.length > 0 &&
        !showVolumeDashboard &&
        canShowFavButton &&
        canUseFavorites && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] animate-in fade-in zoom-in slide-in-from-bottom-5 duration-300 w-fit"
            {...(themeKey ? { 'data-theme': themeKey } : {})}
          >
            {galeria.has_contracting_client === 'ES' ? (
              <div className="flex items-center gap-2 p-1.5">
                {!showOnlyFavorites && galeria.selection_ids?.length === 0 ? (
                  <button
                    onClick={() => setShowOnlyFavorites(true)}
                    className="flex items-center justify-center rounded-luxury h-12 bg-white text-black border border-white/20 shadow-xl hover:scale-105 active:scale-95 transition-all px-8 gap-3 min-w-[200px]"
                  >
                    <Eye size={18} className="text-petroleum" />
                    <div className="flex flex-col items-start leading-tight text-left">
                      <span className="text-[11px] font-bold uppercase tracking-widest">
                        Ver Selecionados
                      </span>
                      <span className="text-[9px] font-bold opacity-60 italic">
                        {favorites.length}{' '}
                        {favorites.length === 1 ? 'foto' : 'fotos'}
                      </span>
                    </div>
                  </button>
                ) : (
                  <>
                    {galeria.selection_ids?.length === 0 && (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                        <button
                          onClick={() => setShowOnlyFavorites(false)}
                          className="flex items-center justify-center rounded-luxury h-12 bg-petroleum text-white border border-white/10 hover:bg-petroleum-light transition-all px-5 gap-2"
                        >
                          <ArrowLeft size={18} />
                          <span className="text-[9px] md:text-[11px] font-semibold uppercase tracking-widest">
                            Continuar selecao
                          </span>
                        </button>
                        <button
                          onClick={() => setIsConfirmModalOpen(true)}
                          className="flex items-center justify-center rounded-luxury h-12 bg-gold text-black border border-black/10 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-all px-5 gap-2"
                        >
                          <CheckCircle2 size={18} strokeWidth={2.5} />
                          <div className="flex flex-col items-start leading-tight text-left">
                            <span className="text-[9px] md:text-[11px] font-semibold uppercase tracking-widest">
                              Enviar Selecao
                            </span>
                            <span className="text-[9px] font-semibold opacity-80 italic">
                              Concluir Etapa
                            </span>
                          </div>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleDownloadFavorites}
                disabled={isDownloadingFavs}
                className="flex items-center justify-center rounded-luxury h-12 bg-champagne text-black border border-white/20 shadow-2xl hover:scale-105 active:scale-95 transition-all px-6 gap-3"
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
                    {favorites.length}{' '}
                    {favorites.length === 1 ? 'foto' : 'fotos'}
                  </span>
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
        title="Finalizar Selecao"
        confirmText="Sim, Enviar Selecao"
        isLoading={isSavingSelections}
        themeKey={themeKey}
        message={
          <div className="space-y-2">
            <p>
              Voce selecionou <strong>{favorites.length} fotos</strong>.
            </p>
            <p>
              Ao confirmar, sua selecao sera enviada para o fotografo e nao
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
