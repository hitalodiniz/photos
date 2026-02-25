'use client';

import { Briefcase } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

export type GalleryTypeValue = 'CT' | 'ES' | 'CB';

const OPTIONS: { value: GalleryTypeValue; label: string }[] = [
  { value: 'CT', label: 'Contrato' },
  { value: 'ES', label: 'Ensaio' },
  { value: 'CB', label: 'Cobertura' },
];

// Texto unificado com formatação JSX para o Tooltip
const UNIFIED_TOOLTIP_CONTENT = (
  <div className="flex flex-col gap-2.5">
    <div>
      <strong className="text-gold uppercase text-[9px] block mb-0.5">
        Contrato:
      </strong>
      <p>Acesso exclusivo para o cliente contratante.</p>
    </div>
    <div>
      <strong className="text-gold uppercase text-[9px] block mb-0.5">
        Ensaio:
      </strong>
      <p>
        O cliente seleciona as fotos do ensaio para tratamento pelo fotógrafo e
        entrega final.
      </p>
    </div>
    <div>
      <strong className="text-gold uppercase text-[9px] block mb-0.5">
        Cobertura:
      </strong>
      <p>Link público para visualização, sem um cliente específico.</p>
    </div>
  </div>
);

export interface GalleryTypeToggleProps {
  value: GalleryTypeValue;
  onChange: (value: GalleryTypeValue) => void;
  label?: string;
  showLabelIcon?: boolean;
  disabledContract?: boolean;
  hint?: string;
  className?: string;
}

export function GalleryTypeToggle({
  value,
  onChange,
  label,
  showLabelIcon = true,
  disabledContract = false,
  hint,
  className = '',
}: GalleryTypeToggleProps) {
  const index = OPTIONS.findIndex((o) => o.value === value);
  const safeIndex = index >= 0 ? index : 0;

  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <label>
            {showLabelIcon && (
              <Briefcase size={12} strokeWidth={2} className="text-gold" />
            )}
            {label}
          </label>
          <InfoTooltip
            content={UNIFIED_TOOLTIP_CONTENT}
            align="left"
            position="bottom"
            size="2xl" // Aumentado para comportar os 3 textos confortavelmente
          />
        </div>
      )}

      <div className="flex p-1 bg-slate-50 rounded-luxury border border-slate-200 h-10 items-center relative">
        <div
          className="absolute top-1 bottom-1 rounded-[0.35rem] transition-all duration-300 bg-champagne border border-gold/20 shadow-sm"
          style={{
            width: 'calc(33.333% - 4px)',
            left: `calc(${safeIndex * 33.333}% + 2px)`,
          }}
        />
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={opt.value === 'CT' && disabledContract}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex-1 text-[9px] font-semibold uppercase tracking-luxury-widest transition-colors ${
              value === opt.value
                ? 'text-black'
                : 'text-petroleum/60 dark:text-slate-400'
            } ${opt.value === 'CT' && disabledContract ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {hint && (
        <p className="mt-1.5 text-[9px] text-petroleum/50 italic px-1">
          {hint}
        </p>
      )}
    </div>
  );
}
