'use client';

import React, { useState, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import Lightbox from './Lightbox';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Camera, Image as ImageIcon, Calendar, MapPin, Download } from 'lucide-react';

// Sub-componente para gerenciar o Lazy Loading com efeito Blur-up
const GridImage = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-full h-auto overflow-hidden rounded-2xl bg-slate-100">
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={`
          w-full h-auto object-cover rounded-2xl transition-all duration-700 ease-in-out
          ${isLoaded ? 'blur-0 scale-100 opacity-100' : 'blur-xl scale-110 opacity-0'}
        `}
        loading="lazy"
      />
      {/* Overlay suave de interação */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
    </div>
  );
};

interface PhotoGridProps {
  photos: any[];
  galeria: {
    title: string;
    date: string;
    location?: string;
    is_public: boolean;
  };
}

export default function PhotoGrid({ photos, galeria }: PhotoGridProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const MAX_PHOTOS = 150;
  const isOverLimit = photos.length > MAX_PHOTOS;
  const ESTIMATED_MB_PER_PHOTO = 10;
  const totalSizeMB = photos.length * ESTIMATED_MB_PER_PHOTO;
  const isVeryHeavy = totalSizeMB > 500;

  const breakpointColumnsObj = {
    default: 3,
    1100: 3,
    700: 2,
    500: 1
  };

  const getImageUrl = (photoId: string, suffix: string = "w400") => {
    return `https://lh3.googleusercontent.com/d/${photoId}=${suffix}`;
  };

  const downloadAllAsZip = async () => {
    if (isOverLimit || isDownloading) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      const zip = new JSZip();

      const downloadPromises = photos.map(async (photo, index) => {
        const fileId = typeof photo === 'string' ? photo : photo.id;
        const url = `https://lh3.googleusercontent.com/d/${fileId}=s0`;
        
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Erro na rede");
          const blob = await response.blob();
          zip.file(`foto-${index + 1}.jpg`, blob);
          setDownloadProgress((prev) => prev + (100 / photos.length));
        } catch (err) {
          console.error(`Erro ao processar foto ${index}:`, err);
        }
      });

      await Promise.all(downloadPromises);

      if (Object.keys(zip.files).length === 0) {
        alert("Nenhum arquivo pôde ser baixado.");
        return;
      }

      const content = await zip.generateAsync({ type: "blob", compression: "STORE" });
      saveAs(content, `${galeria.title.replace(/\s+/g, '_')}_alta_res.zip`);

    } catch (error) {
      console.error("Erro no ZIP:", error);
      alert("Erro ao gerar o arquivo ZIP.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // ✅ INFINITE SCROLL ESTABILIZADO (600px de threshold)
  useEffect(() => {
    let isThrottled = false;

    const handleScroll = () => {
      if (isThrottled || displayLimit >= photos.length) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop || window.pageYOffset;
      const clientHeight = window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 600) {
        isThrottled = true;
        setDisplayLimit((prev) => Math.min(prev + 12, photos.length));
        setTimeout(() => { isThrottled = false; }, 250);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [photos.length, displayLimit]);

  if (!photos || photos.length === 0) return null;

  return (
    <div className="w-full flex flex-col items-center gap-12 min-h-screen pb-20">
      
      {/* BARRA DE INFORMAÇÕES EDITORIAL */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 
      md:gap-6 bg-black/45 backdrop-blur-lg p-5 md:p-2.5 md:px-6 rounded-[2.5rem] md:rounded-full border border-white/10 
      shadow-2xl inline-flex w-auto max-w-[95%] md:max-w-max mx-auto transition-all mt-14 md:mt-2 z-[40]">

        <div className="flex items-center gap-4 text-white text-xs md:text-sm font-medium italic">
          <div className="flex items-center gap-2">
            <Camera className="text-[#F3E5AB] w-4 h-4" />
            <span className="whitespace-nowrap tracking-widest text-[10px] md:text-xs">
              {galeria.is_public ? 'Galeria Pública' : 'Acesso Restrito'}
            </span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/20 pl-4">
            <ImageIcon size={14} className="text-[#F3E5AB]" />
            <span className="whitespace-nowrap italic">{photos.length} fotos</span>
          </div>
        </div>

        <div className="hidden md:block w-[1px] h-4 bg-white/20"></div>

        <div className="flex items-center gap-4 text-white text-xs md:text-sm font-medium italic">
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Calendar size={14} className="text-[#F3E5AB]" />
            {new Date(galeria.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          {galeria.location && (
            <span className="flex items-center gap-2 border-l border-white/20 pl-4 whitespace-nowrap max-w-[120px] md:max-w-[300px] truncate">
              <MapPin size={14} className="text-[#F3E5AB]" /> {galeria.location}
            </span>
          )}
        </div>

        <div className="relative group flex flex-col items-center w-full md:w-auto">
          {(isVeryHeavy || isOverLimit) && !isDownloading && (
            <div className="absolute bottom-full mb-3 flex flex-col items-center transition-all duration-300 opacity-0 group-hover:opacity-100 group-active:opacity-100 translate-y-2 group-hover:translate-y-0 pointer-events-none z-50">
              <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-xl shadow-2xl">
                <p className="text-[10px] md:text-[11px] leading-tight text-center whitespace-nowrap">
                  {isOverLimit ? 'LIMITE EXCEDIDO' : 'ARQUIVO GRANDE'}
                  <span className="text-white/70 italic font-light block">
                    ~{Math.round(totalSizeMB)}MB
                  </span>
                </p>
              </div>
              <div className="w-2.5 h-2.5 bg-slate-900/95 rotate-45 -mt-1.5 border-r border-b border-white/10"></div>
            </div>
          )}

          <button
            onClick={downloadAllAsZip}
            disabled={isDownloading || isOverLimit}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 md:py-2 rounded-xl font-bold 
              transition-all shadow-lg active:scale-95 text-xs md:text-sm tracking-widest md:ml-2 whitespace-nowrap
            ${isOverLimit ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed border border-white/10' : 'bg-[#F3E5AB] hover:bg-[#e6d595] text-slate-900'}`}
          >
            {isDownloading ? (
              <span className="flex items-center gap-2 tabular-nums">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900" />
                {Math.round(downloadProgress)}%
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download size={16} />
                {isOverLimit ? 'Bloqueado' : 'Baixar todas'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* GRID MASONRY COM LAZY LOADING PROGRESSIVO */}
      <div className="w-full px-4 max-w-[1600px]">
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex w-auto -ml-4"
          columnClassName="pl-4 bg-clip-padding"
        >
          {photos.slice(0, displayLimit).map((photo, index) => (
            <div
              key={photo.id || `photo-${index}`}
              onClick={() => setSelectedPhotoIndex(index)}
              className="group cursor-zoom-in mb-4 transition-transform duration-300 hover:-translate-y-1"
            >
              <GridImage 
                src={getImageUrl(photo.id, "w400")} 
                alt={`Foto ${index + 1} - ${galeria.title}`} 
              />
            </div>
          ))}
        </Masonry>
      </div>

      {/* INDICADOR DE CARREGAMENTO */}
      {displayLimit < photos.length && (
        <div className="flex justify-center py-20 w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F3E5AB]" />
        </div>
      )}

      {/* LIGHTBOX */}
      {selectedPhotoIndex !== null && photos.length > 0 && (
        <Lightbox
          photos={photos}
          activeIndex={selectedPhotoIndex}
          totalPhotos={photos.length}
          galleryTitle={galeria.title}
          location={galeria.location || ""}
          onClose={() => setSelectedPhotoIndex(null)}
          onNext={() => setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length)}
          onPrev={() => setSelectedPhotoIndex((selectedPhotoIndex - 1 + photos.length) % photos.length)}
        />
      )}
    </div>
  );
}