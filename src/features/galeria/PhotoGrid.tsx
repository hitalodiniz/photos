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
  TAMANHO_MAXIMO_FOTO_SEM_COMPACTAR,
} from '@/core/utils/url-helper';
import {
  groupPhotosByWeight,
  estimatePhotoDownloadSize,
} from '@/core/utils/foto-helpers';

import { ToolBarMobile } from './ToolBarMobile';

import UpgradeModal from '@/components/ui/UpgradeModal';

import { getGalleryPermission } from '@/core/utils/plan-helpers';

import { DownloadCenterModal } from './DownloadCenterModal';
import { emitGaleriaEvent } from '@/core/services/galeria-stats.service';
import { useShare } from '@/hooks/useShare';
import { ConfirmationModal } from '@/components/ui';
import { saveGaleriaSelectionAction } from '@/core/services/galeria.service';

export default function PhotoGrid({ photos, galeria }: any) {
  // --- 1. ESTADOS DE INTERFACE ---
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  );
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

  // --- 2. ESTADOS DE CONFIRMAÇÃO DE SELEÇÃO ---
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSavingSelections, setIsSavingSelections] = useState(false);

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

  const storageKey = `favoritos_galeria_${galeria.id}`;

  // --- 4. MEMOS (CÁLCULOS) ---

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

  // 🎯 MAPEAMENTO DE TAGS NAS FOTOS (Crucial para o filtro funcionar)
  const photosWithTags = useMemo(() => {
    const safePhotos = Array.isArray(photos) ? photos : [];
    if (!galeria?.photo_tags) return safePhotos;

    try {
      const parsedTags = parsePossiblySerializedJson(galeria.photo_tags);

      if (!Array.isArray(parsedTags)) return safePhotos;

      // Em produção, pequenas variações de formato (espaços/case) podem quebrar o match.
      // Normalizamos ID e TAG para garantir consistência entre ambientes.
      const tagsMap = new Map(
        parsedTags
          .filter((t: any) => t?.id != null)
          .map((t: any) => [normalizeId(t.id), normalizeTag(t.tag)]),
      );

      return safePhotos.map((p: any) => ({
        ...p,
        tag: tagsMap.get(normalizeId(p.id)) || normalizeTag(p.tag) || p.tag, // Prioriza o mapa normalizado, com fallback para valor original
      }));
    } catch (err) {
      console.error('Erro ao processar tags no Grid:', err);
      return safePhotos;
    }
  }, [photos, galeria?.photo_tags]);

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

  // Não precisamos mais calcular tagsDaGaleria aqui se o ToolBar faz isso,
  // mas vamos manter para compatibilidade se algo mais usar.
  // Agora usando photosWithTags, ele vai popular corretamente.
  const tagsDaGaleria = useMemo(
    () => [
      'Todas as fotos',
      ...Array.from(
        new Set(photosWithTags.map((p: any) => p.tag).filter(Boolean)),
      ),
    ],
    [photosWithTags],
  );

  // Substitua o filtro do displayedPhotos por este:
  const displayedPhotos = useMemo(
    () =>
      photosWithTags.filter((photo: any) => {
        const matchesFavorite = showOnlyFavorites
          ? favorites.includes(photo.id)
          : true;

        // 🎯 Se o array estiver vazio, exibe todas.
        // Se tiver algo, verifica se a tag da foto está no array.
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

  // --- 5. EFFECTS (LÓGICA E SINCRONIZAÇÃO) ---

  // Persistência: Carregar (30 dias)
  // 1. CARREGAR E RENOVAR (Roda ao abrir a página)
  useEffect(() => {
    // 1. Prioridade: Dados já salvos no banco de dados da galeria
    if (galeria.selection_ids && galeria.selection_ids.length > 0) {
      setFavorites(galeria.selection_ids);
      return;
    }
    // 2. Fallback: LocalStorage (para seleções em rascunho/sessão atual)
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
  }, [galeria.selection_ids, storageKey]);

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
    const handleScroll = () => {
      // Define isScrolled para a estética da Toolbar (20px)
      const scrolled = window.scrollY > 1;
      setIsScrolled(scrolled);

      // O botão de favoritos aparece após o usuário rolar 150px
      // (suficiente para sair do impacto inicial do Hero)
      setCanShowFavButton(window.scrollY > 1);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 🎯 Para Favoritos (Lógica Composta: Plano + Switch da Galeria)
  const canUseFavorites = useMemo(() => {
    const planAllows = !!getGalleryPermission(galeria, 'canFavorite');
    const isEnabledOnGallery = !!galeria.enable_favorites;
    return planAllows && isEnabledOnGallery;
  }, [galeria]);

  const canUseSlideshow = useMemo(() => {
    const planAllows = !!getGalleryPermission(galeria, 'canShowSlideshow');

    // Validação específica da Galeria (Switch manual)
    const isEnabledOnGallery = !!galeria.enable_slideshow;

    return planAllows && isEnabledOnGallery;
  }, [galeria]);

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
    const firstPhotoGlobalIndex = photosWithTags.indexOf(targetList[0]);

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

              const res = await fetch(
                getDownloadDirectGoogleUrl(photo.id, RESOLUTIONS.DOWNLOAD),
              );
              if (!res.ok) throw new Error('Erro no original');
              blob = await res.blob();

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

      emitGaleriaEvent({
        galeria: galeria,
        eventType: 'download',
        metadata: {
          count: targetList.length,
          type: isFavAction ? 'favorites' : 'all',
          suffix: zipSuffix,
        },
      });
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
  const downloadAllAsZip = () =>
    handleDownloadZip(photosWithTags, 'completa', false);

  // 🎯 SALVAR A SELEÇÃO DE FOTOS (IDs) DO CLIENTE
  const handleSaveSelections = async () => {
    if (favorites.length === 0) return;
    if (galeria.selection_ids?.length > 0) return;

    setIsSavingSelections(true);
    try {
      const result = await saveGaleriaSelectionAction(galeria, favorites);

      if (result.success) {
        // Opcional: Feedback visual de sucesso antes de fechar
        setIsConfirmModalOpen(false);
        // Você pode redirecionar ou mostrar um Toast aqui
      } else {
        console.error('Erro ao salvar:', result.error);
        alert(result.error);
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
      galeria: galeria,
      eventType: 'share',
      metadata: { method: 'web_share', title: galeria.title },
    });
    shareAsGuest();
  };

  return (
    <div className="relative w-full">
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
            downloadAllAsZip: () => setShowVolumeDashboard(true),
            isScrolled,
            isHovered,
            setIsHovered,
            handleShare,
            handleExternalDownload,
            externalLinks,
            setUpsellFeature,
            getGalleryPermission,
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
            canUseFavorites: canUseFavorites && galeria.enable_favorites,
            tagSelectionMode: 'single',
          }}
          /* 🎯 AJUSTE CHAVE: Alterna entre Marcação (admin) e Coração (public) */
          mode={galeria.has_contracting_client === 'ES' ? 'admin' : 'public'}
          allowLightboxInAdmin={galeria.has_contracting_client === 'ES'} // 🎯 Ativa o lightbox mesmo em modo seleção
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
          canUseFavorites={canUseFavorites && galeria.enable_favorites}
        />
      )}

      {/* BOTÃO FLUTUANTE DE DOWNLOAD FAVORITOS */}

      {favorites.length > 0 &&
        !showVolumeDashboard &&
        canShowFavButton &&
        canUseFavorites && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] animate-in fade-in zoom-in slide-in-from-bottom-5 duration-300 w-fit">
            {galeria.has_contracting_client === 'ES' ? (
              /* --- LOGICA PARA ENSAIO (ES) --- */
              <div className="flex items-center gap-2 p-1.5">
                {!showOnlyFavorites && galeria.selection_ids?.length === 0 ? (
                  /* ESTADO 1: VER SELECIONADAS (BOTÃO INICIAL) */
                  <button
                    onClick={() => setShowOnlyFavorites(true)}
                    className="flex items-center justify-center rounded-luxury h-12 bg-white text-black border border-white/20 shadow-xl hover:scale-105 active:scale-95 transition-all px-8 gap-3 min-w-[200px]"
                  >
                    <Eye size={18} className="text-petroleum" />
                    <div className="flex flex-col items-start leading-tight text-left">
                      <span className="text-[11px] font-bold uppercase tracking-widest">
                        Ver Selecionadas
                      </span>
                      <span className="text-[9px] font-bold opacity-60 italic">
                        {favorites.length}{' '}
                        {favorites.length === 1 ? 'foto' : 'fotos'}
                      </span>
                    </div>
                  </button>
                ) : (
                  <>
                    {/* ESTADO 2: FILTRO ATIVO (DUAS OPÇÕES) */}
                    {galeria.selection_ids?.length === 0 && (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                        {/* BOTÃO VOLTAR / CONTINUAR */}
                        <button
                          onClick={() => setShowOnlyFavorites(false)}
                          className="flex items-center justify-center rounded-luxury h-12 bg-petroleum text-white border border-white/10 hover:bg-petroleum-light transition-all px-5 gap-2"
                        >
                          <ArrowLeft size={18} />
                          <span className="text-[10px] font-semibold uppercase tracking-widest">
                            Continuar seleção
                          </span>
                        </button>

                        {/* BOTÃO FINALIZAR (DESTAQUE) */}
                        <button
                          onClick={() => setIsConfirmModalOpen(true)}
                          className="flex items-center justify-center rounded-luxury h-12 bg-gold text-black border border-black/10 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-all px-5 gap-2"
                        >
                          <CheckCircle2 size={18} strokeWidth={2.5} />
                          <div className="flex flex-col items-start leading-tight text-left">
                            <span className="text-[11px] font-semibold uppercase tracking-widest">
                              Enviar Seleção
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
              /* --- BOTÃO PADRÃO PARA OUTROS TIPOS (BAIXAR) --- */
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
          canUseFavorites={galeria.enable_favorites && canUseFavorites} // 🎯 Trava dinâmica
          canUseSlideshow={galeria.enable_slideshow && canUseSlideshow} // 🎯 Trava dinâmica
          onToggleFavorite={toggleFavoriteFromGrid}
          onClose={() => setSelectedPhotoIndex(null)}
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
        />
      )}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={async () => {
          // Aqui entra a lógica de envio da seleção (ex: API call)
          await handleSaveSelections();
          setIsConfirmModalOpen(false);
        }}
        variant="primary" // "primary" usa o padrão Gold/Info do seu código
        title="Finalizar Seleção"
        confirmText="Sim, Enviar Seleção"
        isLoading={isSavingSelections}
        message={
          <div className="space-y-2">
            <p>
              Você selecionou <strong>{favorites.length} fotos</strong>.
            </p>
            <p>
              Ao confirmar, sua seleção será enviada para o fotógrafo e não
              poderá mais ser alterada através deste link.
            </p>
            <p className="text-[11px] mt-4 opacity-70">
              Esta ação encerra sua etapa de escolha.
            </p>
          </div>
        }
      />
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
