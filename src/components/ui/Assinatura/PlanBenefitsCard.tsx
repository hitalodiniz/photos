'use client';

import React, { type ReactNode } from 'react';
import {
  Image,
  LayoutGrid,
  HardDrive,
  Video,
  Sparkles,
  Zap,
  ArrowRight,
  ExternalLink,
  List,
} from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import {
  formatPhotoCredits,
  type PlanKey,
  type PlanBenefitItem,
} from '@/core/config/plans';
import { PLANS_BY_SEGMENT } from '@/core/config/plans';

const SEGMENT = 'PHOTOGRAPHER' as const;

function planDisplayName(planKey: string): string {
  const segmentPlans = PLANS_BY_SEGMENT[SEGMENT] as Record<
    string,
    { name: string }
  >;
  return segmentPlans?.[planKey]?.name ?? planKey;
}

function BenefitIcon({
  label,
  size = 14,
}: {
  label: string;
  size?: number;
}): ReactNode {
  const l = label.toLowerCase();
  if (l.includes('galeria') || l.includes('galerias'))
    return <LayoutGrid size={size} className="text-purple-500 shrink-0" />;
  if (
    l.includes('capacidade') ||
    l.includes('armazenamento') ||
    l.includes('gb') ||
    l.includes('tb')
  )
    return <HardDrive size={size} className="text-emerald-500 shrink-0" />;
  if (l.includes('arquivo') || l.includes('vinculado'))
    return <Image size={size} className="text-sky-500 shrink-0" />;
  if (l.includes('vídeo') || l.includes('video'))
    return <Video size={size} className="text-pink-500 shrink-0" />;
  return <Sparkles size={size} className="text-gold shrink-0" />;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface PlanBenefitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  planKey: PlanKey;
  planBenefits: PlanBenefitItem[];
  photoCreditsUsed: number;
  photoCreditsLimit: number;
  activeGalleryCount: number;
  maxGalleriesHardCap: number;
  onComparePlans: () => void;
  onUpgrade: () => void;
  hasNextPlan: boolean;
}

