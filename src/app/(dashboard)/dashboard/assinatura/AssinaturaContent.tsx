'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { RelatorioBasePage } from '@/components/ui/RelatorioBasePage';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import {
  PERMISSIONS_BY_PLAN,
  PLANS_BY_SEGMENT,
  formatPhotoCredits,
  getPlanBenefits,
  getPeriodPrice,
  type PlanKey,
  type PlanBenefitItem,
} from '@/core/config/plans';
import type { AssinaturaPageData } from './page';
import type { UpgradeRequest } from '@/core/types/billing';
import {
  Calendar,
  CreditCard,
  ExternalLink,
  Package,
  Crown,
  Clock,
  BadgeCheck,
  Banknote,
  Image,
  HardDrive,
  LayoutGrid,
  Video,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Zap,
  AlertTriangle,
  List,
  X,
  ArrowRight,
} from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { UpgradeSheet } from '@/components/ui/Upgradesheet';
import { useToast } from '@/hooks/useToast';
import { button } from 'framer-motion/client';

// ─── Constantes ───────────────────────────────────────────────────────────────

const SEGMENT = 'PHOTOGRAPHER' as const;
const PLAN_ORDER: PlanKey[] = ['FREE', 'START', 'PLUS', 'PRO', 'PREMIUM'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function planDisplayName(planKey: string): string {
  const segmentPlans = PLANS_BY_SEGMENT[SEGMENT] as Record<
    string,
    { name: string }
  >;
  return segmentPlans?.[planKey]?.name ?? planKey;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Processando',
    approved: 'Aprovado',
    pending_cancellation: 'Cancelamento agendado',
    pending_downgrade: 'Downgrade agendado',
    rejected: 'Rejeitado',
    cancelled: 'Cancelado',
    free: 'Plano gratuito',
    active: 'Ativo',
  };
  return map[status] ?? status;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function billingPeriodToMonths(period: string | null | undefined): number {
  if (period === 'semiannual') return 6;
  if (period === 'annual') return 12;
  return 1;
}

/** Extrai a data de vencimento das notes quando for upgrade gratuito (ex.: "Nova data de vencimento: 2026-06-16T16:22:36.921Z"). */
function parseDueDateFromNotes(
  notes: string | null | undefined,
): string | null {
  if (!notes?.trim()) return null;
  const match = notes.match(/Nova data de vencimento:\s*([^\s.]+)/i);
  if (!match?.[1]) return null;
  const dateStr = match[1].trim();
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR');
}

function getRequestExpiresAt(item: UpgradeRequest): string | null {
  const fromNotes = parseDueDateFromNotes(item.notes);
  if (fromNotes) return fromNotes;
  if (!item.processed_at) return null;
  const start = new Date(item.processed_at);
  const months = billingPeriodToMonths(item.billing_period);
  const d = new Date(start);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('pt-BR');
}

function getNextPlanKey(current: PlanKey): PlanKey | null {
  const idx = PLAN_ORDER.indexOf(current);
  if (idx === -1 || idx >= PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[idx + 1];
}

// ─── Ícone por benefício ──────────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL DE BENEFÍCIOS DO PLANO ATUAL (usa BaseModal)
// ═══════════════════════════════════════════════════════════════════════════════

function PlanBenefitsModal({
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
}: {
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
}) {
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
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
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
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
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
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
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

// ═══════════════════════════════════════════════════════════════════════════════
// CARD COMPACTO DE BENEFÍCIOS (substitui o grid)
// ═══════════════════════════════════════════════════════════════════════════════

function PlanBenefitsSummaryCard({
  planKey,
  planBenefits,
  photoCreditsUsed,
  photoCreditsLimit,
  activeGalleryCount = 0,
  maxGalleriesHardCap = 0,
  onClick,
}: {
  planKey: PlanKey;
  planBenefits: PlanBenefitItem[];
  photoCreditsUsed: number;
  photoCreditsLimit: number;
  activeGalleryCount?: number;
  maxGalleriesHardCap?: number;
  onClick: () => void;
}) {
  const usagePct = photoCreditsLimit
    ? Math.min(100, (photoCreditsUsed / photoCreditsLimit) * 100)
    : 0;

  const galleriesPct =
    maxGalleriesHardCap > 0
      ? Math.min(100, (activeGalleryCount / maxGalleriesHardCap) * 100)
      : 0;

  // Mostrar apenas os 3 primeiros benefícios como preview
  const remaining = planBenefits.length - 2;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 bg-white rounded-luxury border border-slate-200 hover:border-petroleum/20 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[8px] font-semibold uppercase tracking-widest text-slate-900">
          Recursos do plano {planDisplayName(planKey)}
        </p>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-petroleum/70 group-hover:text-petroleum/70 transition-colors">
          <List size={10} />
          Ver todos
        </div>
      </div>

      {/* Uso: mesmo layout do card "Próximo nível" (label à esquerda, quantidade à direita) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Card de Fotos e Vídeos */}
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-50 rounded-lg">
              <Image size={16} className="text-purple-500 shrink-0" />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Fotos e vídeos
            </p>
          </div>

          <div className="mb-2">
            <p className="text-lg font-bold text-petroleum leading-none tabular-nums">
              {formatPhotoCredits(photoCreditsUsed)}
              <span className="text-[10px] font-medium text-slate-400 ml-1">
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
            <p className="text-[8px] font-bold text-slate-400 text-right uppercase">
              {Math.round(usagePct)}% usado
            </p>
          </div>
        </div>

        {/* Card de Teto de Galerias */}
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <LayoutGrid size={16} className="text-blue-500 shrink-0" />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Galerias Ativas
            </p>
          </div>

          <div className="mb-2">
            <p className="text-lg font-bold text-petroleum leading-none tabular-nums">
              {activeGalleryCount}
              <span className="text-[10px] font-medium text-slate-400 ml-1">
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
            <p className="text-[8px] font-bold text-slate-400 text-right uppercase">
              {Math.round(galleriesPct)}% usado
            </p>
          </div>
        </div>
      </div>

      {/* Preview dos benefícios */}
      {remaining > 0 && (
        <p className="text-[10px] text-slate-700 font-medium">
          +{remaining} mais recursos incluídos
        </p>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPSELL CARD — estilo PlanosContent (fundo branco, font-semibold)
// ═══════════════════════════════════════════════════════════════════════════════

function UpgradeUpsellCard({
  currentPlanKey,
  onUpgrade,
}: {
  currentPlanKey: PlanKey;
  /** Chamado com o próximo plano ao clicar em "Assinar Plano X". */
  onUpgrade: (nextPlanKey: PlanKey) => void;
}) {
  const nextPlanKey = getNextPlanKey(currentPlanKey);
  if (!nextPlanKey) return null;

  const nextPlanInfo = PLANS_BY_SEGMENT[SEGMENT][nextPlanKey];
  const nextPermissions = PERMISSIONS_BY_PLAN[nextPlanKey];
  const nextPlanBenefits: PlanBenefitItem[] = useMemo(
    () => getPlanBenefits(nextPermissions, { items: 'galerias' }),
    [nextPermissions],
  );
  const annualPrice = getPeriodPrice(nextPlanInfo, 'annual');
  const semestralPrice = getPeriodPrice(nextPlanInfo, 'semiannual');

  if (!nextPlanBenefits.length || !nextPlanInfo) return null;

  const previewBenefits = nextPlanBenefits.slice(0, 3);

  return (
    <div className="rounded-luxury border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles size={20} className="text-gold" />

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-700">
              Próximo nível
            </p>
            <p className="text-[13px] font-semibold text-petroleum leading-tight">
              Plano {nextPlanInfo.name ?? nextPlanKey}
            </p>
          </div>
        </div>
        {nextPlanInfo.price > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[15px] font-semibold text-petroleum leading-none">
              R${nextPlanInfo.price}
              <span className="text-[9px] font-medium text-slate-700">
                /mês
              </span>
            </p>
            {annualPrice.discount > 0 && (
              <p className="text-[10px] text-emerald-600 font-semibold">
                −{annualPrice.discount}% no anual
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-700 mb-2">
          Por que fazer upgrade
        </p>
        <ul className="space-y-2">
          {previewBenefits.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2
                size={12}
                className="text-gold shrink-0 mt-0.5"
                strokeWidth={2}
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-petroleum leading-tight">
                  {item.label}
                </p>
                <p className="text-[10px] text-slate-500 leading-snug">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {(semestralPrice.discount > 0 || annualPrice.discount > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {semestralPrice.discount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                −{semestralPrice.discount}% semestral
              </span>
            )}
            {annualPrice.discount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                −{annualPrice.discount}% anual
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 space-y-2">
        <button
          type="button"
          onClick={() => onUpgrade(nextPlanKey)}
          className="btn-luxury-primary h-8 w-full"
        >
          <Zap size={12} strokeWidth={2.5} />
          Assinar Plano {nextPlanInfo.name ?? nextPlanKey}
          <ChevronRight size={12} />
        </button>
        <a
          href="/planos"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-petroleum/70 hover:text-petroleum font-semibold text-[9px] uppercase tracking-wider transition-colors border border-petroleum/20 rounded-lg hover:border-petroleum/40"
        >
          Comparar planos
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function AssinaturaContent({
  data,
}: {
  data: AssinaturaPageData;
}) {
  const router = useRouter();
  const {
    profile,
    history,
    poolStats,
    lastChargeAmount,
    subscriptionStatus,
    expiresAt: expiresAtFromData,
  } = data;

  const planKey = (profile.plan_key || 'FREE') as PlanKey;
  const permissions = PERMISSIONS_BY_PLAN[planKey];
  const photoCreditsLimit = permissions.photoCredits ?? 0;
  const photoCreditsUsed = poolStats.totalPhotosUsed ?? 0;
  const expiresAt =
    expiresAtFromData != null
      ? new Date(expiresAtFromData).toLocaleDateString('pt-BR')
      : profile.plan_trial_expires
        ? new Date(profile.plan_trial_expires).toLocaleDateString('pt-BR')
        : null;

  const planBenefits = useMemo(
    () => getPlanBenefits(permissions, { items: 'galerias' }),
    [permissions],
  );

  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [upgradeSheetOpen, setUpgradeSheetOpen] = useState(false);
  const [upgradeSheetInitialPlan, setUpgradeSheetInitialPlan] = useState<
    PlanKey | undefined
  >(undefined);
  const hasNextPlan = !!getNextPlanKey(planKey);
  const { showToast, ToastElement } = useToast();

  const handleUpgrade = (targetPlanKey: PlanKey) => {
    router.refresh();
    setUpgradeSheetInitialPlan(targetPlanKey);
    setUpgradeSheetOpen(true);
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch('/api/dashboard/cancel-subscription', {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setShowCancelModal(false);
        router.refresh();
        if (json.access_ends_at) {
          showToast(
            `Cancelamento agendado. Seu acesso segue até ${new Date(json.access_ends_at).toLocaleDateString('pt-BR')}.`,
            'success',
          );
        } else {
          showToast('Assinatura cancelada.', 'success');
        }
      } else {
        showToast(json.error || 'Erro ao cancelar.', 'error');
      }
    } catch {
      showToast('Erro ao cancelar assinatura.', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // ─── Colunas da tabela ──────────────────────────────────────────────────────

  const columns: Array<{
    header: string;
    accessor:
      | keyof UpgradeRequest
      | ((item: UpgradeRequest) => React.ReactNode);
    icon?: React.ElementType;
    align?: 'left' | 'right' | 'center';
    width?: string;
  }> = [
    {
      header: 'Data',
      accessor: (item) => (
        <span className="text-[12px] text-slate-700 whitespace-nowrap">
          {new Date(item.created_at).toLocaleDateString('pt-BR', {
            timeZone: 'UTC',
          })}{' '}
        </span>
      ),
      icon: Calendar,
    },
    {
      header: 'Plano',
      accessor: (item) => (
        <span className="font-medium text-petroleum">
          {planDisplayName(item.plan_key_requested)}
        </span>
      ),
      icon: Package,
    },
    {
      header: 'Valor total',
      accessor: (item) => (
        <span className="text-[12px] font-medium">
          {formatBRL(item.amount_final)}
        </span>
      ),
      icon: CreditCard,
      align: 'right',
    },
    {
      header: 'Pagamento',
      accessor: (item) => (
        <span className="text-[10px] uppercase tracking-wide">
          {item.billing_type === 'CREDIT_CARD'
            ? 'Cartão de crédito'
            : item.billing_type}
        </span>
      ),
    },
    {
      header: 'Ciclo',
      accessor: (item) => {
        const periodMap: Record<string, string> = {
          monthly: 'Mensal',
          semiannual: 'Semestral',
          annual: 'Anual',
        };
        return (
          <span className="text-[11px] text-slate-600">
            {periodMap[item.billing_period as string] ?? 'Mensal'}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: (item) => (
        <span className="text-[11px] font-medium">
          {statusLabel(item.status)}
        </span>
      ),
    },
    {
      header: 'Vencimento',
      accessor: (item) => (
        <span className="text-[11px] text-slate-600 whitespace-nowrap">
          {getRequestExpiresAt(item) ?? '—'}
        </span>
      ),
      icon: Clock,
      width: 'w-28',
    },
    {
      header: 'Observações',
      accessor: (item: UpgradeRequest) =>
        item.notes?.trim() ? (
          <span
            className="text-[11px] text-slate-600 max-w-[240px] block truncate"
            title={item.notes}
          >
            {item.notes}
          </span>
        ) : (
          <span className="text-slate-400 text-[11px]">—</span>
        ),
      width: 'w-56',
    },
    {
      header: 'Ação',
      accessor: (item) => {
        // Só usar como link se for URL (Asaas); PIX antigo pode ter payload "copia e cola" salvo
        const url = item.payment_url?.startsWith('http')
          ? item.payment_url
          : null;
        if (!url) {
          return <span className="text-slate-400 text-[11px]">—</span>;
        }

        let label = 'Ver pagamento';
        if (item.status === 'pending') {
          label = 'Abrir pagamento';
        } else if (item.status === 'approved') {
          label = 'Comprovante de pagamento';
        } else if (
          item.status === 'cancelled' ||
          item.status === 'pending_cancellation' ||
          item.status === 'rejected'
        ) {
          label = 'Comprovante de cancelamento';
        }

        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gold hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {label}
            <ExternalLink size={12} />
          </a>
        );
      },
      icon: ExternalLink,
      width: 'w-40',
    },
  ];

  // ─── Header content ─────────────────────────────────────────────────────────

  const headerContent = (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gold/80 mb-0.5">
          Minha assinatura
        </span>
        <h2 className="text-[15px] font-semibold uppercase text-petroleum leading-tight">
          Plano {planDisplayName(planKey)}
          {profile.is_trial && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-[9px] font-semibold text-gold align-middle">
              TRIAL
            </span>
          )}
        </h2>
      </div>
      {planKey !== 'FREE' && (
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-400 hover:text-red-600 transition-colors shrink-0"
        >
          <AlertTriangle size={11} />
          Cancelar assinatura
        </button>
      )}
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <RelatorioBasePage
        title="Minha assinatura"
        onBack={() => router.push('/dashboard')}
        footerStatusText={`Plano ${planDisplayName(planKey)}`}
        headerContent={headerContent}
      >
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-4">
          {/* ── Sidebar ── */}
          <aside className="w-full lg:w-[300px] space-y-3 shrink-0">
            {/* 1. Resumo do plano */}
            <div className="p-3 bg-white rounded-luxury border border-slate-200 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                <Crown size={14} className="text-gold shrink-0" />
                <div>
                  <p className="text-[8px] uppercase font-semibold text-slate-400 leading-tight">
                    Plano
                  </p>
                  <p className="text-[10px] font-semibold text-petroleum">
                    {planDisplayName(planKey)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gold shrink-0" />
                <div>
                  <p className="text-[8px] uppercase font-semibold text-slate-400 leading-tight">
                    Expira em
                  </p>
                  <p className="text-[10px] font-semibold text-petroleum">
                    {expiresAt ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                <BadgeCheck size={14} className="text-gold shrink-0" />
                <div>
                  <p className="text-[8px] uppercase font-semibold text-slate-400 leading-tight">
                    Status
                  </p>
                  <p className="text-[10px] font-semibold text-petroleum">
                    {statusLabel(subscriptionStatus)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Banknote size={14} className="text-gold shrink-0" />
                <div>
                  <p className="text-[8px] uppercase font-semibold text-slate-400 leading-tight">
                    Última cobrança
                  </p>
                  <p className="text-[10px] font-semibold text-petroleum">
                    {lastChargeAmount != null
                      ? formatBRL(lastChargeAmount)
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Card compacto de benefícios — abre modal ao clicar */}
            <PlanBenefitsSummaryCard
              planKey={planKey}
              planBenefits={planBenefits}
              photoCreditsUsed={photoCreditsUsed}
              photoCreditsLimit={photoCreditsLimit}
              activeGalleryCount={poolStats.activeGalleryCount ?? 0}
              maxGalleriesHardCap={permissions.maxGalleriesHardCap ?? 0}
              onClick={() => setShowBenefitsModal(true)}
            />

            {/* 3. Card de upsell com carousel — destaque principal */}
            <UpgradeUpsellCard
              currentPlanKey={planKey}
              onUpgrade={handleUpgrade}
            />

            {/* Fallback: mesmo no plano máximo o usuário pode mudar de plano (upgrade/downgrade) */}
            {!hasNextPlan && planKey !== 'FREE' && (
              <div className="p-3 bg-white rounded-luxury border border-slate-200 text-center space-y-2">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-petroleum/40">
                  Você está no plano mais completo
                </p>
                <p className="text-[10px] text-petroleum/70">
                  Mesmo assim, você pode alterar seu plano a qualquer momento.
                </p>
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpgrade(planKey)}
                    className="btn-luxury-primary h-8"
                  >
                    Alterar plano
                    <ArrowRight size={10} />
                  </button>
                  <a
                    href="/planos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-semibold text-gold hover:text-gold/70 inline-flex items-center gap-1 transition-colors"
                  >
                    Ver opções de planos <ArrowRight size={10} />
                  </a>
                </div>
              </div>
            )}
          </aside>

          {/* ── Conteúdo principal ── */}
          <main className="flex-1 min-w-0 space-y-4">
            <div className="bg-white rounded-luxury border border-slate-200 p-4 shadow-sm">
              <h2 className="text-[9px] font-semibold uppercase text-slate-500 tracking-tighter mb-3">
                Histórico de pagamentos
              </h2>
              <RelatorioTable<UpgradeRequest>
                data={history}
                columns={columns}
                emptyMessage="Nenhum pagamento encontrado."
                itemsPerPage={10}
              />
            </div>
          </main>
        </div>
      </RelatorioBasePage>

      {/* Modal de benefícios */}
      <PlanBenefitsModal
        isOpen={showBenefitsModal}
        onClose={() => setShowBenefitsModal(false)}
        planKey={planKey}
        planBenefits={planBenefits}
        photoCreditsUsed={photoCreditsUsed}
        photoCreditsLimit={photoCreditsLimit}
        activeGalleryCount={poolStats.activeGalleryCount ?? 0}
        maxGalleriesHardCap={permissions.maxGalleriesHardCap ?? 0}
        onComparePlans={() => window.open('/planos', '_blank')}
        onUpgrade={() => {
          const next = getNextPlanKey(planKey);
          if (next) handleUpgrade(next);
        }}
        hasNextPlan={hasNextPlan}
      />

      <UpgradeSheet
        isOpen={upgradeSheetOpen}
        onClose={() => {
          router.refresh();
          setUpgradeSheetOpen(false);
          setUpgradeSheetInitialPlan(undefined);
        }}
        initialPlanKey={upgradeSheetInitialPlan}
      />

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        title="Cancelar assinatura"
        message="Tem certeza que deseja cancelar sua assinatura? Em até 7 dias o valor pode ser estornado."
        confirmText="Sim, cancelar"
        variant="danger"
        isLoading={cancelLoading}
      />

      {ToastElement}
    </>
  );
}
