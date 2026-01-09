'use client';
import React, { useState, useEffect } from 'react';
import {
  Filter,
  Download,
  Loader2,
  Info,
  Instagram,
  MessageCircle,
  User,
} from 'lucide-react';

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

  const triggerHint = (message: string) => {
    setActiveHint(message);
    setTimeout(() => setActiveHint(null), 4000);
  };

  // Dentro do seu InfoBarMobile.tsx
  const wasDownloading = React.useRef(false);

  useEffect(() => {
    // 1. MONITORAMENTO DE DOWNLOAD (TUDO OU FAVORITAS)
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

    // 2. GATILHO DE CONCLUSÃO
    if (!activelyDownloading && wasDownloading.current) {
      setActiveHint('Download concluído!');
      wasDownloading.current = false;

      const timer = setTimeout(() => {
        setActiveHint(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [downloadProgress, favDownloadProgress, isDownloading, isDownloadingFavs]);

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
            <div className="bg-champagne-dark text-black rounded-2xl shadow-2xl border border-white/20 p-2 px-5 flex flex-col items-center justify-center min-w-max">
              <div className="w-3 h-3 bg-champagne-dark rotate-45 mx-auto -mt-3.5 mb-1 shadow-sm"></div>
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
              <div className="absolute -bottom-0.5 -right-0.5 bg-champagne-dark rounded-full p-0.5 border border-black">
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              </div>
            </div>
          </div>
          <div className="w-[1px] h-5 bg-white/10" />
          {/* INFO */}
          <button
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${activeHint && activeHint !== 'social' ? 'bg-champagne-dark text-black' : 'bg-white/10 text-[#F3E5AB]'}`}
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
                if (!isDownloading) {
                  downloadAllAsZip();
                  // O useEffect acima cuidará de manter o hint atualizado
                }
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isDownloading
                  ? 'bg-champagne-dark text-black'
                  : 'bg-white/10 text-white'
              }`}
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
