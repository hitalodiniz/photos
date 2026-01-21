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

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-md flex items-center justify-center px-6 md:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="w-full md:max-w-xl bg-petroleum border border-white/10 rounded-[0.5rem] shadow-2xl flex flex-col h-auto max-h-[85vh] relative animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* 1. TOPO */}
        {/* 1. TOPO: WI-FI RECOMENDADO COM ÍCONE */}
        <div className="flex flex-col shrink-0">
          {totalGallerySizeMB > 100 && (
            <div className="bg-[#F3E5AB]/10 py-4 flex items-center justify-center gap-2.5 border-b border-white/5 shrink-0">
              {/* Ícone de Wi-Fi em dourado para destaque visual */}
              <Wifi size={14} className="text-[#F3E5AB]" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F3E5AB]">
                Wi-Fi Recomendado
              </span>
            </div>
          )}

          <div className="px-8 py-7 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <div className="min-w-0 text-left">
              <h2 className="text-2xl text-white font-semibold tracking-tight">
                Central de Download
              </h2>
              <p className="text-[#F3E5AB] text-[11px] font-medium uppercase tracking-[0.15em] mt-2">
                {downloadedVolumes.length} / {volumes.length} pacotes concluídos
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 text-white bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* 2. LISTAGEM */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3 bg-black/20 min-h-0 no-scrollbar">
          {/* FAVORITOS */}
          {favoriteVolumes.length > 0 &&
            favoriteVolumes.map((favChunk, index) => {
              const isCurrent = activeDownloadingIndex === `fav-${index}`;
              const sizeMB = favChunk.length * 1.2;

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
                  className={`w-full flex items-center gap-5 p-5 rounded-xl border transition-all duration-300 group ${
                    isCurrent
                      ? 'border-[#F3E5AB] bg-white/10 shadow-[0_0_25px_rgba(243,229,171,0.1)]'
                      : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.08]'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      isCurrent
                        ? 'bg-[#F3E5AB] text-black shadow-[0_0_15px_rgba(243,229,171,0.3)]'
                        : 'bg-[#F3E5AB]/10 text-[#F3E5AB]'
                    }`}
                  >
                    <Heart
                      size={22}
                      fill={isCurrent ? 'currentColor' : 'none'}
                    />
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[15px] font-semibold text-white tracking-wide uppercase">
                      Suas Favoritas{' '}
                      {favoriteVolumes.length > 1 ? index + 1 : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold text-[#F3E5AB] uppercase tracking-wider">
                        {sizeMB.toFixed(0)} MB
                      </span>
                      <span className="text-white text-xs">•</span>
                      <span className="text-[11px] font-semibold text-white tracking-wide uppercase italic">
                        Otimizadas
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isCurrent ? (
                      <Loader2
                        size={20}
                        className="animate-spin text-[#F3E5AB]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white group-hover:border-[#F3E5AB]/50 group-hover:text-[#F3E5AB] transition-colors">
                        <Download size={18} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

          {favoriteVolumes.length > 0 && (
            <div className="flex items-center gap-4 py-4 px-2">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-white font-bold">
                Galeria Completa
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>
          )}

          {/* VOLUMES DA GALERIA */}
          {volumes.map((chunk, i) => {
            const isDownloaded = downloadedVolumes.includes(i);
            const isCurrent = activeDownloadingIndex === i;
            const sizeMB = chunk.length * 1.2;

            return (
              <button
                key={i}
                disabled={isDownloading && !isCurrent}
                onClick={() =>
                  handleDownloadZip(chunk, `Vol_${i + 1}`, false, true, i)
                }
                className={`w-full flex items-center gap-5 p-5 rounded-xl border transition-all duration-300 group ${
                  isCurrent
                    ? 'border-[#F3E5AB] bg-white/10 shadow-[0_0_25px_rgba(243,229,171,0.1)]'
                    : isDownloaded
                      ? 'bg-white/[0.02] border-green-500/20 opacity-70'
                      : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.08]'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    isCurrent
                      ? 'bg-[#F3E5AB] text-black shadow-[0_0_15px_rgba(243,229,171,0.3)]'
                      : isDownloaded
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/5 text-white'
                  }`}
                >
                  <Package size={22} />
                </div>

                <div className="flex-1 text-left min-w-0">
                  <p className="text-[15px] font-semibold text-white tracking-wide uppercase">
                    Pacote {String(i + 1).padStart(2, '0')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-semibold text-[#F3E5AB] tracking-wider uppercase">
                      ~{sizeMB.toFixed(0)} MB
                    </span>
                    <span className="text-white text-xs">•</span>
                    <span className="text-[11px] font-medium text-white/90 tracking-wide italic">
                      Fotos otimizadas
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isCurrent ? (
                    <Loader2
                      size={20}
                      className="text-[#F3E5AB] animate-spin"
                    />
                  ) : isDownloaded ? (
                    <CheckCircle2 size={22} className="text-green-400" />
                  ) : (
                    <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white group-hover:border-[#F3E5AB]/50 group-hover:text-[#F3E5AB] transition-colors">
                      <Download size={18} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 3. RODAPÉ */}
        <div className="px-8 py-8 bg-petroleum border-t border-white/5 shrink-0">
          {isDownloading ? (
            <div className="w-full">
              <div className="flex justify-between items-end mb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F3E5AB] animate-pulse">
                    Gerando Arquivo
                  </span>
                  <span className="text-[9px] text-white uppercase font-semibold tracking-widest">
                    {activeDownloadingIndex !== null
                      ? 'Não feche esta tela'
                      : 'Iniciando...'}
                  </span>
                </div>
                <span className="text-2xl font-semibold text-white leading-none">
                  {Math.round(downloadProgress)}
                  <span className="text-sm ml-0.5">%</span>
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F3E5AB] transition-all duration-300 shadow-[0_0_15px_rgba(243,229,171,0.6)]"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] text-white/70 uppercase font-semibold tracking-[0.25em]">
                Toque no pacote para baixar
              </p>
              <div className="h-1 w-8 bg-[#F3E5AB] rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
