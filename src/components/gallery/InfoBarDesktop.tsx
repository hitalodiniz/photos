'use client';
import React from 'react';
import {
  Globe,
  Lock,
  ImageIcon,
  Calendar,
  MapPin,
  Filter,
  Download,
  Loader2,
} from 'lucide-react';

export const InfoBarDesktop = ({
  galeria,
  photos,
  favorites,
  showOnlyFavorites,
  setShowOnlyFavorites,
  downloadAllAsZip,
  isScrolled,
  isHovered,
  isDownloading,
  downloadProgress,
  setIsHovered,
}: any) => {
  return (
    <div
      className={`
    hidden md:flex items-center justify-center barra-fantasma z-[50] sticky top-6
    backdrop-blur-xl rounded-full border shadow-2xl mx-auto transition-all duration-500
    ${
      isScrolled && !isHovered
        ? 'p-1.5 px-4 gap-3 bg-black/40 border-white/20 opacity-90 scale-95'
        : 'p-2 px-6 gap-5 bg-black/70 border-white/30 opacity-100 scale-100'
    } 
  `}
    >
      <div className="flex items-center gap-3 text-white text-[14px] font-semibold italic">
        <div className="flex items-center gap-2">
          {galeria.is_public ? (
            <Globe
              size={18}
              className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)] animate-pulse"
            />
          ) : (
            <Lock
              size={18}
              className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]"
            />
          )}

          {(!isScrolled || isHovered) && (
            <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
              {galeria.is_public ? 'Galeria Pública' : 'Acesso Restrito'}
            </span>
          )}
        </div>

        <div className="w-[1px] h-4 bg-white/20"></div>

        <div className="flex items-center gap-2">
          <ImageIcon
            size={18}
            className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]"
          />
          {(!isScrolled || isHovered) && (
            <span className="whitespace-nowrap animate-in fade-in duration-200">
              {photos.length} fotos
            </span>
          )}
        </div>
      </div>

      <div className="w-[1px] h-4 bg-white/20"></div>

      {/* SEÇÃO: DATA E LOCALIZAÇÃO (CORRIGIDA) */}
      <div className="flex items-center gap-3 text-white text-[14px] font-semibold italic">
        <div className="flex items-center gap-2">
          <Calendar
            size={18}
            className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]"
          />
          <span className="whitespace-nowrap animate-in fade-in duration-200">
            {(!isScrolled || isHovered) &&
              new Date(galeria.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
          </span>
        </div>
        {/* LOCALIZAÇÃO: Agora garantindo exibição no estado expandido */}

        {galeria.location && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-3 duration-200">
            <div className="w-[1px] h-4 bg-white/20"></div>
            <div className="flex items-center gap-2 max-w-[250px] truncate">
              <MapPin
                size={18}
                className="text-[#F3E5AB] drop-shadow-[0_0_3_px_rgba(243,229,171,0.5)]"
              />
              {(!isScrolled || isHovered) && (
                <span className="tracking-tight">{galeria.location}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO: AÇÕES */}
      <div className="flex items-center gap-2 pl-3 border-l border-white/20 ml-auto">
        {favorites.length > 0 && (
          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
    flex items-center justify-center rounded-full transition-all duration-300 ease-out overflow-hidden h-10
    ${showOnlyFavorites ? 'bg-[#E67E70] text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}
    ${
      isScrolled && !isHovered
        ? 'w-10 border border-white/20'
        : 'w-[130px] border border-white/10 px-4 gap-2'
    }
  `}
          >
            <div className="flex-shrink-0">
              <Filter size={16} />
            </div>

            {(!isScrolled || isHovered) && (
              <span className="text-[14px] font-semibold tracking-widest whitespace-nowrap animate-in fade-in duration-300">
                Favoritos
              </span>
            )}
          </button>
        )}

        <button
          onClick={downloadAllAsZip}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          disabled={isDownloading}
          className={`
    flex items-center justify-center rounded-full bg-[#F3E5AB] text-slate-900 shadow-xl 
    transition-all duration-100 ease-out overflow-hidden h-10
    ${
      isScrolled && !isHovered && !isDownloading
        ? 'w-10'
        : 'w-[150px] px-4 gap-2'
    }
  `}
        >
          <div className="flex-shrink-0">
            {isDownloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
          </div>

          {/* O span só existe se o botão estiver expandido, evitando que ele ocupe espaço invisível */}
          {(isDownloading || !isScrolled || isHovered) && (
            <span className="text-[14px] font-semibold whitespace-nowrap animate-in fade-in duration-100">
              {isDownloading
                ? `${Math.round(downloadProgress)}%`
                : 'Baixar tudo'}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
