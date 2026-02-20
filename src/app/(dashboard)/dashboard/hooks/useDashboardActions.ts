'use client';

import { useState } from 'react';
import type { Galeria } from '@/core/types/galeria';
import type { Profile } from '@/core/types/profile';
import {
  moveToTrash,
  restoreGaleria,
  toggleArchiveGaleria,
  deleteGalleryPermanently,
  toggleShowOnProfile,
} from '@/core/services/galeria.service';
import {
  revalidateDrivePhotos,
  revalidateProfile,
  revalidateGalleryCache,
} from '@/actions/revalidate.actions';
import { authService } from '@photos/core-auth';

export function useDashboardActions(
  galerias: Galeria[],
  setGalerias: React.Dispatch<React.SetStateAction<Galeria[]>>,
  photographer: Profile | null,
  setToast: (
    toast: { message: string; type: 'success' | 'error' } | null,
  ) => void,
  currentView: 'active' | 'archived' | 'trash',
) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [galeriaToPermanentlyDelete, setGaleriaToPermanentlyDelete] =
    useState<Galeria | null>(null);

  // Helper interno para evitar repetição e garantir que username/id existam
  const triggerProfileRevalidation = async () => {
    if (photographer?.username && photographer?.id) {
      await revalidateProfile(photographer.username, photographer.id);
    }
  };

  const handleArchiveToggle = async (g: Galeria) => {
    const newStatus = !g.is_archived;
    setUpdatingId(g.id);
    const result = await toggleArchiveGaleria(g.id, g.is_archived);

    if (result.success) {
      setGalerias((prev) =>
        prev.map((item) =>
          item.id === g.id ? { ...item, is_archived: newStatus } : item,
        ),
      );
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

      // 2. Limpa cache da galeria (slug e dados formatados)
      if (photographer?.id) {
        await revalidateGalleryCache({
          galeriaId: galeria.id,
          userId: photographer.id,
          slug: galeria.slug,
          driveFolderId: galeria.drive_folder_id,
          username: photographer.username,
        });
      }
      setToast({ message: 'Sincronização concluída!', type: 'success' });
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
        return toggleArchiveGaleria(id, !!galeria?.is_archived);
      });

      const results = await Promise.all(promises);
      if (results.some((r) => r.success)) {
        setGalerias((prev) =>
          prev.map((item) =>
            selectedIds.has(item.id)
              ? { ...item, is_archived: !item.is_archived }
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

  return {
    updatingId,
    selectedIds,
    isBulkMode,
    setIsBulkMode,
    galeriaToPermanentlyDelete,
    setGaleriaToPermanentlyDelete,
    handleArchiveToggle,
    handleToggleProfile,
    handleSyncDrive,
    executePermanentDelete,
    handleBulkArchive,
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
