'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Masonry from 'react-masonry-css';
import { Lightbox, PhotographerAvatar } from '@/components/gallery';
import { Lock, Globe, Image as ImageIcon, Calendar, MapPin, Download, Heart, Loader2, Filter, Instagram, MessageCircle, User, Info } from 'lucide-react';
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

  const [activeHint, setActiveHint] = useState<string | null>(null);

  const triggerHint = (message: string) => {
    setActiveHint(message);
    // Aumentamos o tempo para 4 segundos para dar tempo de ler as informações completas
    setTimeout(() => setActiveHint(null), 4000);
  };

  const getCurrentColumns = () => {
    if (typeof window === 'undefined') return 5;
    const width = window.innerWidth;
    if (width >= 1536) return 4;
    if (width >= 1024) return 3; // Unificando 1280 e 1024 conforme seu objeto
    return 2; // Retorno para telas abaixo de 768px
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
    default: 5,
    1536: 4,
    1280: 3,
    1024: 3,
    768: 2
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

  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Ativa o modo compacto após 100px de scroll
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-6 min-h-screen pb-10">      {/* 1. BARRA DE INFORMAÇÕES EDITORIAL: DESKTOP */}
      {/* BARRA DE INFORMAÇÕES DESKTOP - ADAPTATIVA */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
    hidden md:flex items-center justify-center barra-fantasma z-[50] sticky top-6
    backdrop-blur-xl rounded-full border shadow-2xl mx-auto transition-all duration-500
    ${(isScrolled && !isHovered)
            ? 'p-1.5 px-4 gap-3 bg-black/40 border-white/20 opacity-90 scale-95'
            : 'p-2 px-6 gap-5 bg-black/70 border-white/30 opacity-100 scale-100'} 
  `}
      >

        {/* SEÇÃO: STATUS E QTD */}
        <div className="flex items-center gap-3 text-white text-[13px] font-semibold italic">
          <div className="flex items-center gap-2">
            {galeria.is_public ? (
              <Globe size={18} className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)] animate-pulse" />
            ) : (
              <Lock size={18} className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]" />
            )}

            {(!isScrolled || isHovered) && (
              <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-500">
                {galeria.is_public ? 'Galeria Pública' : 'Acesso Restrito'}
              </span>
            )}
          </div>

          <div className="w-[1px] h-4 bg-white/20"></div>

          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]" />
            {(!isScrolled || isHovered) && (
              <span className="whitespace-nowrap animate-in fade-in duration-500">
                {photos.length} fotos
              </span>
            )}
          </div>
        </div>

        <div className="w-[1px] h-4 bg-white/20"></div>

        {/* SEÇÃO: DATA E LOCALIZAÇÃO (CORRIGIDA) */}
        <div className="flex items-center gap-3 text-white text-[13px] font-semibold italic">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]" />
            <span className="whitespace-nowrap animate-in fade-in duration-500">
              {(!isScrolled || isHovered) && (
                new Date(galeria.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
              )}
            </span>
          </div>

          {/* LOCALIZAÇÃO: Agora garantindo exibição no estado expandido */}
          {galeria.location && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-3 duration-700">
              <div className="w-[1px] h-4 bg-white/20"></div>
              <div className="flex items-center gap-2 max-w-[250px] truncate">
                <MapPin size={18} className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]" />
                {(!isScrolled || isHovered) &&
                  <span className="tracking-tight">{galeria.location}</span>}
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO: AÇÕES */}
        <div className="flex items-center gap-2 pl-3 border-l border-white/20">
          {favorites.length > 0 && (
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`flex items-center justify-center gap-2 rounded-full transition-all duration-500 active:scale-90
          ${showOnlyFavorites ? "bg-[#E67E70] text-white shadow-lg" : "bg-white/10 text-white hover:bg-white/20"}
          ${(isScrolled && !isHovered) ? 'w-9 h-9 border border-white/20' : 'px-5 h-10 border border-white/10 text-[11px] font-bold tracking-widest'}
        `}
            >
              <Filter size={16} />
              {(!isScrolled || isHovered) && <span>Favoritos</span>}
            </button>
          )}

          <button
            onClick={downloadAllAsZip}
            className={`flex items-center justify-center gap-2 rounded-full bg-[#F3E5AB] text-slate-900 transition-all duration-500 shadow-xl active:scale-95
        ${(isScrolled && !isHovered) ? 'w-9 h-9' : 'px-5 h-10 text-[12px] font-bold uppercase'}
      `}
          >
            <Download size={16} />
            {(!isScrolled || isHovered) && <span className="tracking-tight">Baixar tudo</span>}
          </button>
        </div>
      </div>
      {/* 1. BARRA DE AÇÕES EDITORIAL ULTRA-COMPACTA para mobile */}
{/* 1. BARRA DE AÇÕES EDITORIAL ULTRA-COMPACTA para mobile */}
<div className="w-full flex flex-col items-center z-[50] sticky top-6 md:hidden">

  {/* HINT DINÂMICO UNIFICADO (Fica acima da barra) */}
  <div className="relative w-full flex justify-center">
    <div className={`absolute transition-all duration-500 transform 
      ${activeHint ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
      ${activeHint === 'social' ? '-top-14' : '-top-28'}`}
    >
      <div className="bg-[#F3E5AB] text-black rounded-2xl shadow-2xl border border-white/20 p-2 px-4 flex flex-col items-center justify-center min-w-max">
        {activeHint === 'social' ? (
          <div className="flex items-center gap-4 py-1">
            <span className="text-[12px] font-semibold tracking-widest border-r border-black/10 pr-3">Fotógrafo</span>
            <div className="flex items-center gap-3">
              <button onClick={() => window.open(`https://wa.me/${galeria.photographer_whatsapp}`)} className="active:scale-125 transition-transform">
                <MessageCircle size={18} />
              </button>
              <button onClick={() => window.open(`https://instagram.com/${galeria.photographer_instagram}`)} className="active:scale-125 transition-transform">
                <Instagram size={18} />
              </button>
              <button onClick={() => window.open(galeria.photographer_website)} className="active:scale-125 transition-transform">
                <User size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[12px] font-semibold tracking-wider whitespace-pre-line text-left leading-relaxed py-1">
            {activeHint}
          </div>
        )}
        <div className="w-3 h-3 bg-[#F3E5AB] rotate-45 mx-auto -mb-3.5 mt-1 shadow-xl"></div>
      </div>
    </div>
  </div>

  {/* BARRA MOBILE "FANTASMA" */}
  <div className={`
    flex items-center backdrop-blur-2xl p-1.5 px-3 rounded-full border shadow-2xl gap-3 max-w-[95vw] mx-auto transition-all duration-500
    ${(isScrolled && !activeHint) 
      ? 'bg-black/40 border-white/10 opacity-70 scale-90' // Modo Fantasma no Scroll
      : 'bg-black/80 border-white/20 opacity-100 scale-100'} // Modo Sólido em repouso ou interagindo
  `}>

    {/* FOTÓGRAFO */}
    <div
      className="flex-shrink-0 cursor-pointer active:scale-90 transition-transform"
      onClick={() => setActiveHint(activeHint === 'social' ? null : 'social')}
    >
      <div className="relative">
        <img
          src={galeria.photographer_avatar_url}
          className={`w-9 h-9 rounded-full border-2 object-cover transition-colors ${activeHint === 'social' ? 'border-[#F3E5AB]' : 'border-[#F3E5AB]/40'}`}
          alt="Fotógrafo"
        />
        <div className="absolute -bottom-0.5 -right-0.5 bg-[#F3E5AB] rounded-full p-0.5 border border-black">
          <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
        </div>
      </div>
    </div>

    <div className="w-[1px] h-5 bg-white/10" />

    {/* INFO */}
    <button
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${activeHint && activeHint !== 'social' ? 'bg-[#F3E5AB] text-black' : 'bg-white/10 text-[#F3E5AB]'}`}
      onClick={() => {
        const status = galeria.is_public ? '🔓 Pública' : '🔒 Privada';
        const data = `📅 ${new Date(galeria.date).toLocaleDateString('pt-BR')}`;
        const info = `${status}\n📸 ${photos.length} Fotos\n${data}\n📍 ${galeria.location || 'Evento'}`;
        setActiveHint(activeHint === info ? null : info);
      }}
    >
      <Info size={18} />
    </button>

    <div className="w-[1px] h-5 bg-white/10" />

    {/* AÇÕES */}
    <div className="flex items-center gap-2">
      {favorites.length > 0 && (
        <button
          onClick={() => {
            setShowOnlyFavorites(!showOnlyFavorites);
            const msg = !showOnlyFavorites ? `Filtrando ${favorites.length} favoritas` : 'Exibindo tudo';
            triggerHint(msg);
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${showOnlyFavorites ? "bg-[#E67E70] text-white shadow-lg" : "bg-white/10 text-white"}`}
        >
          <Filter size={16} />
        </button>
      )}

      <button
        onClick={() => {
          downloadAllAsZip();
          triggerHint('Gerando arquivo ZIP...');
        }}
        className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center active:bg-white/30"
      >
        <Download size={16} />
      </button>
    </div>
  </div>
