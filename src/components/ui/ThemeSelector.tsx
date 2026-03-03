'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, Lock, Sparkles } from 'lucide-react';
import { usePlan } from '@/core/context/PlanContext';

// ─────────────────────────────────────────────
// SEGMENTO DO APP (lido uma vez no build)
// ─────────────────────────────────────────────

const APP_SEGMENT = process.env.NEXT_PUBLIC_APP_SEGMENT || 'PHOTOGRAPHER';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type ThemeKey =
  | 'PHOTOGRAPHER'
  | 'DARK_CINEMA'
  | 'EDITORIAL_WHITE'
  | 'NATURE'
  | 'NOCTURNAL_LUXURY'
  | 'OFF_WHITE'
  | 'PLATINUM';

interface ThemeDefinition {
  key: ThemeKey;
  label: string;
  description: string;
  /** [fundo, primária/texto, acento] */
  swatches: [string, string, string];
  /** Plano mínimo necessário. undefined = free */
  minPlan?: 'START' | 'PLUS' | 'PRO' | 'PREMIUM';
  /** Segmentos onde este tema faz sentido. undefined = todos */
  segments?: string[];
  isDark?: boolean;
}

// ─────────────────────────────────────────────
// CATÁLOGO DE TEMAS
// ─────────────────────────────────────────────

