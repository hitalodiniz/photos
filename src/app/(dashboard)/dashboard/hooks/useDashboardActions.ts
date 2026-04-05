'use client';

import { useState } from 'react';
import type { Galeria } from '@/core/types/galeria';
import type { Profile } from '@/core/types/profile';
import {
  MAX_GALLERIES_HARD_CAP_BY_PLAN,
  PHOTO_CREDITS_BY_PLAN,
  MAX_PHOTOS_PER_GALLERY_BY_PLAN,
  type PlanKey,
} from '@/core/config/plans';
import {
  moveToTrash,
  restoreGaleria,
  toggleArchiveGaleria,
  deleteGalleryPermanently,
  toggleShowOnProfile,
  syncGaleriaPhotoCount,
} from '@/core/services/galeria.service';
import {
  revalidateDrivePhotos,
  revalidateProfile,
  revalidateGalleryCache,
} from '@/actions/revalidate.actions';
import { authService } from '@photos/core-auth';

/** Limites do plano para validar sync (máx. por galeria e pool total). */
export type DashboardPlanLimits = {
  maxPhotosPerGallery: number;
  photoCredits: number;
};

export function useDashboardActions(
  galerias: Galeria[],
  setGalerias: React.Dispatch<React.SetStateAction<Galeria[]>>,
  photographer: Profile | null,
  setToast: (
    toast: { message: string; type: 'success' | 'error' } | null,
  ) => void,
  currentView: 'active' | 'archived' | 'trash',
  planLimits?: DashboardPlanLimits | null,
  /** Modo suporte: sync e updates usam service role no servidor. */
  impersonateUserId?: string,
) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [galeriaToPermanentlyDelete, setGaleriaToPermanentlyDelete] =
    useState<Galeria | null>(null);
  const [limitModalAfterSync, setLimitModalAfterSync] = useState<{
    planLimit: number;
    photoCount: number;
  } | null>(null);

  // Helper interno para evitar repetição e garantir que username/id existam
  const triggerProfileRevalidation = async () => {
    if (photographer?.username && photographer?.id) {
      await revalidateProfile(photographer.username, photographer.id);
    }
  };

  const handleArchiveToggle = async (g: Galeria) => {
    const isCurrentlyArchived = g.is_archived || g.auto_archived;
    const newStatus = !isCurrentlyArchived; // Se está arquivada, queremos desarquivar (false)

    // Ao desarquivar, respeitar limites de plano (galerias ativas e pool de arquivos)
    if (!newStatus && photographer) {
      const planKey = (photographer.plan_key ?? 'FREE') as PlanKey;
      const galleryLimit = MAX_GALLERIES_HARD_CAP_BY_PLAN[planKey] ?? 3;
      const photoLimit =
        planLimits?.photoCredits ?? PHOTO_CREDITS_BY_PLAN[planKey];
      const maxPhotosPerGallery =
        planLimits?.maxPhotosPerGallery ??
        MAX_PHOTOS_PER_GALLERY_BY_PLAN[planKey];

      const activeGalleries = galerias.filter(
        (item) =>
          !item.is_deleted &&
          !item.is_archived &&
          !item.auto_archived &&
          item.id !== g.id,
      );

      const currentGalleryCount = activeGalleries.length;
      const currentPhotoSum = activeGalleries.reduce(
        (sum, item) => sum + (item.photo_count ?? 0),
        0,
      );

      const candidatePhotos = g.photo_count ?? 0;

      const respectsSingleGalleryLimit = candidatePhotos <= maxPhotosPerGallery;
      const fitsInGlobalGalleryLimit = currentGalleryCount < galleryLimit;
      const fitsInGlobalPhotoLimit =
        currentPhotoSum + candidatePhotos <= photoLimit;

      if (
        !respectsSingleGalleryLimit ||
        !fitsInGlobalGalleryLimit ||
        !fitsInGlobalPhotoLimit
      ) {
        // Explica claramente qual limite foi atingido (galerias ou cota de arquivos)
        let message: string;
        const canSuggestUpgrade = planKey !== 'PREMIUM';
        if (!respectsSingleGalleryLimit) {
          message = canSuggestUpgrade
            ? `Esta galeria tem mais arquivos (${candidatePhotos}) do que o limite por galeria do seu plano (${maxPhotosPerGallery}). Faça upgrade do seu plano para reativar.`
            : `Esta galeria tem mais arquivos (${candidatePhotos}) do que o limite por galeria do seu plano (${maxPhotosPerGallery}).`;
        } else if (!fitsInGlobalGalleryLimit) {
          message = canSuggestUpgrade
            ? `Seu plano permite no máximo ${galleryLimit} galerias ativas. Você já atingiu esse limite. Faça upgrade do seu plano para reativar mais galerias.`
            : `Seu plano permite no máximo ${galleryLimit} galerias ativas. Você já atingiu esse limite.`;
        } else if (!fitsInGlobalPhotoLimit) {
          message = canSuggestUpgrade
            ? `A cota de arquivos do seu plano (${photoLimit} arquivos) não comporta reativar esta galeria. Faça upgrade do seu plano para aumentar a cota.`
            : `A cota de arquivos do seu plano (${photoLimit} arquivos) não comporta reativar esta galeria.`;
        } else {
          message = 'Não foi possível reativar a galeria com o plano atual.';
        }
        setToast({ message, type: 'error' });
        return;
      }
    }

    setUpdatingId(g.id);

    // A service espera o status atual (is_archived || auto_archived), não o novo.
    const result = await toggleArchiveGaleria(g.id, isCurrentlyArchived);

    if (result.success) {
      setGalerias((prev) =>
        prev.map((item) =>
          // IMPORTANTE: Ao atualizar o estado local, zeramos ambos para refletir o banco
          item.id === g.id
            ? { ...item, is_archived: newStatus, auto_archived: false }
            : item,
        ),
      );
      // Revalida cache da galeria para remover/atualizar exibição pública por slug.
      if (photographer?.id) {
        await revalidateGalleryCache({
          galeriaId: g.id,
          userId: photographer.id,
          username: photographer.username,
          slug: g.slug,
          driveFolderId: g.drive_folder_id,
        });
      }
      await triggerProfileRevalidation();
      setToast({
        message: newStatus ? 'Galeria arquivada' : 'Galeria restaurada',
        type: 'success',
      });
    } else {
      setToast({ message: result.error || 'Erro ao arquivar', type: 'error' });
    }
    setUpdatingId(null);
  };

  const handleToggleProfile = async (g: Galeria) => {
    setUpdatingId(g.id);
    const { success, error } = await toggleShowOnProfile(
      g.id,
      g.show_on_profile,
    );

    if (success) {
      setGalerias((prev) =>
        prev.map((item) =>
          item.id === g.id
            ? { ...item, show_on_profile: !g.show_on_profile }
            : item,
        ),
      );
      await triggerProfileRevalidation();
      setToast({
        message: !g.show_on_profile
          ? 'Visível no perfil!'
          : 'Removida do perfil.',
        type: 'success',
      });
    } else {
      setToast({
        message: error || 'Erro ao alterar visibilidade',
        type: 'error',
      });
    }
    setUpdatingId(null);
  };

  const handleSyncDrive = async (galeria: Galeria) => {
    setUpdatingId(galeria.id);
    try {
      // 1. Limpa cache bruto do Drive
      await revalidateDrivePhotos(galeria.drive_folder_id, galeria.id);

      // 2. Sincroniza e obtém a nova contagem
      const result = await syncGaleriaPhotoCount(galeria, {
        impersonateUserId,
      });

      const novoTotal = result.data?.photo_count;

      if (result.success && typeof novoTotal === 'number') {
        const maxPerGallery = planLimits?.maxPhotosPerGallery ?? 300;
        const poolTotal = planLimits?.photoCredits ?? 450;
        const currentCount = galeria.photo_count ?? 0;

        // Considera somente galerias ativas para cota global (mesma regra do admin).
        const activeGalerias = galerias.filter(
          (g) => !g.is_deleted && !g.is_archived && !g.auto_archived,
        );
        const activeTotal = activeGalerias.reduce(
          (sum, g) => sum + (g.photo_count ?? 0),
          0,
        );

        // Quantos créditos ainda podem ser adicionados sem estourar o pool.
        const remainingCredits = Math.max(0, poolTotal - activeTotal);
        // Limite desta galeria considerando o que ela já possui + saldo disponível.
        const maxAllowedByPool = currentCount + remainingCredits;
        const cappedTotal = Math.min(
          novoTotal,
          maxPerGallery,
          maxAllowedByPool,
        );

        setGalerias((prev) =>
          prev.map((g) =>
            g.id === galeria.id ? { ...g, photo_count: cappedTotal } : g,
          ),
        );

        const overPerGallery = novoTotal > maxPerGallery;
        const overPool = novoTotal > maxAllowedByPool;

        if (overPerGallery) {
          setLimitModalAfterSync({
            planLimit: maxPerGallery,
            photoCount: novoTotal,
          });
        } else if (overPool) {
          setToast({
            message:
              cappedTotal === currentCount
                ? `Foram encontrados ${novoTotal} arquivos, mas sua cota atual está no limite. Nenhuma foto adicional será exibida nesta galeria.`
                : `Foram encontrados ${novoTotal} arquivos. Sua cota atual permite exibir somente ${cappedTotal} nesta galeria.`,
            type: 'error',
          });
        } else {
          setToast({
            message: `Sincronizado: ${cappedTotal} fotos`,
            type: 'success',
          });
        }
      } else if (!result.success) {
        setToast({
          message: result.error || 'Erro ao sincronizar.',
          type: 'error',
        });
      }

      if (photographer?.id) {
        await revalidateGalleryCache({
          galeriaId: galeria.id,
          userId: photographer.id,
          slug: galeria.slug,
          driveFolderId: galeria.drive_folder_id,
          username: photographer.username,
        });
      }
    } catch {
      setToast({ message: 'Erro ao sincronizar.', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const executePermanentDelete = async () => {
    if (!galeriaToPermanentlyDelete || !photographer) return;
    try {
      await deleteGalleryPermanently(galeriaToPermanentlyDelete.id);
      setGalerias((prev) =>
        prev.filter((g) => g.id !== galeriaToPermanentlyDelete.id),
      );

      // Revalida para atualizar contadores e remover slug do cache
      await revalidateGalleryCache({
        galeriaId: galeriaToPermanentlyDelete.id,
        userId: photographer.id,
        slug: galeriaToPermanentlyDelete.slug,
        username: photographer.username,
      });

      setToast({ message: 'Removida definitivamente!', type: 'success' });
    } catch {
      setToast({ message: 'Erro na exclusão.', type: 'error' });
    } finally {
      setGaleriaToPermanentlyDelete(null);
    }
  };

  // --- BULK ACTIONS (Revalidação Única no Final) ---
  const handleBulkArchive = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setUpdatingId('bulk');
    try {
      const promises = ids.map((id) => {
        const galeria = galerias.find((g) => g.id === id);
        const isCurrentlyArchived =
          !!galeria && (galeria.is_archived || galeria.auto_archived);
        return toggleArchiveGaleria(id, isCurrentlyArchived);
      });

      const results = await Promise.all(promises);
      if (results.some((r) => r.success)) {
        setGalerias((prev) =>
          prev.map((item) =>
            selectedIds.has(item.id)
              ? {
                  ...item,
                  is_archived: !(item.is_archived || item.auto_archived),
                  auto_archived: false,
                }
              : item,
          ),
        );
        // ✅ Revalida apenas uma vez para o lote todo
        await triggerProfileRevalidation();
        setToast({ message: `Operação em lote concluída`, type: 'success' });
        setSelectedIds(new Set());
      }
    } catch {
      setToast({ message: 'Erro no processamento em lote', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setUpdatingId('bulk');
    try {
      const results = await Promise.all(ids.map((id) => moveToTrash(id)));
      if (results.some((r) => r.success)) {
        setGalerias((prev) =>
          prev.map((item) =>
            selectedIds.has(item.id) ? { ...item, is_deleted: true } : item,
          ),
        );
        await triggerProfileRevalidation();
        setToast({
          message: 'Galerias movidas para lixeira.',
          type: 'success',
        });
        setSelectedIds(new Set());
      }
    } catch {
      setToast({ message: 'Erro ao mover para lixeira.', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkPermanentDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setUpdatingId('bulk');
    try {
      const results = await Promise.allSettled(
        ids.map((id) => deleteGalleryPermanently(id)),
      );
      const successfulIds = ids.filter((id, idx) => {
        const r = results[idx];
        return r.status === 'fulfilled' && (r.value === true || r.value);
      });

      if (successfulIds.length > 0) {
        setGalerias((prev) =>
          prev.filter((g) => !successfulIds.includes(g.id)),
        );
        await triggerProfileRevalidation();
        setToast({
          message: 'Galerias excluídas permanentemente.',
          type: 'success',
        });
        setSelectedIds(new Set());
      }
    } catch {
      setToast({ message: 'Erro na exclusão permanente.', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setUpdatingId('bulk');
    try {
      const results = await Promise.all(ids.map((id) => restoreGaleria(id)));
      if (results.some((r) => r.success)) {
        setGalerias((prev) =>
          prev.map((item) =>
            selectedIds.has(item.id)
              ? { ...item, is_deleted: false, is_archived: false }
              : item,
          ),
        );
        await triggerProfileRevalidation();
        setToast({ message: 'Galerias restauradas.', type: 'success' });
        setSelectedIds(new Set());
      }
    } catch {
      setToast({ message: 'Erro ao restaurar galerias.', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  return {
    updatingId,
    selectedIds,
    isBulkMode,
    setIsBulkMode,
    galeriaToPermanentlyDelete,
    setGaleriaToPermanentlyDelete,
    limitModalAfterSync,
    setLimitModalAfterSync,
    handleArchiveToggle,
    handleToggleProfile,
    handleSyncDrive,
    executePermanentDelete,
    handleBulkArchive,
    handleBulkDelete,
    handleBulkPermanentDelete,
    handleBulkRestore,
    handleToggleSelect: (id: string) => {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        return newSet;
      });
    },
    handleSelectAll: (ids: string[]) => setSelectedIds(new Set(ids)),
    handleDeselectAll: () => setSelectedIds(new Set()),
    handleGoogleLogin: async (force: boolean) => {
      try {
        await authService.signInWithGoogle(force);
      } catch {
        setToast({ message: 'Erro Google', type: 'error' });
      }
    },
    handleRestore: async (id: string) => {
      setUpdatingId(id);
      const res = await restoreGaleria(id);
      if (res.success) {
        setGalerias((prev) =>
          prev.map((g) =>
            g.id === id ? { ...g, is_deleted: false, is_archived: false } : g,
          ),
        );
        await triggerProfileRevalidation();
      }
      setUpdatingId(null);
    },
    handleMoveToTrash: async (g: Galeria) => {
      setUpdatingId(g.id);
      const res = await moveToTrash(g.id);
      if (res.success) {
        setGalerias((prev) =>
          prev.map((item) =>
            item.id === g.id ? { ...item, is_deleted: true } : item,
          ),
        );
        await triggerProfileRevalidation();
      }
      setUpdatingId(null);
    },
  };
}
