'use client';

import { Briefcase, ChevronDown } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

export type GalleryTypeValue = 'CT' | 'ES' | 'CB';

const OPTIONS: {
  value: GalleryTypeValue;
  label: string;
  description: string;
}[] = [
  {
    value: 'CT',
    label: 'Entrega de fotos',
    description: 'Acesso exclusivo para o cliente contratante.',
  },
  {
    value: 'ES',
    label: 'Seleção de fotos',
    description:
      'O cliente seleciona as fotos para tratamento e entrega final.',
  },
  {
    value: 'CB',
    label: 'Disponibilização de fotos',
    description: 'Link público para visualização, sem um cliente específico.',
  },
];

const UNIFIED_TOOLTIP_CONTENT = (
  <div className="flex flex-col gap-2.5">
    {OPTIONS.map((opt) => (
      <div key={opt.value}>
        <strong className="text-gold uppercase text-[9px] font-semibold block mb-0.5">
          {opt.label}:
        </strong>
        <p className="text-[10px] leading-relaxed">{opt.description}</p>
      </div>
    ))}
  </div>
);

export function GalleryTypeToggle({
  value,
  onChange,
  label = 'TIPO de galeria',
  showLabelIcon = true,
  disabledContract = false,
  className = '',
}: any) {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label className="text-[10px] font-semibold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
          {showLabelIcon && <Briefcase size={12} className="text-gold" />}
          {label}
        </label>
        <InfoTooltip
          content={UNIFIED_TOOLTIP_CONTENT}
          align="left"
          position="bottom"
          size="2xl"
        />
      </div>

      <div className="relative group">
        <select
          // 1. Garanta que o estado inicial no componente pai seja ""
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-11 bg-white border rounded-lg px-3 pr-10 text-xs font-medium appearance-none focus:outline-none focus:ring-2 transition-all cursor-pointer
    ${
      !value
        ? 'border-slate-200 text-slate-400'
        : 'border-slate-200 text-slate-700 focus:ring-gold/20 focus:border-gold'
    }`}
        >
          {OPTIONS.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.value === 'CT' && disabledContract}
              className="text-slate-700 bg-white"
            >
              {opt.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-gold transition-colors">
          <ChevronDown size={16} />
        </div>
      </div>
    </div>
  );
}
