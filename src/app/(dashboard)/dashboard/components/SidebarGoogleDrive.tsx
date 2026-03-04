'use client';

import { usePlan } from '@/core/context/PlanContext';
import {
  calcEffectiveMaxGalleries,
  formatPhotoCredits,
} from '@/core/config/plans';
import { RefreshCw, Cloud, Images, Image } from 'lucide-react';

interface SidebarGoogleDriveProps {
  isSidebarCollapsed: boolean;
  photographer: {
    google_refresh_token?: string | null;
  } | null;
  handleGoogleLogin: (force: boolean) => void;
  // Pool context — passados pelo componente pai que tem acesso ao estado do usuário
  usedPhotoCredits: number; // total de fotos publicadas em todas as galerias
  activeGalleryCount: number; // número de galerias ativas atualmente
}

export default function SidebarGoogleDrive({
  isSidebarCollapsed,
  photographer,
  handleGoogleLogin,
  usedPhotoCredits,
  activeGalleryCount,
}: SidebarGoogleDriveProps) {
  const { permissions, planKey } = usePlan();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const showFull = !isSidebarCollapsed || isMobile;

  const isConnected = !!photographer?.google_refresh_token;

  // ── Pool de fotos ─────────────────────────────────────────────────────────
  const totalCredits = permissions.photoCredits;
  const creditsRemaining = Math.max(0, totalCredits - usedPhotoCredits);
  const creditsPct = Math.min(
    100,
    Math.round((usedPhotoCredits / totalCredits) * 100),
  );

  // ── Pool de galerias ──────────────────────────────────────────────────────
  const effectiveMaxGalleries = calcEffectiveMaxGalleries(
    planKey,
    usedPhotoCredits,
    activeGalleryCount,
  );
  const galleriesRemaining = Math.max(
    0,
    effectiveMaxGalleries - activeGalleryCount,
  );
  const galleriesPct = Math.min(
    100,
    Math.round((activeGalleryCount / effectiveMaxGalleries) * 100),
  );

  // Nível de alerta para as barras de progresso
  const creditsAlert =
    creditsPct >= 90 ? 'critical' : creditsPct >= 70 ? 'warning' : 'ok';
  const galleriesAlert =
    galleriesPct >= 90 ? 'critical' : galleriesPct >= 70 ? 'warning' : 'ok';

  const barColor = (level: 'ok' | 'warning' | 'critical') =>
    level === 'critical'
      ? 'bg-red-400'
      : level === 'warning'
        ? 'bg-amber-400'
        : 'bg-emerald-400';

  return (
    <div
      className={`border-t border-white/5 ${isSidebarCollapsed && !isMobile ? 'px-0' : 'px-2'}`}
    >
      <div
        className={`relative group flex items-center transition-all duration-300 ${
          isSidebarCollapsed && !isMobile
            ? 'justify-center py-4'
            : 'gap-3 py-4 rounded-luxury hover:bg-white/5'
        }`}
      >
        {/* ── Modo colapsado: só o dot de status ─────────────────────────── */}
        {isSidebarCollapsed && !isMobile ? (
          <div className="relative flex items-center justify-center shrink-0">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected
                  ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                  : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              }`}
            />
            <div
              className={`absolute inset-0 h-2 w-2 rounded-full animate-ping opacity-75 ${
                isConnected ? 'bg-green-500' : 'bg-amber-500'
              }`}
            />
          </div>
        ) : (
          <div className="text-white/90 ml-1">
            <Cloud size={20} strokeWidth={2} />
          </div>
        )}

        {/* ── Modo expandido ─────────────────────────────────────────────── */}
        {showFull && (
          <div className="flex flex-col min-w-0 flex-1 gap-2.5">
            {/* Linha 1: título + status + botão */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-luxury text-white/90 leading-none">
                Google Drive
              </span>
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    isConnected
                      ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                      : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                  }`}
                />
                <span
                  className={`text-[10px] font-semibold tracking-luxury ${
                    isConnected ? 'text-green-400' : 'text-amber-400'
                  }`}
                >
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
                <button
                  onClick={() => handleGoogleLogin(!isConnected)}
                  title={
                    isConnected ? 'Reconectar' : 'Conectar ao Google Drive'
                  }
                  className="p-1 hover:bg-white/10 active:bg-white/20 rounded-luxury transition-colors text-white/60 hover:text-white/90 interactive-luxury"
                >
                  <RefreshCw
                    size={12}
                    strokeWidth={2.5}
                    className={!isConnected ? 'animate-spin' : ''}
                  />
                </button>
              </div>
            </div>

            {/* Linha 2: barra de créditos de fotos */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-luxury text-white/50">
                  <Image size={9} strokeWidth={2.5} />
                  Créditos de fotos
                </span>
                <span className="text-[9px] font-bold text-white/60">
                  {formatPhotoCredits(creditsRemaining)} restantes
                </span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(creditsAlert)}`}
                  style={{ width: `${creditsPct}%` }}
                />
              </div>
              <p className="text-[8px] text-white/30 tracking-luxury">
                {usedPhotoCredits.toLocaleString('pt-BR')} /{' '}
                {totalCredits.toLocaleString('pt-BR')} fotos ({creditsPct}%
                usado)
              </p>
            </div>

            {/* Linha 3: barra de galerias */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-luxury text-white/50">
                  <Images size={9} strokeWidth={2.5} />
                  Galerias ativas
                </span>
                <span className="text-[9px] font-bold text-white/60">
                  {galleriesRemaining} disponíveis
                </span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(galleriesAlert)}`}
                  style={{ width: `${galleriesPct}%` }}
                />
              </div>
              <p className="text-[8px] text-white/30 tracking-luxury">
                {activeGalleryCount} / {effectiveMaxGalleries} galerias (
                {galleriesPct}% usado)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
