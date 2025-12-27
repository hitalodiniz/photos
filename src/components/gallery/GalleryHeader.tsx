import React from 'react';
import { Camera, MapPin } from 'lucide-react';

interface GalleryHeaderProps {
  title: string;
  location?: string;
  isLightbox?: boolean; // Ajusta paddings específicos se estiver no Lightbox
}

export const GalleryHeader: React.FC<GalleryHeaderProps> = ({ title, location, isLightbox = false }) => {
  return (
    <div className={`flex items-center gap-4 pointer-events-auto ${isLightbox ? 'drop-shadow-2xl' : ''}`}>
      {/* ÍCONE DE CÂMERA PADRONIZADO */}
      <div className="relative group">
        <div className="absolute inset-0 bg-[#F3E5AB]/20 rounded-full blur-xl group-hover:bg-[#F3E5AB]/30 transition-all duration-700" />
        <div className="relative p-3 md:p-4 bg-black/40 backdrop-blur-2xl rounded-full border border-[#F3E5AB]/40 shadow-2xl transition-transform duration-500 hover:scale-105">
          <Camera 
            size={22} 
            className="text-[#F3E5AB] w-6 h-6 md:w-8 md:h-8 drop-shadow-[0_0_15px_rgba(243,229,171,0.5)]" 
          />
        </div>
      </div>

      {/* TEXTOS EDITORIAIS */}
      <div className="flex flex-col text-left">
        <h2 className="text-lg md:text-3xl font-bold italic font-serif leading-tight text-white drop-shadow-lg tracking-tight">
          {title}
        </h2>
        
        {location && (
          <div className="flex items-center gap-2 text-[10px] md:text-[14px] tracking-[0.1em] text-[#F3E5AB]/90 font-bold mt-1.5 opacity-90">
            <MapPin size={12} className="animate-pulse" />
            <span className="drop-shadow-sm">{location}</span>
          </div>
        )}
      </div>
    </div>
  );
};