'use client';

import { useState, useCallback } from 'react';
import { Galeria } from '@/core/types/galeria';
import { ShareService, ShareType } from '@/core/services/share.service';

export interface UseShareOptions {
  galeria: Galeria;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 🎯 HOOK UNIFICADO DE COMPARTILHAMENTO
 * Use este hook em qualquer componente que precisa compartilhar
 */
export function useShare({ galeria, onSuccess, onError }: UseShareOptions) {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * Compartilha galeria completa
   */
  const shareGallery = useCallback(
    async (phone?: string) => {
      setIsSharing(true);
      try {
        const url = window.location.href;
        await ShareService.share({
          type: 'gallery',
          galeria,
          url,
          phone,
        });
        onSuccess?.();
      } catch (error) {
        onError?.(error as Error);
      } finally {
        setIsSharing(false);
      }
    },
    [galeria, onSuccess, onError],
  );

  /**
   * Compartilha foto individual
   */
  const sharePhoto = useCallback(
    async (photoId: string) => {
      setIsSharing(true);
      try {
        const url = `${window.location.origin}/photo/${photoId}?s=${galeria.slug}`;
        await ShareService.share({
          type: 'photo',
          galeria,
          url,
          photoId,
        });
        onSuccess?.();
      } catch (error) {
        onError?.(error as Error);
      } finally {
        setIsSharing(false);
      }
    },
    [galeria, onSuccess, onError],
  );

  /**
   * Compartilhamento de visitante
   */
  const shareAsGuest = useCallback(async () => {
    setIsSharing(true);
    try {
      const url = window.location.href;
      await ShareService.share({
        type: 'guest',
        galeria,
        url,
      });
      onSuccess?.();
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsSharing(false);
    }
  }, [galeria, onSuccess, onError]);

  /**
   * Compartilhamento admin (com telefone do cliente)
   */
  const shareToClient = useCallback(
    async (customUrl?: string) => {
      setIsSharing(true);
      try {
        const url = customUrl || window.location.href;
        await ShareService.share({
          type: 'admin',
          galeria,
          url,
          phone: galeria.client_whatsapp || undefined,
        });
        onSuccess?.();
      } catch (error) {
        onError?.(error as Error);
      } finally {
        setIsSharing(false);
      }
    },
    [galeria, onSuccess, onError],
  );

  /**
   * Copia link para clipboard
   */
  const copyLink = useCallback(
    async (customUrl?: string) => {
      const url = customUrl || window.location.href;
      const success = await ShareService.copyToClipboard(url);

      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onSuccess?.();
      } else {
        onError?.(new Error('Failed to copy'));
      }
    },
    [onSuccess, onError],
  );

  return {
    // Estados
    isSharing,
    copied,

    // Métodos
    shareGallery,
    sharePhoto,
    shareAsGuest,
    shareToClient,
    copyLink,
  };
}