</div>

      {/* 2. BOTÃO FLUTUANTE DE FAVORITOS (REDUZIDO E ELEGANTE) [Referência: image_a57c60.jpg] */}
      {favorites.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in duration-500">
          <button
            onClick={handleDownloadFavorites}
            className="flex items-center gap-3 bg-[#E67E70] text-white py-2 px-5 rounded-full shadow-[0_10px_30px_rgba(230,126,112,0.4)] border border-white/20 active:scale-95 transition-all"
          >
            <Download size={16} />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[10px] font-bold uppercase tracking-widest">Baixar Seleção</span>
              <span className="text-[8px] opacity-80 italic">{favorites.length} fotos</span>
            </div>
          </button>
        </div>
      )}
      {/* 3. GRID MASONRY */}
      {/* 2. GRID MASONRY - Reduzido px-4 para px-1 no mobile para "colar" nas bordas */}
      <div className="w-full max-w-[1600px] mx-auto px-1 md:px-8">
        {showOnlyFavorites && displayedPhotos.length === 0 ? (
          <div className="text-center py-20 text-[#D4AF37]">
            <p className="italic font-serif text-lg text-slate-500">Nenhuma foto favorita selecionada.</p>
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

              return (
                <div
                  key={photo.id}
                  /* Reduzido mb-4 para mb-0 pois o CSS já controla o margin-bottom */
                  className="group relative cursor-zoom-in transition-transform duration-300 hover:scale-[1.01] active:scale-95"
                >
                  {/* BOTÃO DE CORAÇÃO - Menor no mobile para não poluir */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteFromGrid(photo.id);
                    }}
                    className={`absolute top-2 left-2 md:top-4 md:left-4 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full border flex items-center justify-center transition-all 
                      ${isSelected ? "bg-[#E67E70] border-transparent shadow-lg" : "bg-black/20 border-white/20"}`}
                  >
                    <Heart
                      size={16}
                      fill={isSelected ? "white" : "none"}
                      className="text-white"
                    />
                  </button>

                  {/* CLICK NA IMAGEM */}
                  <div onClick={() => setSelectedPhotoIndex(photos.indexOf(photo))}>
                    <GridImage
                      src={getImageUrl(photo.id, "w600")}
                      alt={`Foto ${index + 1}`}
                      priority={index < QTD_FOTO_EXIBIDAS}
                    />
                  </div>

                  {/* BORDA DE SELEÇÃO - Mais fina para parecer compacta */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-[#E67E70] rounded-2xl pointer-events-none" />
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