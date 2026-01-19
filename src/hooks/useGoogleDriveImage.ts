'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDirectGoogleUrl,
  getProxyUrl,
} from '@/core/utils/url-helper';

interface UseGoogleDriveImageOptions {
  photoId: string | number;
  width?: string | number;
  priority?: boolean;
  fallbackToProxy?: boolean;
  /**
   * Se true, usa proxy diretamente sem tentar Google primeiro
   * Útil para evitar 429 quando há muitas imagens carregando simultaneamente (ex: grid de cards)
   */
  useProxyDirectly?: boolean;
}

export function useGoogleDriveImage({
  photoId,
  width = '500',
  priority = false,
  fallbackToProxy = true,
  useProxyDirectly = false,
}: UseGoogleDriveImageOptions) {
  // 🎯 Se useProxyDirectly=true, usa proxy desde o início (evita 429 em grids)
  const [imgSrc, setImgSrc] = useState<string>(
    useProxyDirectly
      ? getProxyUrl(photoId, width)
      : getDirectGoogleUrl(photoId, width),
  );
  const [usingProxy, setUsingProxy] = useState(useProxyDirectly);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset quando photoId ou width mudarem
  useEffect(() => {
    if (useProxyDirectly) {
      setImgSrc(getProxyUrl(photoId, width));
      setUsingProxy(true);
    } else {
      setImgSrc(getDirectGoogleUrl(photoId, width));
      setUsingProxy(false);
    }
    setStatus('loading');
    setError(null);
  }, [photoId, width, useProxyDirectly]);

  // Verificar se imagem já está carregada quando imgSrc muda (cache do navegador)
  // Isso garante que imagens em cache sejam detectadas mesmo se onLoad não disparar
  useEffect(() => {
    // Pequeno delay para garantir que a imagem foi atribuída ao DOM
    const checkImageLoaded = () => {
      if (!imgRef.current) return;

      const img = imgRef.current;
      
      // Se a imagem já está completa (em cache), marca como carregada imediatamente
      if (img.complete && img.naturalWidth > 0 && status === 'loading') {
        setStatus('loaded');
        setError(null);
      }
    };

    // Verifica imediatamente e após pequenos delays (múltiplas tentativas)
    // Isso garante que imagens em cache sejam detectadas
    checkImageLoaded();
    const timeout1 = setTimeout(checkImageLoaded, 50);
    const timeout2 = setTimeout(checkImageLoaded, 150);
    const timeout3 = setTimeout(checkImageLoaded, 300);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [imgSrc, status]);

  // Callback ref para verificar se a imagem já está carregada (cache do navegador)
  // Isso resolve o problema de imagens em cache que não disparam onLoad
  const setImgRef = useCallback((img: HTMLImageElement | null) => {
    imgRef.current = img;
    
    // Verifica imediatamente se a imagem já está carregada
    if (img && img.complete && img.naturalWidth > 0) {
      // Imagem já está carregada (em cache), marca como carregada imediatamente
      setStatus('loaded');
      setError(null);
    }
  }, []);

  const handleError = useCallback(
    (event?: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (!fallbackToProxy) {
        setStatus('error');
        setError('Falha ao carregar imagem');
        return;
      }

      // Se falhar o link direto (CORS ou 429), acionamos o Proxy
      if (!usingProxy) {
        const proxyUrl = getProxyUrl(photoId, width);

        // Verifica se é erro 429 (Rate Limit) para log mais específico
        const isRateLimit =
          event?.currentTarget?.src?.includes('lh3.googleusercontent.com');

        console.warn(
          `[IMAGE_FALLBACK] Google Direct falhou para ID: ${photoId}. ${
            isRateLimit ? 'Rate limit (429) detectado.' : ''
          }Alternando para Proxy API.`,
        );

        setImgSrc(proxyUrl);
        setUsingProxy(true);
        setStatus('loading');
      } else {
        setStatus('error');
        setError('Falha total na imagem');
        console.error(`[IMAGE_ERROR] Falha total na imagem ID: ${photoId}`);
      }
    },
    [photoId, width, usingProxy, fallbackToProxy],
  );

  const handleLoad = useCallback((event?: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Quando onLoad dispara, marca como carregada
    const img = event?.currentTarget || imgRef.current;
    
    // Verifica se a imagem realmente carregou
    if (img && img.complete && img.naturalWidth > 0) {
      setStatus('loaded');
      setError(null);
    } else {
      // Mesmo que complete não seja true, se o evento disparou, a imagem carregou
      setStatus('loaded');
      setError(null);
    }
  }, []);

  return {
    imgSrc,
    status,
    error,
    usingProxy,
    isLoading: status === 'loading',
    isLoaded: status === 'loaded',
    isError: status === 'error',
    handleError,
    handleLoad,
    imgRef: setImgRef, // Callback ref para verificação de cache
  };
}
