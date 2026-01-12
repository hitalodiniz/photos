'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Filter,
  Download,
  Loader2,
  Info,
  Instagram,
  MessageCircle,
  User,
  X,
} from 'lucide-react';
import { GALLERY_MESSAGES } from '@/constants/messages';

export const InfoBarMobile = ({
  galeria,
  photos,
  favorites,
  showOnlyFavorites,
  setShowOnlyFavorites,
  downloadAllAsZip,
  isDownloading,
  isScrolled,
  isDownloadingFavs,
  favDownloadProgress,
  downloadProgress,
}: any) => {
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const wasDownloading = useRef(false);

  const triggerHint = (message: string) => {
    setActiveHint(message);
    setTimeout(() => setActiveHint(null), 4000);
  };

  // Centralização dos dados do fotógrafo
  const { fullName, displayAvatar, initialLetter, instagram, website, phone } =
    useMemo(() => {
      const p = galeria.photographer;
      const name = p?.full_name || 'Fotógrafo';
      return {
        fullName: name,
        displayAvatar:
          p?.profile_picture_url || galeria.photographer_avatar_url || null,
        initialLetter: name.charAt(0).toUpperCase(),
        instagram: p.instagram_link,
        website: p.username,
        phone: p?.phone_contact?.replace(/\D/g, '') || '',
      };
    }, [galeria]);

  // Monitoramento de Download
  useEffect(() => {
    const activelyDownloading = isDownloading || isDownloadingFavs;
    const currentProgress = isDownloading
      ? downloadProgress
      : favDownloadProgress;

    if (activelyDownloading) {
      const message =
        currentProgress < 95
          ? `Preparando ${isDownloadingFavs ? 'favoritas' : 'download'}: ${Math.round(currentProgress)}%`
          : 'Finalizando arquivo ZIP...';

      setActiveHint(message);
      wasDownloading.current = true;
    }

    if (!activelyDownloading && wasDownloading.current) {
      setActiveHint('Download concluído!');
      wasDownloading.current = false;
      const timer = setTimeout(() => setActiveHint(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [downloadProgress, favDownloadProgress, isDownloading, isDownloadingFavs]);

  return (
    <div className="w-full flex flex-col items-center pb-2">
      <div className="w-full flex flex-col items-center z-[50] sticky top-6 md:hidden">
        {/* TOOLTIP / HINT SYSTEM */}
        <div className="relative w-full flex justify-center">
          <div
            className={`absolute transition-all duration-500 transform 
            ${activeHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
            ${activeHint === 'social' ? 'top-14' : 'top-16'}`}
          >
            <div className="bg-champagne-dark text-black rounded-2xl shadow-2xl border border-white/20 p-2 pr-1.5 pl-5 flex flex-col items-center justify-center min-w-[200px] max-w-[90vw]">
              <div className="w-3 h-3 bg-champagne-dark rotate-45 mx-auto -mt-3.5 mb-1 shadow-sm"></div>

              <div className="flex w-full items-start justify-between gap-2">
                {activeHint === 'social' ? (
                  <div className="flex items-center gap-4 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest border-r border-black/10 pr-3">
                      Contato
                    </span>
                    <div className="flex items-center gap-4">
                      {phone && (
                        <button
                          onClick={() =>
                            window.open(
                              `https://wa.me/${phone}?text=${encodeURIComponent(GALLERY_MESSAGES.CONTACT_PHOTOGRAPHER(galeria.title))}`,
                            )
                          }
                          className="text-black active:scale-125 transition-transform"
                        >
                          <MessageCircle size={20} />
                        </button>
                      )}
                      {instagram && (
                        <button
                          onClick={() =>
                            window.open(`https://instagram.com/${instagram}`)
                          }
                          className="text-black active:scale-125 transition-transform"
                        >
                          <Instagram size={20} />
                        </button>
                      )}
                      {website && (
                        <button
                          onClick={() => window.open(`/${website}`)}
                          className="text-black active:scale-125 transition-transform"
                        >
                          <User size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[12px] font-bold tracking-tight whitespace-pre-line text-left leading-relaxed py-1 flex-1">
                    {activeHint}
                  </div>
                )}

                {/* BOTÃO DE FECHAR */}
                <button
                  onClick={() => setActiveHint(null)}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors self-start"
                >
                  <X size={14} className="text-black/40" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN BAR */}
        <div
          className={`flex items-center backdrop-blur-2xl p-1.5 px-3 rounded-full border shadow-2xl gap-3 max-w-[95vw] mx-auto transition-all duration-500
          ${isScrolled && !activeHint ? 'bg-black/40 border-white/10 opacity-70 scale-90' : 'bg-black/80 border-white/20 opacity-100 scale-100'}`}
        >
          {/* AVATAR SECTION */}
          <div
            className="flex-shrink-0 cursor-pointer active:scale-90 transition-transform"
            onClick={() =>
              setActiveHint(activeHint === 'social' ? null : 'social')
            }
          >
            <div className="relative w-9 h-9 flex items-center justify-center">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  className={`w-full h-full rounded-full border-2 object-cover transition-colors ${activeHint === 'social' ? 'border-champagne-dark' : 'border-champagne-dark/40'}`}
                  alt={fullName}
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center border border-white/20 rounded-full">
                  <span className="text-white font-bold text-sm uppercase">
                    {initialLetter}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 bg-champagne-dark rounded-full p-0.5 border border-black">
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              </div>
            </div>
          </div>

          <div className="w-[1px] h-5 bg-white/10" />

          {/* INFO BUTTON */}
          <button
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${activeHint && activeHint !== 'social' ? 'bg-champagne-dark text-black' : 'bg-white/10 text-champagne-dark'}`}
            onClick={() => {
              const dataStr = `📅 ${new Date(galeria.date).toLocaleDateString('pt-BR')}`;
              const info = `📸 ${photos.length} Fotos\n${dataStr}\n📍 ${galeria.location || 'Local não informado'}`;
              setActiveHint(activeHint === info ? null : info);
            }}
          >
            <Info size={18} />
          </button>

          <div className="w-[1px] h-5 bg-white/10" />

          {/* ACTIONS */}
          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <button
                onClick={() => {
                  setShowOnlyFavorites(!showOnlyFavorites);
                  triggerHint(
                    !showOnlyFavorites
                      ? `Filtrando ${favorites.length} favoritas`
                      : 'Exibindo todas as fotos',
                  );
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${showOnlyFavorites ? 'bg-[#E67E70] text-white shadow-lg' : 'bg-white/10 text-white'}`}
              >
                <Filter size={16} />
              </button>
            )}

            <button
              onClick={() => !isDownloading && downloadAllAsZip()}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isDownloading ? 'bg-champagne-dark text-black' : 'bg-white/10 text-white'}`}
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
    </div>
  );
};
