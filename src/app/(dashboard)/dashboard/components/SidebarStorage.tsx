import { ArrowUpCircle, HardDrive, ImageIcon, Layers } from 'lucide-react';
import UpgradeModal from '@/components/ui/UpgradeModal';
import React, { useState } from 'react';
import { usePlan } from '@/core/context/PlanContext';

interface SidebarStorageProps {
  isSidebarCollapsed: boolean;
  galeriasCount: number;
  totalPhotosUsed?: number; // total real de fotos em todas as galerias
}

export default function SidebarStorage({
  isSidebarCollapsed,
  galeriasCount,
  totalPhotosUsed = 0,
}: SidebarStorageProps) {
  const { permissions } = usePlan();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const showFull = !isSidebarCollapsed || isMobile;
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Galerias
  const maxGalleries = permissions.maxGalleries;
  const galeriasPercent = Math.min((galeriasCount / maxGalleries) * 100, 100);
  const isLimitReached = galeriasCount >= maxGalleries;

  // Pool de fotos
  const photoCredits = permissions.photoCredits;
  const photosRemaining = Math.max(photoCredits - totalPhotosUsed, 0);
  const photosPercent = Math.min((totalPhotosUsed / photoCredits) * 100, 100);
  const isPhotoLimitCritical = photosPercent >= 90;

  // Galerias disponíveis pelo pool — usa recomendado, não hard cap
  const recommendedPerGallery =
    permissions.recommendedPhotosPerGallery ?? permissions.maxPhotosPerGallery;
  const galeriasDisponiveisPeloPool =
    recommendedPerGallery > 0
      ? Math.floor(photosRemaining / recommendedPerGallery)
      : 0;
  const slotsGaleria = Math.max(maxGalleries - galeriasCount, 0);
  const galeriasDisponiveis = Math.min(
    slotsGaleria,
    galeriasDisponiveisPeloPool,
  );
  const isPoolBottleneck =
    galeriasDisponiveisPeloPool < slotsGaleria && slotsGaleria > 0;

  return (
    <>
      <div
        className={`pt-4 border-t border-white/5 transition-all duration-500 ${
          isSidebarCollapsed && !isMobile ? 'px-0' : 'px-2'
        }`}
      >
        {showFull ? (
          <div className="space-y-4">
            {/* Galerias */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-editorial-label text-white/90 flex items-center gap-2">
                  <HardDrive size={12} strokeWidth={2} /> Galerias
                </span>
                <span className="text-[10px] font-semibold tracking-luxury text-white/90">
                  {galeriasCount} / {maxGalleries}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div
                  className={`h-full transition-all duration-1000 ease-out rounded-full ${
                    isLimitReached
                      ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                      : 'bg-champagne shadow-[0_0_10px_rgba(212,175,55,0.5)]'
                  }`}
                  style={{ width: `${galeriasPercent}%` }}
                />
              </div>
              {isLimitReached ? (
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/50 rounded-luxury flex items-center justify-between group transition-all"
                >
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-luxury-widest">
                    Limite Atingido
                  </span>
                  <ArrowUpCircle
                    size={14}
                    className="text-red-400 group-hover:-translate-y-0.5 transition-transform"
                  />
                </button>
              ) : (
                <p className="text-[9px] text-white/40 uppercase tracking-luxury-widest px-1">
                  Galerias Ativas
                </p>
              )}
            </div>

            {/* Pool de Fotos */}
            <div className="space-y-2 pt-3 border-t border-white/5">
              <div className="flex justify-between items-center px-1">
                <span className="text-editorial-label text-white/90 flex items-center gap-2">
                  <ImageIcon size={12} strokeWidth={2} /> Créditos de Fotos
                </span>
                <span
                  className={`text-[10px] font-semibold tracking-luxury ${isPhotoLimitCritical ? 'text-red-400' : 'text-white/90'}`}
                >
                  {photosRemaining.toLocaleString('pt-BR')} restantes
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div
                  className={`h-full transition-all duration-1000 ease-out rounded-full ${
                    isPhotoLimitCritical
                      ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                      : 'bg-champagne/60 shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                  }`}
                  style={{ width: `${photosPercent}%` }}
                />
              </div>
              <p className="text-[9px] text-white/30 uppercase tracking-luxury-widest px-1">
                Pool total: {photoCredits.toLocaleString('pt-BR')} fotos
              </p>
            </div>

            {/* Galerias disponíveis pelo pool */}
            <div
              className={`px-3 py-2.5 rounded-luxury border flex items-center gap-3 ${
                galeriasDisponiveis === 0
                  ? 'bg-red-500/10 border-red-500/30'
                  : isPoolBottleneck
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-white/5 border-white/5'
              }`}
            >
              <Layers
                size={13}
                className={`shrink-0 ${
                  galeriasDisponiveis === 0
                    ? 'text-red-400'
                    : isPoolBottleneck
                      ? 'text-amber-400'
                      : 'text-white/40'
                }`}
              />
              <div className="min-w-0">
                <p
                  className={`text-[10px] font-bold uppercase tracking-luxury-widest leading-tight ${
                    galeriasDisponiveis === 0
                      ? 'text-red-400'
                      : isPoolBottleneck
                        ? 'text-amber-400'
                        : 'text-white/70'
                  }`}
                >
                  {galeriasDisponiveis === 0
                    ? 'Sem créditos para novas galerias'
                    : `${galeriasDisponiveis} galeria${galeriasDisponiveis !== 1 ? 's' : ''} disponível${galeriasDisponiveis !== 1 ? 'is' : ''}`}
                </p>
                <p className="text-[9px] text-white/30 mt-0.5 leading-tight">
                  {isPoolBottleneck
                    ? `Pool limita antes dos ${slotsGaleria} slots restantes`
                    : `~${recommendedPerGallery} fotos/galeria recomendadas`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Colapsado */
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="group relative flex justify-center cursor-help">
              <button
                onClick={() => isLimitReached && setIsUpgradeModalOpen(true)}
                className={`w-8 h-8 rounded-full border flex items-center justify-center text-[9px] font-semibold transition-all ${
                  isLimitReached
                    ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                    : 'border-white/10 text-white/90 hover:text-champagne hover:border-champagne'
                }`}
              >
                {isLimitReached ? <ArrowUpCircle size={14} /> : galeriasCount}
              </button>
              <div className="absolute left-full ml-4 px-3 py-2 bg-slate-950 text-white text-[10px] font-semibold uppercase rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-2xl border border-white/10 whitespace-nowrap">
                {isLimitReached
                  ? 'Aumentar limite agora'
                  : `${galeriasCount} de ${maxGalleries} galerias`}
              </div>
            </div>
            <div className="group relative flex justify-center cursor-help">
              <div
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                  isPhotoLimitCritical
                    ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                    : 'border-white/10 text-white/50 hover:text-champagne hover:border-champagne'
                }`}
              >
                <ImageIcon size={13} />
              </div>
              <div className="absolute left-full ml-4 px-3 py-2 bg-slate-950 text-white text-[10px] font-semibold uppercase rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-2xl border border-white/10 whitespace-nowrap">
                {photosRemaining.toLocaleString('pt-BR')} créditos restantes
              </div>
            </div>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureName="Armazenamento"
        featureKey="maxGalleries"
        scenarioType="limit"
      />
    </>
  );
}
