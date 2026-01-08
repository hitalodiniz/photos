'use client';
import React, { useEffect, useState } from 'react';
import { Download, Camera, Loader2 } from 'lucide-react';
import { GalleryHeader, PhotographerAvatar } from '@/components/gallery';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { getImageUrl, getHighResImageUrl } from '@/core/utils/url-helper';
import { Galeria } from '@/core/types/galeria';

export default function PhotoViewClient({
  googleId,
  slug,
  initialData,
}: {
  googleId: string;
  slug: string;
  initialData: Galeria;
}) {
  const [data] = useState<Galeria>(initialData);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showButtonText, setShowButtonText] = useState(true);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [showInterface, setShowInterface] = useState(true);

  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      setShowInterface(true);
      return;
    }

    let timer: NodeJS.Timeout;
    const handleActivity = () => {
      setShowInterface(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowInterface(false), 2000);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowButtonText(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = getImageUrl(googleId);
    if (img.complete) setIsImageLoading(false);
  }, [googleId]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const highResUrl = getHighResImageUrl(googleId);
      const response = await fetch(highResUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data?.title || 'foto'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      window.open(getHighResImageUrl(googleId), '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!data)
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        Galeria não encontrada.
      </div>
    );

  return (
    <div className="fixed inset-0 z-[999] bg-black flex flex-col items-center overflow-x-hidden overflow-y-auto md:overflow-hidden select-none min-h-screen">
      {/* HEADER AJUSTADO (PADRÃO LIGHTBOX) */}
      <header
        className={`relative md:absolute top-0 left-0 right-0 flex flex-col md:flex-row items-center justify-between p-6 md:px-14 md:py-8 text-white z-[70] w-full gap-6 transition-all duration-700 ${
          showInterface
            ? 'opacity-100 translate-y-0'
            : 'md:opacity-0 md:-translate-y-4 md:pointer-events-none'
        }`}
      >
        <div className="flex-grow min-w-0 w-full md:w-auto">
          <GalleryHeader
            title={data?.title}
            location={data?.location}
            data={data?.date}
          />
        </div>

        {/* BARRA DE FERRAMENTAS */}
        <div className="flex items-center bg-black/80 backdrop-blur-2xl p-2 px-4 rounded-2xl border border-white/20 shadow-2xl">
          <button
            onClick={handleDownload}
            className="flex items-center gap-0 pr-4 hover:text-[#F3E5AB] transition-all group border-r border-white/20"
          >
            <div className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/10 group-hover:bg-white/20 shrink-0">
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin text-[#F3E5AB]" />
              ) : (
                <Download size={18} />
              )}
            </div>
            <div
              className={`overflow-hidden transition-all duration-500 ${showButtonText ? 'max-w-[120px] ml-2' : 'max-w-0'}`}
            >
              <span className="text-[10px] block font-bold uppercase italic">
                Download
              </span>
              <span className="text-[11px] block opacity-60 whitespace-nowrap">
                Alta Resolução
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              const sParam = params.get('s');
              window.location.href = sParam
                ? `/${decodeURIComponent(sParam).replace(/^\/+/, '')}`
                : '/';
            }}
            className="flex items-center gap-0 pl-4 hover:text-[#F3E5AB] transition-all group"
          >
            <div className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/10 group-hover:bg-white/20 shrink-0">
              <Camera size={20} />
            </div>
            <div
              className={`overflow-hidden transition-all duration-500 ${showButtonText ? 'max-w-[120px] ml-2' : 'max-w-0'}`}
            >
              <span className="text-[10px] block font-bold uppercase italic">
                Ver Galeria
              </span>
              <span className="text-[11px] block opacity-60 whitespace-nowrap">
                De Fotos
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* ÁREA DA IMAGEM */}
      <main className="flex-1 relative w-full flex flex-col items-center justify-center px-2 md:px-0 pb-6 md:pb-0">
        <div className="relative flex flex-col items-center">
          {isImageLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          )}
          <img
            src={getImageUrl(googleId)}
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
            className={`max-w-full max-h-[75vh] md:max-h-screen object-contain transition-all duration-1000 
              ${isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            alt={data?.title || 'Visualização'}
          />
        </div>
      </main>

      {/* RODAPÉ / AVATAR */}
      {data?.photographer && (
        <div
          className={`relative md:fixed bottom-0 left-0 right-0 flex justify-center pb-8 md:pb-10  transition-all duration-700 ${
            showInterface
              ? 'opacity-100 translate-y-0'
              : 'md:opacity-0 md:translate-y-4 md:pointer-events-none'
          }`}
        >
          <PhotographerAvatar
            galeria={{
              ...data,
              photographer_name: data.photographer?.full_name,
              photographer_avatar_url: data.photographer?.profile_picture_url,
              photographer_id: data.photographer?.username,
            }}
            position="bottom-lightbox"
          />
        </div>
      )}
    </div>
  );
}
