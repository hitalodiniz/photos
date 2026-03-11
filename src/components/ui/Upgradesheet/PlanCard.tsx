'use client';

import React from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import type { PlanKey } from '@/core/config/plans';
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
  /** Quando disabled, conteúdo do tooltip de informação (ex.: motivo downgrade). Exibido ao passar o mouse. */
  disabledTooltip?: React.ReactNode;
  onSelect: () => void;
  perms: PlanPermissions;
  isExpanded: boolean;
  onToggleExpand: () => void;
  benefits: { label: string; description: string }[];
  planIcon: React.ElementType;
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
      <button
        type="button"
        disabled={!isClickable}
        onClick={() => {
          if (isClickable) onSelect();
          if (isClickable) onToggleExpand();
        }}
        className={`w-full text-left px-3.5 py-3 transition-colors duration-200 relative ${
          disabled && !isCurrentPlan
            ? 'bg-slate-50 cursor-not-allowed'
            : isCurrentPlan
              ? 'bg-petroleum/[0.06] cursor-default'
              : isSelected
                ? 'bg-gold/5'
                : 'bg-white hover:bg-gold/[0.02]'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {!isCurrentPlan && (
              <div
                className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  !isSelected
                    ? 'border-petroleum/35 bg-petroleum/8'
                    : isSelected
                      ? 'border-gold bg-gold'
                      : 'border-slate-300 bg-white'
                }`}
              >
                {isSelected && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCurrentPlan && !isSelected
                        ? 'bg-petroleum/50'
                        : 'bg-petroleum'
                    }`}
                  />
                )}
              </div>
            )}
            <div
              className={`shrink-0 transition-colors ${
                disabled
                  ? 'text-petroleum/90'
                  : isCurrentPlan
                    ? 'text-petroleum'
                    : isSelected
                      ? 'text-gold'
                      : 'text-petroleum/50'
              }`}
            >
              <PlanIcon size={24} strokeWidth={2} />
            </div>

            <div className="min-w-0">
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
              {!isExpanded && (
                <p className="text-[11px] text-petroleum/80 font-medium mt-0.5">
                  Até {perms.maxGalleriesHardCap} galerias · Até{' '}
                  {perms.maxPhotosPerGallery} arquivos por galeria
                </p>
              )}
              {!isExpanded && !disabled && !isCurrentPlan && (
                <p className="text-[10px] text-gold font-semibold mt-0.5">
                  Toque para selecionar e ver benefícios ↓
                </p>
              )}
              {!isExpanded && isCurrentPlan && (
                <p className="text-[10px] text-petroleum/35 font-medium mt-0.5">
                  Toque para ver seus recursos incluídos ↓
                </p>
              )}
              {!isExpanded && disabled && !isCurrentPlan && (
                <p className="text-[8px] text-slate-400 font-medium mt-0.5">
                  Não disponível para assinatura
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              {price === 0 ? (
                <span className="text-[11px] font-semibold text-slate-400">
                  Grátis
                </span>
              ) : (
                <>
                  <p className="text-[15px] font-semibold text-petroleum leading-none">
                    R$ {price}
                  </p>
                  <p className="text-[9px] text-petroleum/90 font-medium">
                    /mês
                  </p>
                </>
              )}
            </div>
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
              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform duration-200 ${
                  isExpanded
                    ? isSelected
                      ? 'rotate-180 text-gold'
                      : 'rotate-180 text-petroleum/90'
                    : 'text-petroleum/25'
                }`}
              />
            )}
          </div>
        </div>
      </button>

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
              { label: 'Armazenamento', value: storageLabel(perms.storageGB) },
              { label: 'Galerias', value: `${perms.maxGalleries} ativas` },
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
