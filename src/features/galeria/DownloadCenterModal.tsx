'use client';
import React from 'react';
import {
  X,
  Package,
  Heart,
  Download,
  Loader2,
  CheckCircle2,
  Wifi,
} from 'lucide-react';

import BaseModal from '@/components/ui/BaseModal';
import { estimatePhotoDownloadSize } from '@/core/utils/foto-helpers';

interface DownloadCenterProps {
  isOpen: boolean;
  onClose: () => void;
  volumes: any[][];
  favoriteVolumes: any[][];
  downloadedVolumes: number[];
  activeDownloadingIndex: number | string | null;
  downloadProgress: number;
  isDownloading: boolean;
  handleDownloadZip: (
    targetList: any[],
    suffix: string,
    isFav: boolean,
    confirmed: boolean,
    index: number | string,
  ) => void;
  totalGallerySizeMB: number;
}

export const DownloadCenterModal = ({
  isOpen,
  onClose,
  volumes,
  favoriteVolumes,
  downloadedVolumes,
  activeDownloadingIndex,
  downloadProgress,
  isDownloading,
  handleDownloadZip,
  totalGallerySizeMB,
}: DownloadCenterProps) => {
  if (!isOpen) return null;

  const headerIcon = (
    totalGallerySizeMB > 100 ? <Wifi size={20} strokeWidth={2.5} /> : <Download size={20} strokeWidth={2.5} />
  );

  const footer = (
    <div className="w-full">
      {isDownloading ? (
        <div className="w-full px-2">
          <div className="flex justify-between items-end mb-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibolduppercase tracking-luxury text-gold animate-pulse">
                Gerando Arquivo
              </span>
              <span className="text-[8px] text-white/40 uppercase font-semibold tracking-luxury">
                {activeDownloadingIndex !== null
                  ? 'Não feche esta tela'
                  : 'Iniciando...'}
              </span>
            </div>
            <span className="text-xl font-semibold text-white leading-none">
              {Math.round(downloadProgress)}
              <span className="text-sm ml-0.5 text-gold">%</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gold transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.6)]"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-luxury text-white/90">
            Toque no pacote para baixar
          </p>
          <div className="h-1 w-8 bg-gold rounded-full opacity-40" />
        </div>
      )}
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Central de Download"
      subtitle={`${downloadedVolumes.length} / ${volumes.length} pacotes concluídos`}
      headerIcon={headerIcon}
      footer={footer}
      maxWidth="md"
    >
      <div className="space-y-2">
        {/* FAVORITOS */}
        {favoriteVolumes.length > 0 &&
          favoriteVolumes.map((favChunk, index) => {
            const isCurrent = activeDownloadingIndex === `fav-${index}`;
            const sizeMB =
              favChunk.reduce(
                (acc, photo) => acc + estimatePhotoDownloadSize(photo),
                0,
              ) /
              (1024 * 1024);

            return (
              <button
                key={`fav-${index}`}
                disabled={isDownloading && !isCurrent}
                onClick={() =>
                  handleDownloadZip(
                    favChunk,
                    `Favoritas_${index + 1}`,
                    false,
                    true,
                    `fav-${index}`,
                  )
                }
                className={`w-full flex items-center gap-4 p-4 rounded-luxury border transition-all duration-300 group ${
                  isCurrent
                    ? 'border-petroleum bg-slate-50 shadow-sm'
                    : 'bg-white border-petroleum/30 hover:border-petroleum/50 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-luxury flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    isCurrent
                      ? 'bg-petroleum text-white shadow-[0_0_15px_rgba(23,42,56,0.3)]'
                      : 'bg-petroleum/10 text-petroleum'
                  }`}
                >
                  <Heart
                    size={18}
                    fill={isCurrent ? 'currentColor' : 'none'}
                  />
                </div>

                <div className="flex-1 text-left min-w-0">
                  <p className="text-[13px] md:text-[14px] font-semibold text-petroleum tracking-wide uppercase">
                    Suas Favoritas{' '}
                    {favoriteVolumes.length > 1 ? index + 1 : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-semibold text-petroleum uppercase tracking-luxury">
                      {sizeMB.toFixed(0)} MB
                    </span>
                    <span className="text-petroleum/10 text-xs">•</span>
                    <span className="text-[9px] font-semibold text-petroleum/80 tracking-luxury uppercase">
                      Otimizadas
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isCurrent ? (
                    <div className="loading-luxury w-4 h-4 border-petroleum/30 border-t-petroleum" />
                  ) : (
                    <div className="w-8 h-8 rounded-full border border-petroleum/30 flex items-center justify-center text-petroleum/40 group-hover:border-petroleum/60 group-hover:text-petroleum transition-colors">
                      <Download size={16} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}

        {favoriteVolumes.length > 0 && (
          <div className="flex items-center gap-3 py-2 px-2">
            <div className="h-px bg-petroleum/30 flex-1" />
            <span className="text-[9px] font-semibold uppercase tracking-luxury text-petroleum/50">
              Galeria Completa
            </span>
            <div className="h-px bg-petroleum/30 flex-1" />
          </div>
        )}

        {/* VOLUMES DA GALERIA */}
        {volumes.map((chunk, i) => {
          const isDownloaded = downloadedVolumes.includes(i);
          const isCurrent = activeDownloadingIndex === i;
          const sizeMB =
            chunk.reduce(
              (acc, photo) => acc + estimatePhotoDownloadSize(photo),
              0,
            ) /
            (1024 * 1024);

          return (
            <button
              key={i}
              disabled={isDownloading && !isCurrent}
              onClick={() =>
                handleDownloadZip(chunk, `Vol_${i + 1}`, false, true, i)
              }
              className={`w-full flex items-center gap-4 p-4 rounded-luxury border transition-all duration-300 group ${
                isCurrent
                  ? 'border-petroleum bg-slate-50 shadow-sm'
                  : isDownloaded
                    ? 'bg-slate-50 border-green-500/20 opacity-70'
                    : 'bg-white border-petroleum/30 hover:border-petroleum/50 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-luxury flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  isCurrent
                    ? 'bg-petroleum text-white shadow-[0_0_15px_rgba(23,42,56,0.3)]'
                    : isDownloaded
                      ? 'bg-green-500/20 text-green-600'
                      : 'bg-petroleum/10 text-petroleum'
                }`}
              >
                <Package size={18} />
              </div>

              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] md:text-[14px] font-semibold text-petroleum tracking-wide uppercase">
                  Pacote {String(i + 1).padStart(2, '0')}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-semibold text-petroleum uppercase tracking-luxury">
                    {sizeMB.toFixed(0)} MB
                  </span>
                  <span className="text-petroleum/10 text-xs">•</span>
                  <span className="text-[9px] font-semibold text-petroleum/80 tracking-luxury uppercase">
                    Otimizadas
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                {isCurrent ? (
                  <div className="loading-luxury w-4 h-4 border-petroleum/30 border-t-petroleum" />
                ) : isDownloaded ? (
                  <CheckCircle2 size={20} className="text-green-500" />
                ) : (
                  <div className="w-8 h-8 rounded-full border border-petroleum/30 flex items-center justify-center text-petroleum/40 group-hover:border-petroleum/60 group-hover:text-petroleum transition-colors">
                    <Download size={16} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </BaseModal>
  );
};
