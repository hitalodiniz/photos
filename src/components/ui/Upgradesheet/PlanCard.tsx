'use client';

import React from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { formatPhotoCredits, type PlanKey } from '@/core/config/plans';
import type { PlanPermissions } from '@/core/config/plans';
import { storageLabel } from './utils';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

interface PlanCardProps {
  planKey: PlanKey;
  planName: string;
  price: number;
  isCurrentPlan: boolean;
  isSelected: boolean;
  isSuggested: boolean;
  disabled?: boolean;
  disabledTooltip?: React.ReactNode;
  onSelect: () => void;
  perms: PlanPermissions;
  isExpanded: boolean;
  onToggleExpand: () => void;
  benefits: { label: string; description: string }[];
  planIcon: React.ElementType;
  isTrial: boolean;
}

export function PlanCard({
  planName,
  price,
  isCurrentPlan,
  isSelected,
  isSuggested,
  disabled,
  disabledTooltip,
  onSelect,
  perms,
  isExpanded,
  onToggleExpand,
  benefits,
  planIcon: PlanIcon,
  isTrial,
}: PlanCardProps) {
  const borderColor =
    disabled && !isCurrentPlan
      ? 'border-slate-100'
      : isCurrentPlan
        ? 'border-petroleum/40'
        : isSelected
          ? 'border-gold'
          : 'border-slate-200';

  const isClickable = !disabled;

  return (
    <div
      className={`rounded-luxury border-2 overflow-hidden transition-all duration-200 ${borderColor} ${
        isSelected ? 'shadow-[0_0_0_3px_rgba(212,175,55,0.15)]' : ''
      } ${isCurrentPlan ? 'shadow-[0_0_0_3px_rgba(15,23,42,0.12)] ring-1 ring-petroleum/20' : ''} ${
        disabled && !isCurrentPlan ? 'opacity-50' : ''
      }`}
    >
      <div
        className={`w-full flex items-center justify-between gap-3 transition-colors duration-200 relative ${
          disabled && !isCurrentPlan
            ? 'bg-slate-50'
            : isCurrentPlan
              ? 'bg-petroleum/[0.06]'
              : isSelected
                ? 'bg-gold/5'
                : 'bg-white hover:bg-gold/[0.02]'
        }`}
      >
        {/* LADO ESQUERDO: Seleção e Informações principais */}
        <button
          type="button"
          disabled={!isClickable && !isTrial}
          onClick={() => {
            if (isClickable) onSelect();
          }}
          className={`flex-1 text-left px-3.5 py-3 flex items-center gap-2.5 min-w-0 ${
            !isClickable && !isTrial ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {(!isCurrentPlan || isTrial) && (
            <div
              className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                !isSelected
                  ? 'border-petroleum/35 bg-petroleum/8'
                  : 'border-gold bg-gold'
              }`}
            >
              {isSelected && (
                <div className="w-1.5 h-1.5 rounded-full bg-petroleum" />
              )}
            </div>
          )}

          <div
            className={`shrink-0 ${isSelected ? 'text-gold' : 'text-petroleum/50'}`}
          >
            <PlanIcon size={24} strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[12px] font-bold text-petroleum uppercase tracking-wide leading-none">
                {planName}
              </p>
              {isCurrentPlan && (
                <span className="px-1.5 py-0.5 bg-petroleum/15 text-petroleum text-[10px] font-semibold uppercase tracking-wide rounded-full leading-none border border-petroleum/20">
                  Seu plano atual
                </span>
              )}
            </div>

            <p className="text-[11px] text-petroleum/80 font-medium mt-2 leading-tight">
              Até {perms.maxGalleriesHardCap} galerias · Até{' '}
              {perms.maxPhotosPerGallery} arquivos
            </p>
          </div>

          {/* PREÇO POSICIONADO À DIREITA DAS INFOS (Ocupando a altura das duas linhas) */}
          <div className="text-right px-2 shrink-0">
            {price === 0 ? (
              <span className="text-[11px] font-semibold text-slate-400">
                Grátis
              </span>
            ) : (
              <div className="flex flex-col items-end">
                <p className="text-[16px] font-bold text-petroleum leading-none">
                  R$ {price}
                </p>
                <p className="text-[9px] text-petroleum/60 font-medium uppercase">
                  /mês
                </p>
              </div>
            )}
          </div>
        </button>

        {/* LADO DIREITO EXTREMO: Botão Ver Detalhes (Ajustado) */}
        <div className="flex items-center shrink-0 pr-3.5 py-3">
          {disabled && disabledTooltip ? (
            <div onClick={(e) => e.stopPropagation()}>
              <InfoTooltip
                content={disabledTooltip}
                portal
                position="top"
                align="right"
                size="lg"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className={`flex items-center gap-1.5 px-2 h-6 rounded-md transition-all ${
                isExpanded
                  ? 'bg-petroleum text-white shadow-sm'
                  : 'bg-slate-100 text-petroleum/80 hover:bg-slate-200'
              }`}
            >
              <span className="text-[8px] font-semibold uppercase tracking-widest whitespace-nowrap">
                {isExpanded ? 'Ocultar' : 'Ver recursos'}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className={`border-t-2 ${borderColor}`}>
          <div
            className={`px-3.5 py-2.5 grid grid-cols-3 gap-2 ${
              isCurrentPlan
                ? 'bg-petroleum/[0.03]'
                : isSelected
                  ? 'bg-gold/[0.04]'
                  : 'bg-slate-50/60'
            }`}
          >
            {[
              {
                label: 'Cota de fotos/vídeos',
                value: formatPhotoCredits(perms.photoCredits),
              },
              {
                label: 'Galerias',
                value: `${perms.maxGalleriesHardCap} ativas`,
              },
              { label: 'Arq/galeria', value: `${perms.maxPhotosPerGallery}` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-[11px] font-bold text-petroleum">{value}</p>
                <p className="text-[8px] text-petroleum/90 uppercase tracking-luxury-wide">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <ul
            className={`px-3.5 py-3 space-y-2 ${
              isCurrentPlan
                ? 'bg-petroleum/[0.01]'
                : isSelected
                  ? 'bg-gold/[0.02]'
                  : 'bg-white'
            }`}
          >
            <li className="mb-1">
              <p className="text-[8px] font-bold uppercase tracking-luxury-wide text-petroleum/90">
                O que está incluído
              </p>
            </li>
            {benefits.map((b, i) => (
              <li key={i} className="flex gap-2 items-start">
                <CheckCircle2
                  size={10}
                  className={`shrink-0 mt-0.5 ${isCurrentPlan && !isSelected ? 'text-petroleum/35' : 'text-gold'}`}
                />
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-luxury text-petroleum/80 block leading-tight">
                    {b.label}
                  </span>
                  <span className="text-[10px] text-petroleum/60 leading-tight">
                    {b.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
