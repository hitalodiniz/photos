import { useState } from 'react';
import type { Galeria } from '@/core/types/galeria';
import {
  moveToTrash,
  restoreGaleria,
  toggleArchiveGaleria,
  deleteGalleryPermanently,
  toggleShowOnProfile,
} from '@/core/services/galeria.service';
import {
  revalidateDrivePhotos,
  revalidateGallery,
  revalidateProfile,
  revalidateUserGalerias,
} from '@/actions/revalidate.actions';
import { authService } from '@photos/core-auth';

interface PhotographerProfile {
  id: string;
  username: string;
  full_name: string;
  google_refresh_token?: string | null;
  sidebar_collapsed?: boolean;
  mini_bio?: string | null;
}

export function useDashboardActions(
  galerias: Galeria[],
  setGalerias: React.Dispatch<React.SetStateAction<Galeria[]>>,
  photographer: PhotographerProfile | null,
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void,
  currentView: 'active' | 'archived' | 'trash'
) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [galeriaToPermanentlyDelete, setGaleriaToPermanentlyDelete] = useState<Galeria | null>(null);

  const handleGoogleLogin = async (force: boolean) => {
    try {
      await authService.signInWithGoogle(force);
    } catch {
      setToast({ message: 'Erro ao conectar com Google', type: 'error' });
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
      await revalidateProfile(photographer?.username);
      setToast({
        message: newStatus ? 'Galeria arquivada' : 'Galeria restaurada',
        type: 'success',
      });
    } else {
      setToast({ message: 'Erro ao processar arquivamento', type: 'error' });
    }
    setUpdatingId(null);
  };

  const handleRestore = async (id: string) => {
    setUpdatingId(id);
    const result = await restoreGaleria(id);
    if (result.success) {
      setGalerias((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, is_deleted: false, is_archived: false } : g,
        ),
      );
      await revalidateProfile(photographer?.username);
      setToast({ message: 'Galeria restaurada!', type: 'success' });
    } else {
      setToast({ message: 'Erro ao restaurar', type: 'error' });
    }
    setUpdatingId(null);
  };

  const handleToggleProfile = async (g: Galeria) => {
    setUpdatingId(g.id);
    try {
      const { success, error } = await toggleShowOnProfile(g.id, g.show_on_profile);
      if (!success) throw new Error(error);

      setGalerias((prev) =>
        prev.map((item) =>
          item.id === g.id ? { ...item, show_on_profile: !g.show_on_profile } : item,
        ),
      );
      await revalidateProfile(photographer?.username);
      setToast({
        message: !g.show_on_profile
          ? 'Galeria agora aparece no seu perfil público!'
          : 'Galeria removida do perfil público.',
        type: 'success',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Não foi possível alterar a visibilidade.';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMoveToTrash = async (g: Galeria) => {
    setUpdatingId(g.id);
    const result = await moveToTrash(g.id);
    if (result.success) {
      setGalerias((prev) =>
        prev.map((item) => (item.id === g.id ? { ...item, is_deleted: true } : item)),
      );
      await revalidateProfile(photographer?.username);
      setToast({ message: 'Movido para lixeira', type: 'success' });
    } else {
      setToast({ message: 'Erro ao excluir', type: 'error' });
    }
    setUpdatingId(null);
  };

  const handleSyncDrive = async (galeria: Galeria) => {
    setUpdatingId(galeria.id);
    try {
      // Força a revalidação de todas as tags relacionadas
      await revalidateDrivePhotos(galeria.drive_folder_id);
      
      await revalidateGallery(
        galeria.drive_folder_id,
        galeria.slug,
        galeria.photographer_username,
        galeria.photographer_username,
        galeria.cover_image_url,
      );
      // Força a revalidação da lista de galerias para atualizar contadores (como leads)
      if (photographer?.id) {
        await revalidateUserGalerias(photographer.id);
      }
      setToast({ message: 'Sincronização concluída!', type: 'success' });
    } catch {
      setToast({ message: 'Erro ao sincronizar.', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const executePermanentDelete = async () => {
    if (!galeriaToPermanentlyDelete) return;
    try {
      await deleteGalleryPermanently(galeriaToPermanentlyDelete.id);
      setGalerias((prev) => prev.filter((g) => g.id !== galeriaToPermanentlyDelete.id));
      setToast({ message: 'Removida definitivamente!', type: 'success' });
    } catch {
      setToast({ message: 'Erro na exclusão.', type: 'error' });
    } finally {
      setGaleriaToPermanentlyDelete(null);
    }
  };

  // --- BULK ACTIONS ---
  const handleBulkArchive = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setUpdatingId('bulk');
    try {
      const promises = ids.map((id) => {
        const galeria = galerias.find((g) => g.id === id);
        if (!galeria) return Promise.resolve({ success: false });
        return toggleArchiveGaleria(id, galeria.is_archived);
      });

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount > 0) {
        setGalerias((prev) =>
          prev.map((item) =>
            selectedIds.has(item.id) ? { ...item, is_archived: !item.is_archived } : item,
          ),
        );
        await revalidateProfile(photographer?.username);
        setToast({
          message: `${successCount} galeria(s) ${currentView === 'archived' ? 'desarquivada(s)' : 'arquivada(s)'}`,
          type: 'success',
        });
        setSelectedIds(new Set());
      } else {
        setToast({ message: 'Erro ao processar arquivamento em lote', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Erro ao processar arquivamento em lote', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setUpdatingId('bulk');
    try {
      const promises = ids.map((id) => moveToTrash(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount > 0) {
        setGalerias((prev) =>
          prev.map((item) => (selectedIds.has(item.id) ? { ...item, is_deleted: true } : item)),
        );
        await revalidateProfile(photographer?.username);
        setToast({
          message: `${successCount} galeria(s) movida(s) para lixeira`,
          type: 'success',
        });
        setSelectedIds(new Set());
      } else {
        setToast({ message: 'Erro ao mover para lixeira', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Erro ao mover para lixeira', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setUpdatingId('bulk');
    try {
      const promises = ids.map((id) => restoreGaleria(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount > 0) {
        setGalerias((prev) =>
          prev.map((item) =>
            selectedIds.has(item.id) ? { ...item, is_deleted: false, is_archived: false } : item,
          ),
        );
        await revalidateProfile(photographer?.username);
        setToast({ message: `${successCount} galeria(s) restaurada(s)`, type: 'success' });
        setSelectedIds(new Set());
      } else {
        setToast({ message: 'Erro ao restaurar', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Erro ao restaurar', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  return {
    updatingId,
    selectedIds,
    isBulkMode,
    setIsBulkMode,
    galeriaToPermanentlyDelete,
    setGaleriaToPermanentlyDelete,
    handleGoogleLogin,
    handleArchiveToggle,
    handleRestore,
    handleToggleProfile,
    handleMoveToTrash,
    handleSyncDrive,
    executePermanentDelete,
    handleBulkArchive,
    handleBulkDelete,
    handleBulkRestore,
    handleToggleSelect,
    handleSelectAll,
    handleDeselectAll,
  };
}
