'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { PlanGuard } from '../auth/PlanGuard';

const APP_SEGMENT = process.env.NEXT_PUBLIC_APP_SEGMENT || 'PHOTOGRAPHER';

export type ThemeKey =
  | 'PHOTOGRAPHER'
  | 'DARK_CINEMA'
  | 'EDITORIAL_WHITE'
  | 'NATURE'
  | 'NOCTURNAL_LUXURY'
  | 'OFF_WHITE'
  | 'PLATINUM'
  | 'WARM_BLUSH';

interface ThemeDefinition {
  key: ThemeKey;
  label: string;
  description: string;
  categories: string; // texto para o tooltip
  swatches: [string, string, string];
  minPlan?: 'START' | 'PLUS' | 'PRO' | 'PREMIUM';
  segments?: string[];
  isDark?: boolean;
}

export const THEMES: ThemeDefinition[] = [
  {
    key: 'PHOTOGRAPHER',
    label: 'Clássico',
    description: 'Petróleo e champagne — o padrão elegante',
    categories:
      'Casamento, ensaio feminino, newborn, família, pré-wedding, gestante.',
    swatches: ['#F8F9FA', '#052633', '#D4AF37'],
  },
  {
    key: 'DARK_CINEMA',
    label: 'Dark Cinema',
    description: 'Noir dramático com acentos dourados',
    categories:
      'Show, balada, teatro, festival, automobilismo, cosplay, street photography.',
    swatches: ['#0A0A0A', '#F5F2EB', '#C9A028'],
    minPlan: 'START',
    segments: ['PHOTOGRAPHER', 'CAMPAIGN', 'EVENT'],
    isDark: true,
  },
  {
    key: 'EDITORIAL_WHITE',
    label: 'Editorial',
    description: 'Branco absoluto, contraste máximo',
    categories:
      'Moda, produto, joias, institucional, imobiliário, perfil profissional, corporativo.',
    swatches: ['#FFFFFF', '#141414', '#1E1E1E'],
    minPlan: 'START',
    segments: ['PHOTOGRAPHER', 'CAMPAIGN', 'OFFICE'],
  },
  {
    key: 'NATURE',
    label: 'Natureza',
    description: 'Bege areia, verde musgo e terracota',
    categories:
      'Natureza, hipismo, surf, esporte de aventura, viagem, lifestyle, família.',
    swatches: ['#F8F4EC', '#2D3728', '#A0643C'],
    minPlan: 'PLUS',
    segments: ['PHOTOGRAPHER'],
  },
  {
    key: 'NOCTURNAL_LUXURY',
    label: 'Noturno Luxo',
    description: 'Azul noite profundo com dourado clássico',
    categories:
      'Bodas, casamento noturno, boudoir, pré-wedding, debutante, festa temática.',
    swatches: ['#08122C', '#F3E5AB', '#D4AF37'],
    minPlan: 'PLUS',
    segments: ['PHOTOGRAPHER', 'EVENT'],
    isDark: true,
  },
  {
    key: 'OFF_WHITE',
    label: 'Gelo',
    description: 'Gelo azulado, clean e contemporâneo',
    categories:
      'Newborn, gestante, smash the cake, lifestyle, produto, estúdio clean.',
    swatches: ['#F0F5FA', '#28405C', '#82A0BE'],
    minPlan: 'PRO',
    segments: ['PHOTOGRAPHER', 'OFFICE', 'CAMPAIGN'],
  },
  {
    key: 'PLATINUM',
    label: 'Platina',
    description: 'Cinza frio, geométrico e atemporal',
    categories:
      'Corporativo, arquitetura, interiores, perfil profissional, institucional.',
    swatches: ['#EEF0F4', '#232328', '#969AAA'],
    minPlan: 'PRO',
    segments: ['PHOTOGRAPHER', 'OFFICE', 'CAMPAIGN'],
  },
  {
    key: 'WARM_BLUSH',
    label: 'Blush',
    description: 'Rosa nude e dourado suave',
    categories:
      'Ensaio feminino, newborn, gestante, lifestyle, debutante, retrato delicado.',
    swatches: ['#FDF6F0', '#8B6B5C', '#C9A87C'],
    minPlan: 'PLUS',
    segments: ['PHOTOGRAPHER', 'EVENT'],
  },
];

const AVAILABLE_THEMES = THEMES.filter(
  (t) => !t.segments || t.segments.includes(APP_SEGMENT),
);

