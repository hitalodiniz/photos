'use client';

import { getDirectGoogleUrl } from '@/core/utils/url-helper';
import React, { useState, useEffect } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';

interface GoogleDriveImagePreviewProps {
  photoId: string;
  className?: string;
}

export default function GoogleDriveImagePreview({
  photoId,
  className = 'w-full h-full object-cover',
}: GoogleDriveImagePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 🎯 Reset de estados quando o ID da foto mudar (importante para trocas rápidas)
  useEffect(() => {
    if (photoId) {
      setLoading(true);
      setError(false);
    }
  }, [photoId]);

  // 🎯 Bypass Vercel: Usando URL direta do Google via Thumbnail API
  // Isso evita dependência de Access Tokens de curta duração para o preview
  const thumbnailUrl = getDirectGoogleUrl(photoId, 400);

  if (!photoId) {
    return (
      <div
        className={`bg-slate-100 flex items-center justify-center ${className}`}
      >
        <ImageIcon size={16} className="text-slate-300" />
      </div>
    );
  }

  return (
    <div
      className={`relative bg-slate-100 flex items-center justify-center overflow-hidden ${className}`}
    >
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
          <Loader2 size={16} className="text-gold animate-spin" />
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
          <ImageIcon size={16} strokeWidth={1.5} />
          <span className="text-[7px] font-bold uppercase mt-1 leading-tight">
            Erro ao carregar
          </span>
        </div>
      ) : (
        <img
          src={thumbnailUrl}
          alt="Preview Google Drive"
          className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
          // Melhora performance de carregamento no navegador
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