export function PlanBenefitsModal({
  isOpen,
  onClose,
  planKey,
  planBenefits,
  photoCreditsUsed,
  photoCreditsLimit,
  activeGalleryCount,
  maxGalleriesHardCap,
  onComparePlans,
  onUpgrade,
  hasNextPlan,
}: PlanBenefitsModalProps) {
  const usagePct = photoCreditsLimit
    ? Math.min(100, (photoCreditsUsed / photoCreditsLimit) * 100)
    : 0;

  const body = (
    <div className="space-y-4">
      {/* Uso de fotos */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Image size={12} className="text-purple-500" />
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              Fotos utilizadas
            </p>
          </div>
          <p className="text-[11px] font-semibold text-petroleum tabular-nums">
            {formatPhotoCredits(photoCreditsUsed)} /{' '}
            {formatPhotoCredits(photoCreditsLimit)}
          </p>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              usagePct >= 90
                ? 'bg-red-400'
                : usagePct >= 70
                  ? 'bg-amber-400'
                  : 'bg-gold/70'
            }`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        {usagePct >= 80 && (
          <p className="text-[9px] text-amber-600 font-medium mt-1">
            Você está usando {Math.round(usagePct)}% da capacidade.{' '}
            {hasNextPlan && 'Considere fazer upgrade.'}
          </p>
        )}
      </div>

      {/* Uso de galerias */}
      {maxGalleriesHardCap > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <LayoutGrid size={12} className="text-purple-500" />
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                Galerias ativas
              </p>
            </div>
            <p className="text-[11px] font-semibold text-petroleum tabular-nums">
              {activeGalleryCount} / {maxGalleriesHardCap}
            </p>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400/70 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (activeGalleryCount / maxGalleriesHardCap) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Lista de benefícios */}
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600 mb-2">
          Todos os benefícios incluídos
        </p>
        <div className="space-y-1.5">
          {planBenefits.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
            >
              <BenefitIcon label={item.label} size={13} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-petroleum uppercase tracking-wide leading-tight">
                  {item.label}
                </p>
                <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-col gap-2">
      {hasNextPlan && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onUpgrade();
          }}
          className="btn-luxury-primary w-full"
        >
          <Zap size={12} />
          Fazer upgrade de plano
          <ArrowRight size={12} />
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          onClose();
          onComparePlans();
        }}
        className="btn-secondary-white w-full"
      >
        Comparar todos os planos
        <ExternalLink size={11} />
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes do plano"
      subtitle={`Plano ${planDisplayName(planKey)}`}
      maxWidth="lg"
      footer={footer}
    >
      {body}
    </BaseModal>
  );
}

// ─── Card resumo (abre o modal) ───────────────────────────────────────────────

interface PlanBenefitsSummaryCardProps {
  planKey: PlanKey;
  planBenefits: PlanBenefitItem[];
  photoCreditsUsed: number;
  photoCreditsLimit: number;
  activeGalleryCount?: number;
  maxGalleriesHardCap?: number;
  onClick: () => void;
}

export function PlanBenefitsSummaryCard({
  planKey,
  planBenefits,
  photoCreditsUsed,
  photoCreditsLimit,
  activeGalleryCount = 0,
  maxGalleriesHardCap = 0,
  onClick,
}: PlanBenefitsSummaryCardProps) {
  const usagePct = photoCreditsLimit
    ? Math.min(100, (photoCreditsUsed / photoCreditsLimit) * 100)
    : 0;

  const galleriesPct =
    maxGalleriesHardCap > 0
      ? Math.min(100, (activeGalleryCount / maxGalleriesHardCap) * 100)
      : 0;

  const remaining = planBenefits.length - 2;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 bg-white rounded-luxury border border-slate-200 hover:border-petroleum/20 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-900">
          Recursos do plano {planDisplayName(planKey)}
        </p>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-petroleum/70 group-hover:text-petroleum/70 transition-colors">
          <List size={10} />
          Ver todos
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Fotos e vídeos */}
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-50 rounded-lg">
              <Image size={16} className="text-purple-500 shrink-0" />
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              Fotos e vídeos
            </p>
          </div>
          <div className="mb-2">
            <p className="text-lg font-semibold text-petroleum leading-none tabular-nums">
              {formatPhotoCredits(photoCreditsUsed)}
              <span className="text-[10px] font-medium text-slate-600 ml-1">
                / {formatPhotoCredits(photoCreditsLimit)}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePct >= 90
                    ? 'bg-red-400'
                    : usagePct >= 70
                      ? 'bg-amber-400'
                      : 'bg-gold/60'
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="text-[9px] font-semibold text-slate-600 text-right uppercase">
              {Math.round(usagePct)}% usado
            </p>
          </div>
        </div>

        {/* Galerias ativas */}
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <LayoutGrid size={16} className="text-blue-500 shrink-0" />
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              Galerias Ativas
            </p>
          </div>
          <div className="mb-2">
            <p className="text-lg font-semibold text-petroleum leading-none tabular-nums">
              {activeGalleryCount}
              <span className="text-[10px] font-medium text-slate-600 ml-1">
                / {maxGalleriesHardCap}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  galleriesPct >= 90
                    ? 'bg-red-400'
                    : galleriesPct >= 70
                      ? 'bg-amber-400'
                      : 'bg-blue-400/60'
                }`}
                style={{ width: `${galleriesPct}%` }}
              />
            </div>
            <p className="text-[9px] font-semibold text-slate-600 text-right uppercase">
              {Math.round(galleriesPct)}% usado
            </p>
          </div>
        </div>
      </div>

      {remaining > 0 && (
        <p className="text-[10px] text-slate-700 font-medium">
          +{remaining} mais recursos incluídos
        </p>
      )}
    </button>
  );
}
