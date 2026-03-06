'use client';

import { ArrowUpCircle, HardDrive, ImageIcon } from 'lucide-react';
import UpgradeModal from '@/components/ui/UpgradeModal';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import React, { useState } from 'react';
import { usePlan } from '@/core/context/PlanContext';
import { calcEffectiveMaxGalleries } from '@/core/config/plans';
import { HELP_CONTENT } from '@/core/config/help-content';

interface SidebarStorageProps {
  isSidebarCollapsed: boolean;
  galeriasCount: number;
  totalPhotosUsed?: number;
}

export default function SidebarStorage({
  isSidebarCollapsed,
  galeriasCount,
  totalPhotosUsed = 0,
}: SidebarStorageProps) {
  const { permissions, planKey } = usePlan();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const showFull = !isSidebarCollapsed || isMobile;
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const hardCap = permissions.maxGalleriesHardCap;
  const recommended = permissions.recommendedPhotosPerGallery;
  const photoCredits = permissions.photoCredits;

  const effectiveMax = calcEffectiveMaxGalleries(
    planKey,
    totalPhotosUsed,
    galeriasCount,
  );
  const available = Math.max(0, effectiveMax - galeriasCount);
  const isPoolLimiting = effectiveMax < hardCap;

  const galPct = Math.min(Math.round((galeriasCount / hardCap) * 100), 100);
  const isGalWarning = galPct >= 70;
  const isGalLimit = galeriasCount >= hardCap;

  const photosRemaining = Math.max(0, photoCredits - totalPhotosUsed);
  const photoPct = Math.min(
    Math.round((totalPhotosUsed / photoCredits) * 100),
    100,
  );
  const isPhotoWarning = photoPct >= 70;
  const isPhotoCritical = photoPct >= 90;

  // ── Paleta de estado ─────────────────────────────────────────────────────
  // Retorna classes de cor baseado no nível de uso
  const stateColor = (pct: number) => ({
    bar:
      pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-champagne/80',
    value:
      pct >= 90
        ? 'text-red-400'
        : pct >= 70
          ? 'text-amber-300'
          : 'text-white/90',
    sub:
      pct >= 90
        ? 'text-red-400/50'
        : pct >= 70
          ? 'text-amber-400/50'
          : 'text-white/70',
  });

  const galState = stateColor(galPct);
  const photoState = stateColor(photoPct);

  // ── Tooltips ─────────────────────────────────────────────────────────────
  const galTooltipContent = isPoolLimiting
    ? `Plano: até ${hardCap} galerias. Com ${photosRemaining.toLocaleString('pt-BR')} arquivos restantes (~${recommended}/galeria), o pool suporta mais ${available}. Publique menos arquivos por galeria ou faça upgrade.`
    : `${available} slot${available !== 1 ? 's' : ''} livre${available !== 1 ? 's' : ''} dentro do limite de ${hardCap}. Créditos suficientes (~${recommended} arquivos/galeria recomendados).`;

  const photoTooltipContent =
    `Cada arquivo publicado consome 1 crédito do pool de ${photoCredits.toLocaleString('pt-BR')}. ` +
    `Recomendado: ~${recommended}/galeria. Com ${photosRemaining.toLocaleString('pt-BR')} restantes ` +
    `cabem ~${Math.floor(photosRemaining / recommended)} galeria${Math.floor(photosRemaining / recommended) !== 1 ? 's' : ''} no ritmo recomendado.`;

  return (
    <>
      <div
        className={`transition-all duration-500 ${
          isSidebarCollapsed && !isMobile ? 'px-0' : 'px-3'
        }`}
      >
        {showFull ? (
          // ── Modo expandido ───────────────────────────────────────────────
          <div className="py-3 border-t border-white/[0.06] space-y-[14px]">
            {/* ── Bloco Galerias ─────────────────────────────────────────── */}
            <div className="space-y-[7px]">
              {/* Linha superior: ícone+label | número */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <HardDrive
                    size={9}
                    strokeWidth={2.5}
                    className="text-white/90 shrink-0"
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/90">
                    Galerias
                  </span>
                </div>
                <div className="flex items-baseline gap-0.5 tabular-nums">
                  <span
                    className={`text-[13px] font-semibold leading-none ${galState.value}`}
                  >
                    {galeriasCount}
                  </span>
                  <span className="text-[10px] text-white/90 font-normal">
                    /{hardCap}
                  </span>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="relative h-[2px] w-full bg-white/[0.07] rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${galState.bar}`}
                  style={{ width: `${galPct || (galeriasCount > 0 ? 1 : 0)}%` }}
                />
              </div>

              {/* Linha inferior: status + tooltip */}
              {isGalLimit ? (
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 transition-colors group"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-red-400/80">
                    Limite atingido — Upgrade
                  </span>
                  <ArrowUpCircle
                    size={10}
                    className="text-red-400/60 group-hover:-translate-y-px transition-transform shrink-0"
                  />
                </button>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] font-medium tracking-[0.06em] ${
                        isPoolLimiting ? 'text-amber-400/70' : galState.sub
                      }`}
                    >
                      {available} disponíve{available !== 1 ? 'is' : 'l'}
                    </span>
                    {isPoolLimiting && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider bg-amber-400/10 text-amber-400/60 leading-none">
                        pool
                      </span>
                    )}
                  </div>
                  <InfoTooltip
                    portal
                    title={HELP_CONTENT.STORAGE.GALLERIES.title}
                    content={HELP_CONTENT.STORAGE.GALLERIES.content}
                  />
                </div>
              )}
            </div>

            {/* ── Divisor ────────────────────────────────────────────────── */}
            <div className="h-px w-full bg-white/[0.04]" />

            {/* ── Bloco Arquivos ─────────────────────────────────────────── */}
            <div className="space-y-[7px]">
              {/* Linha superior: ícone+label | número */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ImageIcon
                    size={9}
                    strokeWidth={2.5}
                    className="text-white/90 shrink-0"
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/90">
                    Fotos e vídeos
                  </span>
                </div>
                <div className="flex items-baseline gap-0.5 tabular-nums">
                  <span
                    className={`text-[13px] font-semibold leading-none ${photoState.value}`}
                  >
                    {totalPhotosUsed.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-white/90 font-normal">
                    /
                    {photoCredits >= 1000
                      ? `${Math.round(photoCredits / 1000)}k`
                      : photoCredits.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="relative h-[2px] w-full bg-white/[0.07] rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${photoState.bar}`}
                  style={{
                    width: `${photoPct || (totalPhotosUsed > 0 ? 1 : 0)}%`,
                  }}
                />
              </div>

              {/* Linha inferior: restantes + tooltip */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-medium tracking-[0.06em] ${photoState.sub}`}
                >
                  {photosRemaining >= 1000
                    ? `${Math.round(photosRemaining / 1000)}k`
                    : photosRemaining.toLocaleString('pt-BR')}{' '}
                  restantes
                </span>
                <InfoTooltip
                  portal
                  title={HELP_CONTENT.STORAGE.POOL.title}
                  content={HELP_CONTENT.STORAGE.POOL.content}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="py-3 border-t border-white/[0.06] flex flex-col items-center gap-3">
            {/* Galerias Colapsado */}
            <div className="group relative">
              <button
                onClick={() => isGalLimit && setIsUpgradeModalOpen(true)}
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all ${
                  isGalLimit
                    ? 'bg-red-500/15 border-red-500/50 text-red-400 animate-pulse'
                    : isGalWarning
                      ? 'border-amber-400/30 text-amber-300'
                      : 'border-white/10 text-white/50 hover:border-champagne/30 hover:text-champagne/70'
                }`}
              >
                {isGalLimit ? <ArrowUpCircle size={12} /> : galeriasCount}
              </button>
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-[9px] font-semibold uppercase tracking-wider rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[999] shadow-2xl border border-white/8 whitespace-nowrap">
                {isGalLimit
                  ? 'Limite atingido — Upgrade'
                  : `${galeriasCount}/${hardCap} galerias · ${available} livres`}
              </div>
            </div>

            {/* Arquivos */}
            {/* Arquivos Colapsado */}
            <div className="group relative">
              <div
                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                  isPhotoCritical
                    ? 'bg-red-500/15 border-red-500/50 text-red-400 animate-pulse'
                    : isPhotoWarning
                      ? 'border-amber-400/30 text-amber-300'
                      : 'border-white/10 text-white/30 hover:border-champagne/30 hover:text-champagne/70'
                }`}
              >
                <ImageIcon size={11} strokeWidth={2} />
              </div>
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-[9px] font-semibold uppercase tracking-wider rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[999] shadow-2xl border border-white/8 whitespace-nowrap">
                {totalPhotosUsed.toLocaleString('pt-BR')}/
                {photoCredits.toLocaleString('pt-BR')} arquivos
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
