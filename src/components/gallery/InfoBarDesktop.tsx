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
      <div className="flex items-center gap-3 text-white text-[13px] font-semibold italic">
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
            <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-500">
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
          <Calendar
            size={18}
            className="text-[#F3E5AB] drop-shadow-[0_0_3px_rgba(243,229,171,0.5)]"
          />
          <span className="whitespace-nowrap animate-in fade-in duration-500">
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
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-3 duration-700">
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
            className={`flex items-center justify-center gap-2 rounded-full transition-all duration-500 active:scale-90
              ${showOnlyFavorites ? 'bg-[#E67E70] text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}
              ${isScrolled && !isHovered ? 'w-9 h-9 border border-white/20' : 'px-5 h-10 border border-white/10 text-[11px] font-bold tracking-widest'}
            `}
          >
            <Filter size={16} />
            {(!isScrolled || isHovered) && <span>Favoritos</span>}
          </button>
        )}

        <button
          onClick={downloadAllAsZip}
          disabled={isDownloading}
          className={`md:min-w-[140px] flex items-center justify-center gap-2 rounded-full bg-[#F3E5AB] text-slate-900 transition-all duration-500 shadow-xl active:scale-95
            ${isScrolled && !isHovered ? 'w-9 h-9' : 'px-5 h-10 text-[12px] font-bold '}
          `}
        >
          {isDownloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="tabular-nums">
                {downloadProgress < 95
                  ? `${Math.round(downloadProgress)}%`
                  : 'Preparando...'}
              </span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>Baixar tudo</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
