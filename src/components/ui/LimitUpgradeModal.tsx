'use client';
import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Zap, Info } from 'lucide-react';

import BaseModal from '@/components/ui/BaseModal';
import { UpgradeSheet } from './Upgradesheet';

interface LimitUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  planLimit: number;
  photoCount: number;
  /** Quando 'pool': mensagem de cota do pool (só N créditos; galerias limitadas a X). */
  variant?: 'perGallery' | 'pool';
  /** Para variant='pool': número de galerias que o usuário pode ter com o uso atual. */
  maxGalleriesAfter?: number;
}

export const LimitUpgradeModal = ({
  isOpen,
  onClose,
  planLimit,
  photoCount,
  variant = 'perGallery',
  maxGalleriesAfter,
}: LimitUpgradeModalProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (!isOpen && !isSheetOpen) return null;

  const headerIcon = (
    <AlertTriangle size={20} strokeWidth={2.5} className="text-amber-500" />
  );

  const footer = (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={() => setIsSheetOpen(true)}
        className="btn-luxury-primary"
      >
        Aumentar Limite Agora
        <ArrowRight size={16} />
      </button>

      <button onClick={onClose} className="btn-secondary-white">
        Continuar com {planLimit} fotos
      </button>
    </div>
  );

  const isPool = variant === 'pool';

  return (
    <>
      <BaseModal
        isOpen={isOpen && !isSheetOpen}
        onClose={onClose}
        title={isPool ? 'Cota do pool insuficiente' : 'Limite do Plano'}
        subtitle={isPool ? 'Galeria limitada ao pool' : 'Importação Limitada'}
        headerIcon={headerIcon}
        footer={footer}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="w-full flex items-center gap-4 p-4 rounded-luxury border border-amber-500/20 bg-amber-500/5 transition-all">
            <div className="w-10 h-10 rounded-luxury flex items-center justify-center shrink-0 bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Zap size={20} fill="currentColor" />
            </div>

            <div className="flex-1 text-left min-w-0">
              <p className="text-[14px] font-bold text-petroleum tracking-wide uppercase">
                {isPool
                  ? 'Créditos disponíveis no pool'
                  : 'Capacidade do Plano'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-luxury">
                  {isPool
                    ? `Máximo nesta galeria: ${planLimit} fotos`
                    : `Limite: ${planLimit} Fotos`}
                </span>
                <span className="text-petroleum/20 text-xs">•</span>
                <span className="text-[10px] font-bold text-petroleum/40 tracking-luxury uppercase">
                  Plano Atual
                </span>
              </div>
            </div>
          </div>

          {isPool ? (
            <>
              <p className="text-[13px] text-petroleum/70 font-medium leading-relaxed px-1">
                Sua pasta possui{' '}
                <span className="text-petroleum font-bold">
                  mais arquivos do que o seu plano permite
                </span>
                , mas você só tem{' '}
                <span className="text-gold font-bold">
                  {planLimit} créditos
                </span>{' '}
                disponíveis no pool (as outras galerias já consomem parte da
                cota). Apenas{' '}
                <span className="text-gold font-bold">
                  {planLimit} fotos/videos
                </span>{' '}
                serão exibidas nesta galeria.
              </p>
              {typeof maxGalleriesAfter === 'number' && (
                <p className="text-[13px] text-petroleum/70 font-medium leading-relaxed px-1">
                  Com esse uso, o número de galerias disponíveis no seu plano
                  fica limitado a{' '}
                  <span className="text-gold font-bold">
                    {maxGalleriesAfter}
                  </span>
                  .
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-petroleum/70 font-medium leading-relaxed px-1">
              Sua pasta possui{' '}
              <span className="text-petroleum font-semibold">
                mais arquivos do que o plano permite
              </span>
              . Apenas as primeiras{' '}
              <span className="text-petroleum font-bold">
                {planLimit} fotos
              </span>{' '}
              serão importadas conforme o limite do seu plano.
            </p>
          )}

          <div className="flex items-center gap-3 p-4 bg-slate-50 border border-petroleum/10 rounded-luxury">
            <Info size={16} className="text-gold shrink-0" />
            <p className="text-[11px] font-bold uppercase tracking-luxury text-petroleum/60">
              {isPool
                ? 'As fotos excedentes a cota de arquivos não serão exibidas nesta galeria.'
                : 'As fotos excedentes não serão exibidas nesta galeria.'}
            </p>
          </div>
        </div>
      </BaseModal>

      <UpgradeSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          onClose();
        }}
      />
    </>
  );
};
