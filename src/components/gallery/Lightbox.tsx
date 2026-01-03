'use client';
import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageCircle,
  Loader2,
  Heart,
} from 'lucide-react';
import { GalleryHeader, PhotographerAvatar } from '@/components/gallery';
import { getImageUrl, getHighResImageUrl } from '@/utils/url-helper';

import type { Galeria } from '@/types/galeria';

interface Photo {
  id: string | number;
}

interface LightboxProps {
  photos: Photo[];
  activeIndex: number;
  totalPhotos: number;
  galleryTitle: string;
  location: string;
  galeria: Galeria;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Lightbox({
  photos,
  activeIndex,
  totalPhotos,
  galleryTitle,
  location,
  galeria,
  onClose,
  onNext,
  onPrev,
}: LightboxProps) {
  const [setShowHint] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showButtonText, setShowButtonText] = useState(true);
  const [showInterface, setShowInterface] = useState(true);

  //Efeito que oculta tudo da tela, exceto a foto, quando não mexe o mouse
  useEffect(() => {
    // Detecta se é mobile (largura menor que 768px)
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setShowInterface(true);
      return;
    }

    let timer: NodeJS.Timeout;
    const handleActivity = () => {
      setShowInterface(true); // Reativa a interface ao mover ou tocar
      clearTimeout(timer);
      timer = setTimeout(() => setShowInterface(false), 2000); // Oculta após 2s
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      clearTimeout(timer);
    };
  }, []);

  const minSwipeDistance = 50;

  // Lógica de Swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) onNext();
    else if (distance < -minSwipeDistance) onPrev();
  };

  // 1. Defina o estado de favoritos no topo do componente
  const [favorites, setFavorites] = useState<string[]>([]);

  // 2. Carregar favoritos do dispositivo (localStorage)
  useEffect(() => {
    const saved = localStorage.getItem(`fav_${galeria.id}`);
    if (saved) setFavorites(JSON.parse(saved));
  }, [galeria.id]);

  // 3. CORREÇÃO DO ERRO: Use activeIndex em vez de index
  const currentPhotoId = photos[activeIndex]?.id;
  const isFavorited = favorites.includes(currentPhotoId);
  // Contador de quantos favoritos existem no total nesta galeria
  const totalFavorites = favorites.length;

  // 4. Função para favoritar/desfavoritar
  const toggleFavorite = () => {
    if (!currentPhotoId) return;

    // Verifica se é a PRIMEIRA vez que o usuário interage com favoritos nesta galeria
    //const hasHistory = localStorage.getItem(`fav_${galeria.id}`);

    //if (!hasHistory && !isFavorited) {
    setShowHint(true);
    // O balão some automaticamente após 6 segundos
    setTimeout(() => setShowHint(false), 2000);
    //}

    const newFavs = isFavorited
      ? favorites.filter((id) => id !== currentPhotoId)
      : [...favorites, currentPhotoId];

    setFavorites(newFavs);
    localStorage.setItem(`fav_${galeria.id}`, JSON.stringify(newFavs));
  };

  //Efeito dos botões de ação
  useEffect(() => {
    // Oculta o texto após 5 segundos da primeira abertura
    const timer = setTimeout(() => setShowButtonText(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDownloadFavorites = async () => {
    // Filtra as fotos da galeria que estão nos favoritos
    const toDownload = photos.filter((p) => favorites.includes(p.id));

    if (toDownload.length === 0) return;

    // Dispara o download individual de cada uma (o navegador pode pedir permissão para múltiplos arquivos)
    for (const photo of toDownload) {
      const link = document.createElement('a');
      link.href = photo.url_high_res || photo.url;
      link.download = `foto-${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Pequeno atraso para não travar o browser
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  // Proteção de dados
  if (!photos || !photos[activeIndex]) return null;
  const photo = photos[activeIndex];

  // Pre-load e Scroll lock
  useEffect(() => {
    setIsImageLoading(true);
    if (activeIndex + 1 < photos.length) {
      const nextImg = new Image();
      nextImg.src = getImageUrl(photos[activeIndex + 1].id);
    }
  }, [activeIndex, photos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, onNext, onPrev]);

  const handleShareWhatsApp = async () => {
    // Limpeza para evitar a barra extra que causava erro no banco
    const rawSlug = galeria.slug || '';
    const cleanedSlug = rawSlug.startsWith('/')
      ? rawSlug.substring(1)
      : rawSlug;

    // URL Editorial: hitalodiniz/2025/10/25/casamento/ID_DA_FOTO
    const shareUrl = `${window.location.origin}/photo/${photo.id}?s=${cleanedSlug}`;

    const shareText = `Confira esta foto exclusiva: ${galleryTitle}`;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      try {
        // Compartilhamento nativo com o arquivo da foto
        const response = await fetch(getHighResImageUrl(photo.id));
        const blob = await response.blob();
        const file = new File([blob], 'foto.jpg', { type: 'image/jpeg' });

        await navigator.share({
          files: [file],
          title: galleryTitle,
          text: `${shareText}\n\nLink: ${shareUrl}`,
        });
        return;
      } catch (e) {
        console.error('Erro no Share nativo:', e);
      }
    }

    // Fallback: Link direto
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const highResUrl = getHighResImageUrl(photo.id);
      const response = await fetch(highResUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${galleryTitle.replace(/\s+/g, '_')}_foto_${activeIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      window.open(getHighResImageUrl(photo.id), '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] bg-black flex flex-col items-center overflow-x-hidden overflow-y-auto md:overflow-hidden select-none scrollbar-hide"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative md:fixed inset-0 z-[999] flex flex-col bg-black animate-in fade-in duration-300 min-h-full">
        {/* BARRA SUPERIOR - Ajustada com flex-col no mobile para evitar sobreposição */}
        <div
          className={`relative md:absolute top-0 left-0 right-0 flex flex-col md:flex-row items-center justify-between p-4 md:px-14 md:py-8 text-white/90 z-[200] bg-gradient-to-b from-black/95 via-black/40 to-transparent w-full gap-4 md:gap-6 transition-all duration-700 ease-in-out ${showInterface ? 'opacity-100 translate-y-0' : 'md:opacity-0 md:translate-y-4 md:pointer-events-none'}`}
        >
          {/* Título ocupa largura total no mobile para garantir alinhamento */}
          <div className="w-full md:w-auto flex justify-start">
            <GalleryHeader
              title={galleryTitle}
              location={location}
              data={galeria.date}
            />
          </div>

          {/* Barra de Ferramentas centralizada no mobile e à direita no desktop */}
          <div className="w-full md:w-auto flex justify-center md:justify-end pointer-events-auto z-[200]">
            <div
              className="flex items-center bg-black/80 backdrop-blur-2xl p-2 px-3 md:p-2 md:px-3 rounded-2xl border border-white/20 shadow-2xl transition-all duration-500 ease-in-out relative"
              onMouseEnter={() => setShowButtonText(true)}
              onMouseLeave={() => setShowButtonText(false)}
              role="toolbar"
            >
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-0 hover:gap-2 transition-all duration-500 group border-r border-white/10 pr-3"
              >
                <div className="flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/5 group-hover:bg-[#25D366]/20 transition-colors shrink-0">
                  <MessageCircle className="text-white group-hover:text-[#25D366] w-[20px] h-[20px] md:w-[24px] md:h-[24px]" />
                </div>
                <div
                  className={`gap-y-1 flex flex-col items-start leading-none transition-all duration-500 overflow-hidden ${showButtonText ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'}`}
                >
                  <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest italic text-white whitespace-nowrap">
                    WhatsApp
                  </span>
                  <span className="text-[8px] md:text-[11px] opacity-60 font-semibold text-white/70 whitespace-nowrap">
                    Compartilhar
                  </span>
                </div>
              </button>

              <div className="relative flex items-center border-r border-white/10 pr-3 ml-2">
                <button
                  onClick={toggleFavorite}
                  className={`flex items-center gap-0 transition-all duration-500 group ${isFavorited ? 'text-[#E67E70]' : 'hover:text-[#F3E5AB]'}`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full transition-colors shrink-0 ${isFavorited ? 'bg-[#E67E70]/20' : 'bg-white/5'}`}
                  >
                    <Heart
                      fill={isFavorited ? 'currentColor' : 'none'}
                      className={`w-[20px] h-[20px] md:w-[24px] md:h-[24px] ${isFavorited ? 'animate-pulse' : 'text-white'}`}
                    />{' '}
                  </div>
                  <div
                    className={`gap-y-1 flex flex-col items-start leading-none transition-all duration-500 overflow-hidden ${showButtonText ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'}`}
                  >
                    <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest italic text-white whitespace-nowrap">
                      Favoritar
                    </span>
                    <span className="text-[8px] md:text-[11px] opacity-60  font-semibold text-white/70 whitespace-nowrap">
                      {totalFavorites > 0 ? `(${totalFavorites})` : 'Foto'}
                    </span>
                  </div>
                </button>
              </div>

              <button
                onClick={handleDownload}
                className="flex items-center gap-0 transition-all duration-500 group border-r border-white/10 pr-3 ml-2"
              >
                <div className="flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
                  {isDownloading ? (
                    <Loader2 className="animate-spin text-[#F3E5AB] w-[20px] h-[20px] md:w-[24px] md:h-[24px]" />
                  ) : (
                    <Download className="text-white w-[20px] h-[20px] md:w-[24px] md:h-[24px]" />
                  )}
                </div>
                <div
                  className={`gap-y-1 flex flex-col items-start leading-none transition-all duration-500 overflow-hidden ${showButtonText ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'}`}
                >
                  <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest italic text-white whitespace-nowrap">
                    Download
                  </span>
                  <span className="text-[8px] md:text-[11px] opacity-60  font-bold text-white/70 whitespace-nowrap">
                    Alta Resolução
                  </span>
                </div>
              </button>
              {/* BOTÃO FECHAR - Adicionado e.preventDefault e cursor reforçado */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="flex items-center justify-center pl-2 ml-1 relative z-[210] cursor-pointer hover:scale-110 active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/5 hover:bg-red-500/20 transition-colors shrink-0">
                  <X className="text-white hover:text-red-400 w-[20px] h-[20px] md:w-[24px] md:h-[24px]" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ÁREA CENTRAL - Foto Ocupando Máximo de Espaço com Efeito de Brilho */}
        <div className="flex-1 relative w-full flex flex-col items-center justify-center px-2 md:px-0 py-2 md:py-0">
          {/* 1. SETA ESQUERDA - Área de clique centralizada verticalmente */}
          <button
            onClick={onPrev}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-[80] h-fit py-20 px-4 text-white/10 hover:text-[#F3E5AB] hidden md:block transition-all duration-300 transition-all duration-700 ${showInterface ? 'opacity-100' : 'md:opacity-0 md:translate-y-4 md:pointer-events-none'}`}
          >
            <ChevronLeft size={64} strokeWidth={1} />
          </button>

          <div className="flex flex-col items-center justify-center w-full h-full max-h-screen">
            <div className="relative flex flex-col items-center">
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <Loader2 className="w-10 h-10 text-[#F3E5AB] animate-spin" />
                </div>
              )}
              <img
                key={photos[activeIndex].id}
                src={getImageUrl(photos[activeIndex].id)}
                onLoad={() => setIsImageLoading(false)}
                /* Transição de 1s, brilho e sombra projetada */
                className={`max-w-full max-h-[75vh] md:max-h-screen object-contain transition-all duration-1000 ease-out shadow-[0_0_80px_rgba(0,0,0,0.9)] 
        ${isImageLoading ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0 brightness-110'}`}
              />
            </div>
          </div>
          {/* 2. SETA DIREITA - Libera o topo para o botão X */}
          <button
            onClick={onNext}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-[80] h-fit py-20 px-6 text-white/10 hover:text-[#F3E5AB] hidden md:block transition-all duration-300 transition-all duration-700 ${showInterface ? 'opacity-100' : 'md:opacity-0 md:translate-y-4 md:pointer-events-none'}`}
          >
            <ChevronRight size={64} strokeWidth={1} />
          </button>
        </div>

        {/* RODAPÉ UNIFICADO - Contador Inteligente e Avatar */}
        <div
          className={`relative w-full flex flex-col items-center justify-center gap-2 pb-6 md:pb-0 md:pt-0 transition-all duration-700 ease-in-out ${showInterface ? 'opacity-100 translate-y-0' : 'md:opacity-0 md:translate-y-4 md:pointer-events-none'}`}
        >
          <div className="z-[90] pointer-events-none md:absolute md:left-14 md:bottom-10">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 px-6 rounded-full border border-white/10 shadow-lg">
              <p className="text-white/80 text-sm md:text-lg italic font-serif text-center md:text-left">
                Foto{' '}
                <span className="text-[#F3E5AB] font-bold">
                  {activeIndex + 1}
                </span>{' '}
                de {totalPhotos}
              </p>
            </div>
          </div>

          <div className="z-[100] w-full flex justify-center">
            <PhotographerAvatar galeria={galeria} position="bottom-lightbox" />
          </div>
        </div>
      </div>
    </div>
  );
}
