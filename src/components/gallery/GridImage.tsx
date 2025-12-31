'use client';
import React, { useState } from 'react';
import Image from 'next/image';

interface GridImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  index: number;
}

const GridImage = ({ src, alt, priority, index }: GridImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl transition-all duration-500 ${
        isLoaded ? 'bg-transparent' : 'bg-slate-100 animate-pulse'
      }`}
      style={{
        minHeight: '200px',
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 33vw"
        onLoad={() => setIsLoaded(true)}
        // Força carregamento prioritário para as imagens no topo da página
        priority={index < 12}
        // Imagens abaixo da "dobra" usam lazy loading para economizar dados
        loading={index < 12 ? undefined : 'lazy'}
        unoptimized
        /* className={`
          w-full h-auto block object-cover transition-all duration-1000 ease-in-out
          ${isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-lg'}
        `}*/
        className="object-cover w-full h-auto"
      />
    </div>
  );
};

export default GridImage;
