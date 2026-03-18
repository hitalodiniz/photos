'use client';
import React from 'react';
import {
  Package,
  Heart,
  Download,
  CheckCircle2,
  Wifi,
  Filter,
  Zap,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import { estimatePhotoDownloadSize } from '@/core/utils/foto-helpers';
import { Sheet, SheetSection, SheetFooter } from '@/components/ui/Sheet';

interface DownloadCenterSheetProps {
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
  canUseFavorites?: boolean;
  canDownloadFavorites?: boolean;
  showOnlyFavorites?: boolean;
  downloadAllAsZip: () => void;
  externalLinks?: Array<{ label: string; url: string }>;
  handleExternalDownload?: (url: string, filename: string) => void;
  galeriaTitle?: string;
  /** Tema visual da galeria (ex: EDITORIAL_WHITE) */
  themeKey?: string;
}

export const DownloadCenterSheet = ({
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
  canUseFavorites = true,
  canDownloadFavorites = true,
  showOnlyFavorites = false,
  downloadAllAsZip,
  externalLinks = [],
  handleExternalDownload,
  galeriaTitle = '',
  themeKey,
}: DownloadCenterSheetProps) => {
  const completedCount = downloadedVolumes.length;
  const totalCount = volumes.length;
  const hasExternalLinks = externalLinks.length > 0;
  const hasFavorites = canUseFavorites && favoriteVolumes.length > 0;

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Central de Download"
      subtitle={`${completedCount} / ${totalCount} pacotes concluídos`}
      icon={
        totalGallerySizeMB > 100 ? (
          <Wifi size={18} strokeWidth={2.5} />
        ) : (
          <Download size={18} strokeWidth={2.5} />
        )
      }
      maxWidth="md"
      position="right"
      dataTheme={themeKey}
      footer={
        <>
          {/* Barra de progresso — usa pub-bar-bg para seguir o tema */}
          {isDownloading && (
            <div className="px-5 py-3 pub-bar-bg border-t pub-bar-drawer-border">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-luxury pub-bar-accent animate-pulse">
                    Gerando Arquivo
                  </p>
                  <p className="text-[8px] pub-bar-muted uppercase font-semibold tracking-luxury mt-0.5">
                    {activeDownloadingIndex !== null
                      ? 'Não feche esta tela'
                      : 'Iniciando...'}
                  </p>
                </div>
                <span className="text-xl font-semibold pub-bar-text leading-none">
                  {Math.round(downloadProgress)}
                  <span className="text-sm ml-0.5 pub-bar-accent">%</span>
                </span>
              </div>
              <div className="w-full h-1 pub-bar-btn border-0 rounded-full overflow-hidden">
                <div
                  className="h-full pub-bar-btn-cta transition-all duration-300 shadow-[0_0_12px_rgba(212,175,55,0.5)]"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {!isDownloading && (
            <SheetFooter>
              <p className="text-[9px] text-petroleum/70 font-medium uppercase tracking-luxury">
                Toque em um pacote para iniciar o download
              </p>
            </SheetFooter>
          )}
        </>
      }
    >
      {/* Download rápido */}
      <SheetSection title="Download Rápido">
        {canUseFavorites && showOnlyFavorites && canDownloadFavorites && (
          <button
            onClick={() => {
              downloadAllAsZip();
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-luxury bg-petroleum/5 hover:bg-petroleum/10 active:bg-petroleum/15 border border-petroleum/10 hover:border-petroleum/20 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-luxury bg-red-500/10 flex items-center justify-center shrink-0">
              <Filter size={15} className="text-red-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-petroleum uppercase tracking-wide">
                Apenas Favoritos
              </p>
              <p className="text-[9px] text-petroleum/50 italic font-medium mt-0.5">
                Download só das fotos marcadas
              </p>
            </div>
          </button>
        )}

        <button
          onClick={() => {
            downloadAllAsZip();
            onClose();
          }}
          className="w-full flex items-center gap-3 p-3 rounded-luxury bg-petroleum/5 hover:bg-petroleum/10 active:bg-petroleum/15 border border-petroleum/10 hover:border-petroleum/20 transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-luxury bg-gold/10 flex items-center justify-center shrink-0">
            <Zap size={15} className="text-gold" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-petroleum uppercase tracking-wide">
              Arquivos Otimizados
            </p>
            <p className="text-[9px] text-petroleum/50 italic font-medium mt-0.5">
              Mantendo a qualidade dos arquivos originais
            </p>
          </div>
        </button>
      </SheetSection>

      {/* Pacotes ZIP */}
      <SheetSection title="Pacotes ZIP">
        {/* Favoritos */}
        {hasFavorites && (
          <>
            {favoriteVolumes.map((favChunk, index) => {
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
                      true,
                      true,
                      `fav-${index}`,
                    )
                  }
                  className={`w-full flex items-center gap-4 p-4 rounded-luxury border transition-all duration-300 group ${
                    isCurrent
                      ? 'border-petroleum bg-slate-50 shadow-sm'
                      : isDownloading
                        ? 'opacity-40 cursor-not-allowed bg-white border-petroleum/20'
                        : 'bg-white border-petroleum/20 hover:border-petroleum/40 hover:bg-slate-50 active:bg-slate-100'
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
                    <p className="text-[13px] font-semibold text-petroleum tracking-wide uppercase">
                      Suas Favoritas{' '}
                      {favoriteVolumes.length > 1 ? index + 1 : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-semibold text-petroleum uppercase tracking-luxury">
                        {sizeMB.toFixed(0)} MB
                      </span>
                      <span className="text-petroleum/10 text-xs">•</span>
                      <span className="text-[9px] font-semibold text-petroleum/60 tracking-luxury uppercase">
                        Otimizadas
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isCurrent ? (
                      <div className="loading-luxury w-4 h-4 border-petroleum/30 border-t-petroleum" />
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-petroleum/30 flex items-center justify-center text-petroleum/70 group-hover:border-petroleum/60 group-hover:text-petroleum transition-colors">
                        <Download size={16} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            <div className="flex items-center gap-3 py-1 px-1">
              <div className="h-px bg-petroleum/40 flex-1" />
              <span className="text-[8px] font-semibold uppercase tracking-luxury text-petroleum/70">
                Galeria Completa
              </span>
              <div className="h-px bg-petroleum/40 flex-1" />
            </div>
          </>
        )}

        {/* Volumes da galeria */}
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
                    : isDownloading
                      ? 'opacity-40 cursor-not-allowed bg-white border-petroleum/20'
                      : 'bg-white border-petroleum/20 hover:border-petroleum/40 hover:bg-slate-50 active:bg-slate-100'
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
                <p className="text-[13px] font-semibold text-petroleum tracking-wide uppercase">
                  Pacote {String(i + 1).padStart(2, '0')}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-semibold text-petroleum uppercase tracking-luxury">
                    {sizeMB.toFixed(0)} MB
                  </span>
                  <span className="text-petroleum/10 text-xs">•</span>
                  <span className="text-[9px] font-semibold text-petroleum/60 tracking-luxury uppercase">
                    {isDownloaded ? 'Concluído' : 'Otimizadas'}
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                {isCurrent ? (
                  <div className="loading-luxury w-4 h-4 border-petroleum/30 border-t-petroleum" />
                ) : isDownloaded ? (
                  <CheckCircle2 size={20} className="text-green-500" />
                ) : (
                  <div className="w-8 h-8 rounded-full border border-petroleum/30 flex items-center justify-center text-petroleum/70 group-hover:border-petroleum/60 group-hover:text-petroleum transition-colors">
                    <Download size={16} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </SheetSection>

      {/* Links Externos */}
      {hasExternalLinks && (
        <SheetSection title="Links Externos" className="border-b-0">
          <div className="space-y-2">
            {externalLinks.map((linkObj: any, index: number) => (
              <button
                key={index}
                onClick={() => {
                  handleExternalDownload?.(
                    linkObj.url,
                    `${galeriaTitle}_${linkObj.label.replace(/\s+/g, '_')}.zip`,
                  );
                }}
                className="w-full flex items-center gap-3 p-3 rounded-luxury bg-white border border-slate-200 hover:border-petroleum/30 hover:bg-slate-50 active:bg-slate-100 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-luxury bg-petroleum/5 flex items-center justify-center shrink-0 group-hover:bg-petroleum/10 transition-colors">
                  <FileCheck
                    size={15}
                    className="text-petroleum/60 group-hover:text-petroleum transition-colors group-hover:scale-110"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-petroleum uppercase tracking-wide">
                    {linkObj.label}
                  </p>
                  <p className="text-[9px] text-petroleum/70 italic truncate mt-0.5 leading-tight">
                    {linkObj.url}
                  </p>
                </div>
                <ExternalLink
                  size={13}
                  className="text-petroleum/30 group-hover:text-petroleum/60 shrink-0 transition-colors"
                />
              </button>
            ))}
          </div>
        </SheetSection>
      )}
    </Sheet>
  );
};
