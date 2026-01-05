import React from 'react';
import { Camera, MapPin, Calendar } from 'lucide-react';

interface GalleryHeaderProps {
  title: string;
  location?: string;
  data: any; // Ajustado para aceitar o objeto de data enviado
}

export const GalleryHeader: React.FC<GalleryHeaderProps> = ({
  title,
  location,
  data,
}) => {
  return (
    <div className="flex items-center gap-4 pointer-events-auto drop-shadow-2xl">
      {/* ÍCONE DE CÂMERA PADRONIZADO */}
      <div className="relative group shrink-0">
        <div className="absolute inset-0 bg-champagne-dark/20 rounded-full blur-xl group-hover:bg-champagne-dark/30 transition-all duration-700" />
        <div className="relative p-3 md:p-4 bg-black/40 backdrop-blur-2xl rounded-full border border-[#F3E5AB]/40 shadow-2xl transition-transform duration-500 hover:scale-105">
          <Camera
            size={20}
            className="text-[#F3E5AB] w-6 h-6 md:w-8 md:h-8 drop-shadow-[0_0_15px_rgba(243,229,171,0.5)]"
          />
        </div>
      </div>

      {/* TEXTOS EDITORIAIS */}
      <div className="flex flex-col text-left">
        <h2 className="text-lg md:text-2xl font-bold italic font-serif leading-tight text-white drop-shadow-lg tracking-tight">
          {title}
        </h2>

        {/* LINHA DE METADADOS: DATA -> LOCALIZAÇÃO */}
        <div className="flex flex-col items-start gap-y-1 mt-1.5">
          {/* DATA (PRIMEIRO) */}
          {data && (
            <div className="flex items-center gap-2 text-[#F3E5AB]/90 text-[11px] md:text-[14px] tracking-wider font-medium italic">
              <Calendar size={14} className="text-[#F3E5AB] opacity-80" />
              <span className="drop-shadow-sm">
                {new Date(data).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* LOCALIZAÇÃO (DEPOIS) */}
          {location && (
            <div className="flex items-center gap-2 text-[#F3E5AB]/90 text-[11px] md:text-[14px] tracking-wider font-medium italic">
              <MapPin size={14} className="text-[#F3E5AB] animate-pulse" />
              <span className="drop-shadow-sm">{location}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
