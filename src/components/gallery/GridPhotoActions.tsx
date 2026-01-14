'use client';
import React, { useState } from 'react';
import { Download, Heart, Link as LinkIcon, Check } from 'lucide-react';
import WhatsAppIcon from '../ui/WhatsAppIcon';

export const GridPhotoActions = ({
  isFavorited,
  onToggleFavorite,
  onShareWhatsApp,
  onDownload,
  onCopyLink,
  btnScale,
  iconSize,
  isMobile,
  currentCols,
}: any) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btnSize = isMobile && currentCols === 2 ? 32 : 40 * btnScale;
  const finalIconSize = isMobile && currentCols === 2 ? 14 : iconSize;

  const baseBtnClass =
    'rounded-full flex items-center justify-center pointer-events-auto transition-all duration-300 shadow-lg border';

  return (
    /* 1. Adicionado 'flex-row' para garantir direção normal (Ltr).
       2. Adicionado 'justify-between' para separar os dois lados.
       3. Adicionado 'w-full' para garantir que o container ocupe toda a largura da foto.
    */
    <div className="absolute top-2 left-0 right-0 px-2 z-30 pointer-events-none flex flex-row justify-between items-start">
      {/* LADO ESQUERDO: APENAS O FAVORITO */}
      <div className="flex justify-start">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          style={{ width: btnSize, height: btnSize }}
          className={`${baseBtnClass} ${
            isFavorited
              ? 'bg-[#E67E70] border-[#E67E70] text-white opacity-100 scale-100'
              : 'bg-black/40 backdrop-blur-md border-white/10 text-white opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100'
          }`}
        >
          <Heart size={finalIconSize} fill={isFavorited ? 'white' : 'none'} />
        </button>
      </div>

      {/* LADO DIREITO: GRUPO DE AÇÕES (WhatsApp, Link, Download) */}
      <div className="flex flex-row gap-1.5 md:gap-2 items-center justify-end">
        {/* WhatsApp */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShareWhatsApp();
          }}
          style={{ width: btnSize, height: btnSize }}
          className={`${baseBtnClass} bg-black/40 backdrop-blur-md border-white/10 text-white hover:bg-[#25D366]
            opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 delay-[50ms]`}
        >
          <WhatsAppIcon size={finalIconSize} />
        </button>

        {/* Copiar Link */}
        <button
          onClick={handleCopy}
          style={{ width: btnSize, height: btnSize }}
          className={`${baseBtnClass} bg-black/40 backdrop-blur-md border-white/10 text-white hover:bg-white group/btn
            opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 delay-[100ms]`}
        >
          {copied ? (
            <Check size={finalIconSize} className="text-[#25D366]" />
          ) : (
            <LinkIcon
              size={finalIconSize}
              className="group-hover/btn:text-black transition-colors"
            />
          )}
        </button>

        {/* Download */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          style={{ width: btnSize, height: btnSize }}
          className={`${baseBtnClass} bg-black/40 backdrop-blur-md border-white/10 text-white hover:bg-white group/btn
            opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 delay-[150ms]`}
        >
          <Download
            size={finalIconSize}
            className="group-hover/btn:text-black transition-colors"
          />
        </button>
      </div>
    </div>
  );
};
