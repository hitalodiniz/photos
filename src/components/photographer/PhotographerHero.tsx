'use client';
import React from 'react';
import { MapPin, User, Sparkles } from 'lucide-react';
import Image from 'next/image';

// SUB-COMPONENTE PARA O AVATAR (Passado no sideElement)
export const PhotographerAvatar = ({ photoPreview, isExpanded }: any) => (
  <div
    className={`relative flex items-center justify-center border border-[#F3E5AB]/60 rounded-full bg-black/40 backdrop-blur-md transition-all duration-1000 shrink-0 shadow-2xl overflow-hidden aspect-square ${isExpanded ? 'w-14 h-14 md:w-28 md:h-28' : 'w-10 h-10 md:w-20 md:h-20'}`}
  >
    {photoPreview ? (
      <Image
        src={photoPreview}
        alt="Perfil"
        fill
        className="object-cover"
        priority
      />
    ) : (
      <User className="text-[#F3E5AB] w-1/2 h-1/2" />
    )}
  </div>
);

// SUB-COMPONENTE PARA A BIO E CIDADES (Passado no children)
export const PhotographerBio = ({ miniBio, cities, isExpanded }: any) => (
  <div className="flex flex-col items-start w-full">
    {miniBio && (
      <div
        className={`flex items-start text-white font-medium gap-1.5 italic transition-all duration-1000 ${isExpanded ? 'text-[14px] md:text-[22px] mb-2' : 'text-[12px] md:text-[18px] mb-1'}`}
      >
        <Sparkles
          size={isExpanded ? 18 : 14}
          className="text-[#F3E5AB] shrink-0 mt-1"
        />
        <span
          className={
            isExpanded
              ? 'max-w-none w-full mb-2'
              : 'truncate max-w-[200px] md:max-w-3xl mb-1'
          }
        >
          {miniBio}
        </span>
      </div>
    )}
    {/*<div className="flex items-center text-white text-[10px] md:text-[14px] font-medium gap-1.5 opacity-90">
      <MapPin size={14} className="text-[#F3E5AB]" />
      <span className="tracking-wider">{cities.join(' • ')}</span>
    </div>*/}
  </div>
);
