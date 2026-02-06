'use client';

import { getDirectGoogleUrl, getProxyUrl } from '@/core/utils/url-helper';
import React, { useState } from 'react';
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

  // 🎯 URL de miniatura do Google Drive (sz=w400 garante boa resolução para o preview)
  // Usamos o parâmetro &export=view ou a URL de thumbnail direta
  const thumbnailUrl = getProxyUrl(photoId, 400);
  console.log('thumbnailUrl', thumbnailUrl);
  console.log('error', error);

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
        <div className="flex flex-col items-center justify-center text-slate-400">
          <ImageIcon size={16} strokeWidth={1.5} />
          <span className="text-[7px] font-bold uppercase mt-1">Erro</span>
        </div>
      ) : (
        <img
          src={thumbnailUrl}
          alt="Preview"
          className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
        />
      )}
    </div>
  );
}
