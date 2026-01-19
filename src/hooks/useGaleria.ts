'use client';

import { useState, useCallback } from 'react';
import {
  getGalerias,
  createGaleria,
  updateGaleria,
  deleteGalleryPermanently,
  toggleArchiveGaleria,
  toggleShowOnProfile,
  moveToTrash,
  restoreGaleria,
} from '@/core/services/galeria.service';
import type { Galeria } from '@/core/types/galeria';

interface UseGaleriaOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useGaleria(options: UseGaleriaOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [galerias, setGalerias] = useState<Galeria[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error') => {
      if (type === 'success') {
        options.onSuccess?.(message);
      } else {
        options.onError?.(message);
      }
    },
    [options],
  );

  // Buscar todas as galerias
  const fetchGalerias = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getGalerias();
      if (result.success && result.data) {
        setGalerias(result.data);
        return result.data;
      } else {
        showToast(result.error || 'Erro ao buscar galerias', 'error');
        return [];
      }
    } catch (error: any) {
      showToast(error.message || 'Erro ao buscar galerias', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Criar galeria
  const handleCreate = useCallback(
    async (formData: FormData) => {
      setLoading(true);
      try {
        const result = await createGaleria(formData);
        if (result.success) {
          showToast(result.message || 'Galeria criada com sucesso!', 'success');
          await fetchGalerias();
          return { success: true, data: result };
        } else {
          showToast(result.error || 'Erro ao criar galeria', 'error');
          return { success: false, error: result.error };
        }
      } catch (error: any) {
        showToast(error.message || 'Erro ao criar galeria', 'error');
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },
    [fetchGalerias, showToast],
  );

  // Atualizar galeria
  const handleUpdate = useCallback(
    async (id: string, formData: FormData) => {
      setLoading(true);
      try {
        const result = await updateGaleria(id, formData);
      if (result.success) {
        showToast(result.message || 'Galeria atualizada com sucesso!', 'success');
        await fetchGalerias();
        return { success: true, data: result };
      } else {
        showToast(result.error || 'Erro ao atualizar galeria', 'error');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar galeria', 'error');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  },
  [fetchGalerias, showToast],
);

  // Alternar arquivamento
  const handleToggleArchive = useCallback(
    async (galeria: Galeria) => {
      setUpdatingId(galeria.id);
      try {
        const result = await toggleArchiveGaleria(galeria.id, galeria.is_archived);
        if (result.success) {
          setGalerias((prev) =>
            prev.map((item) =>
              item.id === galeria.id
                ? { ...item, is_archived: !galeria.is_archived }
                : item,
            ),
          );
          showToast(
            !galeria.is_archived ? 'Galeria arquivada' : 'Galeria restaurada',
            'success',
          );
          return result;
        } else {
          showToast('Erro ao processar arquivamento', 'error');
          return result;
        }
      } catch (error: any) {
        showToast(error.message || 'Erro ao processar arquivamento', 'error');
        return { success: false, error: error.message };
      } finally {
        setUpdatingId(null);
      }
    },
    [showToast],
  );

  // Alternar visibilidade no perfil
  const handleToggleShowOnProfile = useCallback(
    async (galeria: Galeria) => {
      setUpdatingId(galeria.id);
      try {
        const result = await toggleShowOnProfile(
          galeria.id,
          galeria.show_on_profile,
        );
        if (result.success) {
          setGalerias((prev) =>
            prev.map((item) =>
              item.id === galeria.id
                ? { ...item, show_on_profile: !galeria.show_on_profile }
                : item,
            ),
          );
          showToast(
            !galeria.show_on_profile
              ? 'Galeria agora aparece no seu perfil público!'
              : 'Galeria removida do perfil público.',
            'success',
          );
          return result;
        } else {
          showToast('Não foi possível alterar a visibilidade.', 'error');
          return result;
        }
      } catch (error: any) {
        showToast(error.message || 'Erro ao alterar visibilidade', 'error');
        return { success: false, error: error.message };
      } finally {
        setUpdatingId(null);
      }
    },
    [showToast],
  );

  // Mover para lixeira
  const handleMoveToTrash = useCallback(
    async (galeria: Galeria) => {
      setUpdatingId(galeria.id);
      try {
        const result = await moveToTrash(galeria.id);
        if (result.success) {
          setGalerias((prev) =>
            prev.map((item) =>
              item.id === galeria.id ? { ...item, is_deleted: true } : item,
            ),
          );
          showToast('Movido para lixeira', 'success');
          return result;
        } else {
          showToast('Erro ao excluir', 'error');
          return result;
        }
      } catch (error: any) {
        showToast(error.message || 'Erro ao excluir', 'error');
        return { success: false, error: error.message };
      } finally {
        setUpdatingId(null);
      }
    },
    [showToast],
  );

  // Restaurar da lixeira
  const handleRestore = useCallback(
    async (id: string) => {
      setUpdatingId(id);
      try {
        const result = await restoreGaleria(id);
        if (result.success) {
          setGalerias((prev) =>
            prev.map((g) =>
              g.id === id ? { ...g, is_deleted: false, is_archived: false } : g,
            ),
          );
          showToast('Galeria restaurada!', 'success');
          return result;
        } else {
          showToast('Erro ao restaurar', 'error');
          return result;
        }
      } catch (error: any) {
        showToast(error.message || 'Erro ao restaurar', 'error');
        return { success: false, error: error.message };
      } finally {
        setUpdatingId(null);
      }
    },
    [showToast],
  );

  // Excluir permanentemente
  const handlePermanentDelete = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await deleteGalleryPermanently(id);
        setGalerias((prev) => prev.filter((g) => g.id !== id));
        showToast('Removida definitivamente!', 'success');
        return { success: true };
      } catch (error: any) {
        showToast(error.message || 'Erro na exclusão.', 'error');
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  return {
    galerias,
    setGalerias,
    loading,
    updatingId,
    fetchGalerias,
    handleCreate,
    handleUpdate,
    handleToggleArchive,
    handleToggleShowOnProfile,
    handleMoveToTrash,
    handleRestore,
    handlePermanentDelete,
  };
}
