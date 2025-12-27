'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Masonry from 'react-masonry-css';
import { Lightbox, PhotographerAvatar } from '@/components/gallery';
import { Camera, Image as ImageIcon, Calendar, MapPin, Download, Heart, Loader2, Filter } from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

// Sub-componente otimizado para evitar o "piscar"
const GridImage = ({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, []);

  return (
    <div className={`relative w-full h-auto overflow-hidden rounded-2xl transition-colors duration-300 ${isLoaded ? 'bg-transparent' : 'bg-[#FFF9F0]'}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={`
          w-full h-auto object-cover rounded-2xl transition-all duration-300 ease-out
          ${isLoaded ? 'blur-0 scale-100' : 'blur-md scale-105 opacity-30'}
        `}
        loading={priority ? "eager" : "lazy"}
      />
    </div>
  );
};

export default function PhotoGrid({ photos, galeria }: any) {
  const QTD_FOTO_EXIBIDAS = 24;

  // --- ESTADOS DE CONTROLE ORIGINAIS ---
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [masonryKey, setMasonryKey] = useState(0);

  // --- ESTADOS DE DOWNLOAD SEPARADOS ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloadingFavs, setIsDownloadingFavs] = useState(false);
  const [favDownloadProgress, setFavDownloadProgress] = useState(0);

  // --- ESTADOS DE FAVORITOS E FILTRO ---
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const getCurrentColumns = () => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width >= 1536) return 4;
    if (width >= 1280) return 3;
    if (width >= 1024) return 2;
    return 1;
  };

  const normalizeLimit = (limit: number, cols: number) =>
    Math.ceil(limit / cols) * cols;

  const [displayLimit, setDisplayLimit] = useState(() => {
    if (typeof window === 'undefined') return QTD_FOTO_EXIBIDAS;
    const cols = getCurrentColumns();
    return normalizeLimit(QTD_FOTO_EXIBIDAS, cols);
  });

  // --- CARREGAR FAVORITOS DO LOCALSTORAGE ---
  useEffect(() => {
    const saved = localStorage.getItem(`fav_${galeria.id}`);
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, [galeria.id]);

  useEffect(() => {
    if (displayLimit > QTD_FOTO_EXIBIDAS) {
      setMasonryKey(prev => prev + 1);
    }
  }, [displayLimit]);

  // --- LÓGICA DE FILTRAGEM ---
  const displayedPhotos = showOnlyFavorites
    ? photos.filter((photo: any) => favorites.includes(photo.id))
    : photos;

  // --- CONFIGURAÇÕES DE DOWNLOAD E LIMITES ---
  const MAX_PHOTOS = 150;
  const isOverLimit = photos.length > MAX_PHOTOS;
  const ESTIMATED_MB_PER_PHOTO = 10;
  const totalSizeMB = photos.length * ESTIMATED_MB_PER_PHOTO;
  const isVeryHeavy = totalSizeMB > 500;

  const breakpointColumnsObj = {
    default: 4,
    1536: 3,
    1280: 3,
    1024: 2,
    768: 1
  };

  const getImageUrl = (photoId: string, suffix: string = "w600") => {
    return `https://lh3.googleusercontent.com/d/${photoId}=${suffix}`;
  };

  // --- LÓGICA DE DOWNLOAD REFINADA (COM ESTADOS INDEPENDENTES) ---
  const handleDownloadZip = async (targetList: any[], zipSuffix: string, isFavAction: boolean) => {
    if (isDownloading || isDownloadingFavs || targetList.length === 0) return;

    const setProgress = isFavAction ? setFavDownloadProgress : setDownloadProgress;
    const setStatus = isFavAction ? setIsDownloadingFavs : setIsDownloading;

    try {
      setStatus(true);
      setProgress(0);
      const zip = new JSZip();

      for (let i = 0; i < targetList.length; i++) {
        const photo = targetList[i];
        const fileId = photo.id;
        const url = `https://lh3.googleusercontent.com/d/${fileId}=s0`;

        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Erro na rede");
          const blob = await response.blob();
          zip.file(`foto-${i + 1}.jpg`, blob);
          // Atualiza progresso específico do botão clicado
          setProgress(((i + 1) / targetList.length) * 100);
        } catch (err) {
          console.error(`Erro ao processar foto ${i}:`, err);
        }
      }

      const content = await zip.generateAsync({ type: "blob", compression: "STORE" });
      saveAs(content, `${galeria.title.replace(/\s+/g, '_')}_${zipSuffix}.zip`);

    } catch (error) {
      console.error("Erro no ZIP:", error);
      alert("Erro ao gerar o arquivo ZIP.");
    } finally {
      setStatus(false);
      setProgress(0);
    }
  };

  const downloadAllAsZip = () => handleDownloadZip(photos, 'completa', false);
  const handleDownloadFavorites = () => {
    const favPhotos = photos.filter((p: any) => favorites.includes(p.id));
    handleDownloadZip(favPhotos, 'favoritas', true);
  };

  // --- INFINITE SCROLL ---
  useEffect(() => {
    let isThrottled = false;
    const handleScroll = () => {
      if (isThrottled || displayLimit >= displayedPhotos.length) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const clientHeight = window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 1000) {
        isThrottled = true;
        setDisplayLimit(prev => {
          const cols = getCurrentColumns();
          const next = prev + cols * 3;
          return Math.min(normalizeLimit(next, cols), displayedPhotos.length);
        });
        setTimeout(() => { isThrottled = false; }, 200);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayLimit, displayedPhotos.length]);

  if (!photos || photos.length === 0) return null;

  const refreshFavorites = () => {
    const saved = localStorage.getItem(`fav_${galeria.id}`);
    setFavorites(saved ? JSON.parse(saved) : []);
  };

  return (
 <div className="w-full flex flex-col items-center gap-10 min-h-screen pb-10">
      {/* 1. BARRA DE INFORMAÇÕES EDITORIAL: Ajustada para flex-col no mobile */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-4 bg-black/45 backdrop-blur-lg p-5 md:p-2 md:px-5 rounded-[2rem] md:rounded-full border border-white/10 shadow-2xl w-full max-w-[95%] md:max-w-max mx-auto transition-all z-[40]">
        
        {/* SEÇÃO: INFOS DA GALERIA */}
        <div className="flex items-center justify-center gap-3 text-white text-sm md:text-[14px] font-medium italic">
          <div className="flex items-center gap-1.5">
            <Camera size={18} className="text-[#F3E5AB]" />
            <span className="whitespace-nowrap tracking-widest ">
              {galeria.is_public ? 'Galeria Pública' : 'Acesso Restrito'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-white/20 pl-3 h-5">
            <ImageIcon size={18} className="text-[#F3E5AB]" />
            <span className="whitespace-nowrap">{photos.length} fotos</span>
          </div>
        </div>

        <div className="hidden md:block w-[1px] h-4 bg-white/20"></div>

        {/* SEÇÃO: DATA E LOCALIZAÇÃO */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-white text-sm md:text-[14px]  font-medium italic">
          <span className="flex items-center gap-1.5 whitespace-nowrap md:border-l md:border-white/20 md:pl-3 h-5">
            <Calendar size={18} className="text-[#F3E5AB]" />
            {new Date(galeria.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          {galeria.location && (
            <span className="flex items-center gap-1.5 border-l border-white/20 pl-3 h-5 whitespace-nowrap max-w-[200px] md:max-w-[300px] truncate">
              <MapPin size={18} className="text-[#F3E5AB]" />
              {galeria.location}
            </span>
          )}
        </div>

        {/* SEÇÃO: AÇÕES E DOWNLOADS - Ajustado para não quebrar layout */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 md:pt-0 md:border-l md:border-white/20 md:pl-3">
          {favorites.length > 0 && (
            <>
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`flex items-center justify-center gap-2 px-4 h-9 rounded-full border transition-all text-[11px] md:text-[12px] font-bold tracking-widest ${showOnlyFavorites ? "bg-[#E67E70] border-[#E67E70] text-white" : "bg-white/10 border-white/10 text-white"}`}
              >
                <Filter size={14} />
                {showOnlyFavorites ? `Todas` : `Favoritos (${favorites.length})`}
              </button>
            </>
          )}

          <button
            onClick={downloadAllAsZip}
            disabled={isDownloading || isOverLimit}
            className={`flex items-center justify-center gap-2 px-4 h-9 rounded-full text-[11px] md:text-[12px] font-bold tracking-widest ${isOverLimit ? 'bg-gray-500/20 text-gray-400' : 'bg-[#F3E5AB] text-slate-900'}`}
          >
            {isDownloading ? <Loader2 className="animate-spin h-4 w-4" /> : <><Download size={14} /> {isOverLimit ? 'Limite' : 'Baixar todas'}</>}
          </button>
        </div>
      </div>
      {/* 3. GRID MASONRY */}
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8">
        {showOnlyFavorites && displayedPhotos.length === 0 ? (
          <div className="text-center py-20 text-[#D4AF37]">
            <p className="italic font-serif text-lg">Você ainda não selecionou nenhuma foto favorita.</p>
            <button onClick={() => setShowOnlyFavorites(false)} className="mt-4 underline text-sm uppercase tracking-tighter">Voltar para a galeria completa</button>
          </div>
        ) : (
          <Masonry
            key={masonryKey}
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {displayedPhotos.slice(0, displayLimit).map((photo: any, index: number) => {
              const isSelected = favorites.includes(photo.id);
              const toggleFavoriteFromGrid = (photoId: string) => {
                const isSelected = favorites.includes(photoId);
                let newFavs;

                if (isSelected) {
                  newFavs = favorites.filter(id => id !== photoId);
                } else {
                  newFavs = [...favorites, photoId];

                  // Alerta de dispositivo no primeiro clique (caso queira manter)
                  if (favorites.length === 0) {
                    setToastMessage("Sua seleção fica salva apenas neste dispositivo.");
                    setToastType('info');
                  }
                }

                setFavorites(newFavs);
                localStorage.setItem(`fav_${galeria.id}`, JSON.stringify(newFavs));
              };
              return (
                <div
                  key={photo.id}
                  className="group relative cursor-zoom-in mb-4 transition-transform duration-300 hover:-translate-y-1"
                >
                  {/* BOTÃO DE SELEÇÃO RÁPIDA (CANTO SUPERIOR ESQUERDO) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Impede que o Lightbox abra ao selecionar
                      toggleFavoriteFromGrid(photo.id);
                    }}
                    className={`absolute top-4 left-4 z-30 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 active:scale-90
          ${isSelected
                        ? "bg-[#E67E70] border-[#E67E70] shadow-lg scale-100"
                        : "bg-black/20 border-white/50 hover:border-white opacity-0 group-hover:opacity-100"}`}
                  >
                    <Heart
                      size={20}
                      fill={isSelected ? "white" : "none"}
                      className={isSelected ? "text-white" : "text-white"}
                    />
                  </button>

                  {/* CLICK NA IMAGEM PARA LIGHTBOX */}
                  <div onClick={() => setSelectedPhotoIndex(photos.indexOf(photo))}>
                    <GridImage
                      src={getImageUrl(photo.id, "w600")}
                      alt={`Foto ${index + 1}`}
                      priority={index < QTD_FOTO_EXIBIDAS}
                    />
                  </div>

                  {/* BORDA DE DESTAQUE QUANDO SELECIONADA */}
                  {isSelected && (
                    <div className="absolute inset-0 border-[3px] border-[#E67E70] rounded-2xl pointer-events-none animate-in fade-in duration-300" />
                  )}
                </div>
              );
            })}
          </Masonry>
        )}
      </div>

      {/* 4. INDICADOR DE CARREGAMENTO */}
      {displayLimit < displayedPhotos.length && (
        <div className="flex justify-center py-20 w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F3E5AB]" />
        </div>
      )}

      {/* 5. LIGHTBOX */}
      {selectedPhotoIndex !== null && photos.length > 0 && (
        <Lightbox
          photos={photos}
          activeIndex={selectedPhotoIndex}
          totalPhotos={photos.length}
          galleryTitle={galeria.title}
          galeria={galeria}
          location={galeria.location || ""}
          onClose={() => {
            setSelectedPhotoIndex(null);
            refreshFavorites(); // Força a barra a atualizar ao fechar
          }}
          onNext={() => setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length)}
          onPrev={() => setSelectedPhotoIndex((selectedPhotoIndex - 1 + photos.length) % photos.length)}
        />
      )}

      {/* BOTÃO FLUTUANTE DE DOWNLOAD RÁPIDO */}
      {favorites.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={handleDownloadFavorites}
            disabled={isDownloadingFavs}
            className="flex items-center gap-3 bg-[#E67E70] hover:bg-[#D66D5F] text-white px-4 md:px-4 py-2 md:py-2 rounded-full shadow-[0_10px_40px_rgba(230,126,112,0.4)] transition-all active:scale-95 group border border-white/20"
          >
            {isDownloadingFavs ? (
              <div className="flex items-center gap-">
                <Loader2 className="animate-spin h-5 w-5" />
                <span className="font-bold tracking-widest text-sm">
                  A baixar ({Math.round(favDownloadProgress)}%)
                </span>
              </div>
            ) : (
              <>
                <div className="bg-white/20 p-1.5 rounded-full group-hover:bg-white/30 transition-colors">
                  <Download size={18} />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="gap-1.5 text-white text-sm md:text-[14px] font-medium italic">Baixar favoritas</span>
                  <span className="text-[10px] md:text-[12px] opacity-80 italic">{favorites.length} {favorites.length === 1 ? 'foto escolhida' : 'fotos escolhidas'}</span>
                </div>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}