function ThemeSwatch({
  theme,
  isSelected,
  isPending,
  isSaving,
  onClick,
}: {
  theme: ThemeDefinition;
  isSelected: boolean;
  isPending: boolean;
  isSaving: boolean;
  onClick: () => void;
}) {
  const [bg, primary, accent] = theme.swatches;

  return (
    <PlanGuard
      feature="customizationLevel"
      label="Tema Visual da galeria"
      variant="mini"
    >
      <button
        type="button"
        onClick={onClick}
        disabled={isSaving}
        className={`
        group relative flex flex-col gap-2 p-3 rounded-xl border-2 text-left
        transition-all duration-300 active:scale-[0.97]
        ${
          isSaving || isPending
            ? 'border-gold shadow-[0_0_0_3px_rgba(212,175,55,0.15)] bg-white scale-[1.02]'
            : isSelected
              ? 'border-petroleum/30 bg-white shadow-md'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
        }
      `}
      >
        {/* Preview visual */}
        <div
          className="w-full h-10 rounded-lg flex items-center justify-between px-2.5 overflow-hidden relative"
          style={{ backgroundColor: bg }}
        >
          <div
            className="w-1 h-6 rounded-full opacity-80"
            style={{ backgroundColor: primary }}
          />
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: primary, opacity: 0.6 }}
            />
            <div
              className="w-3 h-1 rounded-full"
              style={{ backgroundColor: primary, opacity: 0.3 }}
            />
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accent }}
          />
          {theme.isDark && (
            <div className="absolute inset-0 bg-black/5 rounded-lg" />
          )}
        </div>

        {/* Label + tooltip */}
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-petroleum truncate">
              {theme.label}
            </p>
            {/* InfoTooltip com categorias recomendadas — portal para não ser cortado */}
            <span onClick={(e) => e.stopPropagation()}>
              <InfoTooltip
                title="Recomendado para"
                content={theme.categories}
                size="xl"
                align="left"
                position="bottom"
                portal
              />
            </span>
          </div>
          <p className="text-[9px] text-slate-400 leading-tight line-clamp-1">
            {theme.description}
          </p>
        </div>

        {/* Check selecionado / salvando */}
        {(isSelected || isPending || isSaving) && (
          <div
            className={`
          absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center
          transition-all duration-200
          ${isSaving ? 'bg-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]' : isPending ? 'bg-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]' : 'bg-petroleum/20'}
        `}
          >
            {isSaving ? (
              <span className="w-2.5 h-2.5 border-2 border-petroleum/30 border-t-petroleum rounded-full animate-spin" />
            ) : (
              <Check size={10} strokeWidth={3} className="text-petroleum" />
            )}
          </div>
        )}
      </button>
    </PlanGuard>
  );
}

export interface ThemeSelectorProps {
  currentTheme: ThemeKey;
  previewTargetId?: string;
  onConfirm: (theme: ThemeKey) => Promise<void> | void;
  confirmLabel?: string;
  compact?: boolean;
}

export function ThemeSelector({
  currentTheme,
  previewTargetId,
  onConfirm,
  confirmLabel = 'Aplicar Tema',
  compact = false,
}: ThemeSelectorProps) {
  const [pendingTheme, setPendingTheme] = useState<ThemeKey>(currentTheme);
  const [savingTheme, setSavingTheme] = useState<ThemeKey | null>(null);

  useEffect(() => {
    setPendingTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const target = previewTargetId
      ? document.getElementById(previewTargetId)
      : document.documentElement;
    if (target) target.setAttribute('data-theme', pendingTheme);
    return () => {
      if (target) target.setAttribute('data-theme', currentTheme);
    };
  }, [pendingTheme, currentTheme, previewTargetId]);

  const handleSelectTheme = async (themeKey: ThemeKey) => {
    if (themeKey === currentTheme) return;
    setPendingTheme(themeKey);
    setSavingTheme(themeKey);
    try {
      await onConfirm(themeKey);
    } finally {
      setSavingTheme(null);
    }
  };

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
              Tema Visual
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Personaliza as cores da sua página pública
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {AVAILABLE_THEMES.map((theme) => (
          <ThemeSwatch
            key={theme.key}
            theme={theme}
            isSelected={currentTheme === theme.key}
            isPending={false}
            isSaving={savingTheme === theme.key}
            onClick={() => handleSelectTheme(theme.key)}
          />
        ))}
      </div>
    </div>
  );
}