export const THEMES: ThemeDefinition[] = [
  {
    key: 'PHOTOGRAPHER',
    label: 'Clássico',
    description: 'Petróleo e champagne — o padrão elegante',
    swatches: ['#F8F9FA', '#052633', '#D4AF37'],
    // sem segments = disponível em todos
  },
  {
    key: 'DARK_CINEMA',
    label: 'Dark Cinema',
    description: 'Noir dramático com acentos em borgonha',
    swatches: ['#08080A', '#F0EBE6', '#A01E3C'],
    minPlan: 'START',
    segments: ['PHOTOGRAPHER', 'CAMPAIGN', 'EVENT'],
    isDark: true,
  },
  {
    key: 'EDITORIAL_WHITE',
    label: 'Editorial',
    description: 'Branco absoluto, contraste máximo',
    swatches: ['#FFFFFF', '#0F0F0F', '#141414'],
    minPlan: 'START',
    segments: ['PHOTOGRAPHER', 'CAMPAIGN', 'OFFICE'],
  },
  {
    key: 'NATURE',
    label: 'Natureza',
    description: 'Bege areia, verde musgo e terracota',
    swatches: ['#F8F4EC', '#2D3728', '#A0643C'],
    minPlan: 'PLUS',
    segments: ['PHOTOGRAPHER'],
  },
  {
    key: 'NOCTURNAL_LUXURY',
    label: 'Noturno Luxo',
    description: 'Azul noite profundo com dourado clássico',
    swatches: ['#051223', '#DCE1EB', '#D4AF37'],
    minPlan: 'PLUS',
    segments: ['PHOTOGRAPHER', 'EVENT'],
    isDark: true,
  },
  {
    key: 'OFF_WHITE',
    label: 'Gelo',
    description: 'Gelo azulado, clean e contemporâneo',
    swatches: ['#F0F5FA', '#28405C', '#82A0BE'],
    minPlan: 'PRO',
    segments: ['PHOTOGRAPHER', 'OFFICE', 'CAMPAIGN'],
  },
  {
    key: 'PLATINUM',
    label: 'Platina',
    description: 'Cinza frio, geométrico e atemporal',
    swatches: ['#EEF0F4', '#232328', '#969AAA'],
    minPlan: 'PRO',
    segments: ['PHOTOGRAPHER', 'OFFICE', 'CAMPAIGN'],
  },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const PLAN_ORDER: Record<string, number> = {
  FREE: 0,
  START: 1,
  PLUS: 2,
  PRO: 3,
  PREMIUM: 4,
};

const PLAN_LABELS: Record<string, string> = {
  START: 'Start',
  PLUS: 'Plus',
  PRO: 'Pro',
  PREMIUM: 'Premium',
};

// Filtrado uma única vez no módulo — sem re-render
const AVAILABLE_THEMES = THEMES.filter(
  (t) => !t.segments || t.segments.includes(APP_SEGMENT),
);

// ─────────────────────────────────────────────
// SWATCH ITEM
// ─────────────────────────────────────────────

function ThemeSwatch({
  theme,
  isSelected,
  isPending,
  isLocked,
  onClick,
}: {
  theme: ThemeDefinition;
  isSelected: boolean;
  isPending: boolean;
  isLocked: boolean;
  onClick: () => void;
}) {
  const [bg, primary, accent] = theme.swatches;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocked}
      title={
        isLocked
          ? `Disponível no plano ${PLAN_LABELS[theme.minPlan!]}`
          : theme.description
      }
      className={`
        group relative flex flex-col gap-2 p-3 rounded-xl border-2 text-left
        transition-all duration-300 active:scale-[0.97]
        ${
          isLocked
            ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50'
            : isPending
              ? 'border-gold shadow-[0_0_0_3px_rgba(212,175,55,0.15)] bg-white scale-[1.02]'
              : isSelected
                ? 'border-petroleum/30 bg-white shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
        }
      `}
    >
      {/* Preview visual das 3 cores */}
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

      {/* Label */}
      <div className="space-y-0.5 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-petroleum truncate">
          {theme.label}
        </p>
        <p className="text-[9px] text-slate-400 leading-tight line-clamp-1">
          {theme.description}
        </p>
      </div>

      {/* Badge plano mínimo */}
      {isLocked && theme.minPlan && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-petroleum/10 rounded-full px-1.5 py-0.5">
          <Lock size={8} className="text-petroleum/50" />
          <span className="text-[8px] font-bold text-petroleum/50 uppercase">
            {PLAN_LABELS[theme.minPlan]}
          </span>
        </div>
      )}

      {/* Check selecionado / pendente */}
      {(isSelected || isPending) && !isLocked && (
        <div
          className={`
            absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center
            transition-all duration-200
            ${
              isPending
                ? 'bg-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                : 'bg-petroleum/20'
            }
          `}
        >
          <Check size={10} strokeWidth={3} className="text-petroleum" />
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export interface ThemeSelectorProps {
  /** Tema atualmente salvo no banco */
  currentTheme: ThemeKey;
  /**
   * ID do elemento que receberá o data-theme para preview ao vivo.
   * Se omitido, aplica no <html>.
   */
  previewTargetId?: string;
  /** Chamado ao confirmar — deve persistir no banco */
  onConfirm: (theme: ThemeKey) => Promise<void> | void;
  /** Label do botão de confirmação */
  confirmLabel?: string;
  /** Oculta o cabeçalho — útil dentro de um FormSection existente */
  compact?: boolean;
}

export function ThemeSelector({
  currentTheme,
  previewTargetId,
  onConfirm,
  confirmLabel = 'Aplicar Tema',
  compact = false,
}: ThemeSelectorProps) {
  const { planKey } = usePlan();

  const [pendingTheme, setPendingTheme] = useState<ThemeKey>(currentTheme);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const hasChanges = pendingTheme !== currentTheme;

  // Sincroniza se currentTheme mudar externamente (ex: reload de dados)
  useEffect(() => {
    setPendingTheme(currentTheme);
  }, [currentTheme]);

  // Verifica bloqueio por plano
  const isThemeLocked = useCallback(
    (theme: ThemeDefinition) => {
      if (!theme.minPlan) return false;
      return (PLAN_ORDER[planKey] ?? 0) < (PLAN_ORDER[theme.minPlan] ?? 0);
    },
    [planKey],
  );

  // Preview ao vivo
  useEffect(() => {
    const target = previewTargetId
      ? document.getElementById(previewTargetId)
      : document.documentElement;

    if (target) target.setAttribute('data-theme', pendingTheme);

    return () => {
      if (target) target.setAttribute('data-theme', currentTheme);
    };
  }, [pendingTheme, currentTheme, previewTargetId]);

  const handleConfirm = async () => {
    if (!hasChanges || isSaving) return;
    setIsSaving(true);
    try {
      await onConfirm(pendingTheme);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => setPendingTheme(currentTheme);

  const pendingThemeData = AVAILABLE_THEMES.find((t) => t.key === pendingTheme);

  return (
    <div className="space-y-4">
      {/* Cabeçalho opcional */}
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
          {hasChanges && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-gold uppercase tracking-widest animate-pulse">
              <Sparkles size={10} />
              Preview ativo
            </span>
          )}
        </div>
      )}

      {/* Grade de swatches */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {AVAILABLE_THEMES.map((theme) => {
          const locked = isThemeLocked(theme);
          return (
            <ThemeSwatch
              key={theme.key}
              theme={theme}
              isSelected={currentTheme === theme.key && !hasChanges}
              isPending={pendingTheme === theme.key && hasChanges}
              isLocked={locked}
              onClick={() => {
                if (!locked) setPendingTheme(theme.key);
              }}
            />
          );
        })}
      </div>

      {/* Hint de upgrade */}
      {AVAILABLE_THEMES.some(isThemeLocked) && (
        <p className="text-[9px] text-slate-400 italic text-center">
          <Lock size={9} className="inline mr-1 mb-0.5" />
          Alguns temas requerem upgrade de plano
        </p>
      )}

      {/* Barra de ações — desliza ao haver mudança */}
      <div
        className={`
          flex items-center justify-between gap-3 overflow-hidden
          transition-all duration-300 ease-in-out
          ${
            hasChanges
              ? 'max-h-20 opacity-100 pt-3 border-t border-slate-100'
              : 'max-h-0 opacity-0 pointer-events-none'
          }
        `}
      >
        {/* Mini-preview do tema pendente */}
        <div className="flex items-center gap-2 min-w-0">
          {pendingThemeData && (
            <>
              <div className="flex gap-0.5">
                {pendingThemeData.swatches.map((color, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-semibold text-petroleum truncate">
                {pendingThemeData.label}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-petroleum transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className={`
              flex items-center gap-1.5 px-4 py-1.5 rounded-lg
              text-[10px] font-bold uppercase tracking-widest
              transition-all duration-300 active:scale-95
              ${
                savedFeedback
                  ? 'bg-emerald-500 text-white'
                  : 'bg-petroleum text-champagne hover:bg-petroleum/90'
              }
            `}
          >
            {isSaving ? (
              <span className="w-3 h-3 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
            ) : savedFeedback ? (
              <Check size={11} strokeWidth={3} />
            ) : (
              <Sparkles size={11} />
            )}
            {isSaving
              ? 'Salvando...'
              : savedFeedback
                ? 'Aplicado!'
                : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
