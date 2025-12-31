'use client';
import React, { useState, useCallback } from 'react';
import {
  Filter,
  Download,
  ImageIcon,
  Globe,
  Loader2,
  Calendar,
  MapPin,
  Info,
  Instagram,
  MessageCircle,
  User,
  Heart,
} from 'lucide-react';
import Masonry from 'react-masonry-css';
import { div } from 'framer-motion/client';

export const InfoBarMobile = ({
  galeria,
  photos,
  favorites,
  showOnlyFavorites,
  setShowOnlyFavorites,
  downloadAllAsZip,
  isDownloading,
  isScrolled,
  handleDownloadFavorites,
  isDownloadingFavs,
  favDownloadProgress,
  displayedPhotos,
  displayLimit,
  toggleFavoriteFromGrid,
  setSelectedPhotoIndex,
  getImageUrl,
  QTD_FOTO_EXIBIDAS,
  masonryKey,
  breakpointColumnsObj,
  refreshFavorites,
}: any) => {
  const [activeHint, setActiveHint] = useState<string | null>(null);

  const triggerHint = (message: string) => {
    setActiveHint(message);
    setTimeout(() => setActiveHint(null), 4000);
  };

  return (
    <div className="w-full flex flex-col items-center pb-2">
      {/* 1. BARRA MOBILE FIXA (STICKY) */}
      <div className="w-full flex flex-col items-center z-[50] sticky top-6 md:hidden">
        <div className="relative w-full flex justify-center">
          <div
            className={`absolute transition-all duration-500 transform 
            ${activeHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
            ${activeHint === 'social' ? 'top-14' : 'top-16'}`}
          >
            <div className="bg-[#F3E5AB] text-black rounded-2xl shadow-2xl border border-white/20 p-2 px-5 flex flex-col items-center justify-center min-w-max">
              <div className="w-3 h-3 bg-[#F3E5AB] rotate-45 mx-auto -mt-3.5 mb-1 shadow-sm"></div>
              {activeHint === 'social' ? (
                <div className="flex items-center gap-4 py-1">
                  <span className="text-[12px] font-bold uppercase tracking-widest border-r border-black/10 pr-3">
                    Fotógrafo
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        window.open(
                          `https://wa.me/${galeria.photographer_whatsapp}`,
                        )
                      }
                      className="text-black active:scale-125 transition-transform"
                    >
                      <MessageCircle size={18} />
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `https://instagram.com/${galeria.photographer_instagram}`,
                        )
                      }
                      className="text-black active:scale-125 transition-transform"
                    >
                      <Instagram size={18} />
                    </button>
                    <button
                      onClick={() => window.open(galeria.photographer_website)}
                      className="text-black active:scale-125 transition-transform"
                    >
                      <User size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[13px] font-bold tracking-tight whitespace-pre-line text-left leading-relaxed py-1">
                  {activeHint}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`flex items-center backdrop-blur-2xl p-1.5 px-3 rounded-full border shadow-2xl gap-3 max-w-[95vw] mx-auto transition-all duration-500
          ${isScrolled && !activeHint ? 'bg-black/40 border-white/10 opacity-70 scale-90' : 'bg-black/80 border-white/20 opacity-100 scale-100'}`}
        >
          <div
            className="flex-shrink-0 cursor-pointer active:scale-90 transition-transform"
            onClick={() =>
              setActiveHint(activeHint === 'social' ? null : 'social')
            }
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
          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <button
                onClick={() => {
                  setShowOnlyFavorites(!showOnlyFavorites);
                  triggerHint(
                    !showOnlyFavorites
                      ? `Filtrando ${favorites.length} favoritas`
                      : 'Exibindo tudo',
                  );
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${showOnlyFavorites ? 'bg-[#E67E70] text-white shadow-lg' : 'bg-white/10 text-white'}`}
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
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. BOTÃO FLUTUANTE DE DOWNLOAD FAVORITOS */}
      {favorites.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={handleDownloadFavorites}
            disabled={isDownloadingFavs}
            className="flex items-center gap-3 bg-[#E67E70] hover:bg-[#D66D5F] text-white px-4 py-2 rounded-full shadow-[0_10px_40px_rgba(230,126,112,0.4)] transition-all active:scale-95 group border border-white/20"
          >
            {isDownloadingFavs ? (
              <div className="flex items-center gap-2">
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
                  <span className="text-white text-sm font-medium italic">
                    Baixar favoritas
                  </span>
                  <span className="text-[10px] opacity-80 italic">
                    {favorites.length}{' '}
                    {favorites.length === 1 ? 'foto' : 'fotos'}
                  </span>
                </div>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
