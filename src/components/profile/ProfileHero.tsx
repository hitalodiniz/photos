'use client';
import React, { useMemo } from 'react';
import { User, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { usePlan } from '@/core/context/PlanContext';

interface ProfileBioProps {
  miniBio?: string;
  isExpanded: boolean;
}

// SUB-COMPONENTE PARA O AVATAR
export const PhotographerAvatar = ({ photoPreview, isExpanded }: any) => (
  <div
    className={`relative flex items-center justify-center border border-champagne/60 rounded-full bg-black/40 backdrop-blur-md transition-all duration-1000 shrink-0 shadow-2xl overflow-hidden aspect-square ${
      isExpanded ? 'w-14 h-14 md:w-28 md:h-28' : 'w-10 h-10 md:w-20 md:h-20'
    }`}
  >
    {photoPreview ? (
      <Image
        src={photoPreview}
        alt="Perfil"
        fill
        className="object-cover"
        priority
        sizes="(max-width: 768px) 112px, 112px"
      />
    ) : (
      <User className="text-champagne w-1/2 h-1/2" />
    )}
  </div>
);

// SUB-COMPONENTE PARA A BIO
export const ProfileBio = ({ miniBio, isExpanded }: ProfileBioProps) => {
  const { permissions } = usePlan();

  // 🎯 REGRA: Nível 'basic' não exibe Bio (mesmo que exista no banco)
  if (permissions.profileLevel === 'basic' || !miniBio) return null;

  return (
    <div className="flex flex-col items-start w-full">
      {miniBio && (
        <div
          className={`flex items-start text-white font-medium gap-1.5 italic transition-all duration-1000 ${
            isExpanded
              ? 'text-[14px] md:text-[22px] mb-2'
              : 'text-[12px] md:text-[18px] mb-1'
          }`}
        >
          <Sparkles
            size={isExpanded ? 18 : 14}
            className="text-champagne shrink-0 mt-1"
          />
          <span
            className={
              isExpanded
                ? 'max-w-4xl w-full mb-6 opacity-100 line-clamp-[8]'
                : 'max-w-2xl line-clamp-2 md:line-clamp-5 opacity-80 mb-2'
            }
          >
            {miniBio}
          </span>
        </div>
      )}
    </div>
  );
};
