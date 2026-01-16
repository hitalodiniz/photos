import React from 'react';
import { Camera, MapPin, Calendar, ImageIcon } from 'lucide-react';

interface GalleryHeaderProps {
  title: string;
  location?: string;
  data: any;
  photoCount?: number;
}

export const GalleryHeader: React.FC<GalleryHeaderProps> = ({
  title,
  location,
  data,
  photoCount,
}) => {
  return (
    <div className="flex flex-col items-start text-left min-w-0 flex-1 pointer-events-auto select-none">
      {/* TÍTULO COM ÍCONE E DROP SHADOW REFORÇADO */}
      <div className="flex flex-col min-w-0 w-full">
        <h1 className="font-artistic font-semibold text-white transition-all duration-1000 leading-tight tracking-tight break-words flex items-center gap-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-xl md:text-3xl mb-1">
          <div className="relative shrink-0">
            {/* Brilho sutil atrás da câmera */}
            <div className="absolute inset-0 bg-[#F3E5AB]/20 blur-lg rounded-full" />
            <Camera
              className="relative text-[#F3E5AB] shrink-0 drop-shadow-[0_0_8px_rgba(243,229,171,0.4)] w-6 h-6 md:w-8 md:h-8"
              strokeWidth={1.5}
            />
          </div>
          <span className="drop-shadow-lg tracking-tight">{title}</span>
        </h1>
        {/* LINHA CHAMPANHE FORTE */}
        <div className="h-[2px] md:h-[3px] bg-[#F3E5AB] rounded-full mb-3 md:mb-4 w-full max-w-[150px] md:max-w-[300px] shadow-lg" />
      </div>

      {/* DADOS DA GALERIA COM DIVISORES E SOMBRAS PARA FUNDO PRETO */}
      <div className="flex flex-col items-start gap-y-1.5 md:gap-y-2 transition-all duration-1000 justify-start">
        {/* 1. LOCALIZAÇÃO */}
        {location && (
          <div className="flex items-center text-white/90 text-[10px] md:text-[13px] font-medium shrink-0 gap-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            <MapPin size={14} className="text-[#F3E5AB] opacity-90" />
            <span className="tracking-wide">{location}</span>
          </div>
        )}

        {/* 2. DATA DO EVENTO */}
        {data && (
          <div className="flex items-center text-white/90 text-[10px] md:text-[13px] font-medium shrink-0 gap-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            <Calendar size={14} className="text-[#F3E5AB] opacity-90" />
            <span className="tracking-wide">
              {new Date(data).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
