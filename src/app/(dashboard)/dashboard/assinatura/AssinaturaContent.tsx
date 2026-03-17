'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RelatorioBasePage } from '@/components/ui/RelatorioBasePage';

import { ManagePaymentModal } from '@/components/ui/Assinatura/ManagePaymentModal';
import {
  PlanBenefitsModal,
  PlanBenefitsSummaryCard,
} from '@/components/ui/Assinatura/PlanBenefitsCard';

import { UpgradeSheet } from '@/components/ui/Upgradesheet';
import { useToast } from '@/hooks/useToast';
import { reactivateSubscription } from '@/core/services/asaas';
import {
  CANCEL_REASONS,
  CancelSubscriptionModal,
} from './CancelSubscriptionModal';
import type { CancelReason } from './CancelSubscriptionModal';
import type { AssinaturaPageData } from './page';
import {
  PLANS_BY_SEGMENT,
  PERMISSIONS_BY_PLAN,
  getPlanBenefits,
  type PlanKey,
} from '@/core/config/plans';
import type { UpgradeRequest } from '@/core/types/billing';
import {
  Calendar,
  Package,
  CreditCard,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Crown,
  Settings,
} from 'lucide-react';

import {
  findNextPlanKeyWithFeature,
  getNextPlanKey,
} from '@/core/config/plans';
import { UpgradeUpsellCard } from '@/components/ui/Assinatura/UpgradeUpsellCard';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import { UpgradeRequestNotesSheet } from './UpgradeRequestNotesSheet';

// ─── Constantes ───────────────────────────────────────────────────────────────

const SEGMENT = 'PHOTOGRAPHER' as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function planDisplayName(planKey: string): string {
  const segmentPlans = PLANS_BY_SEGMENT[SEGMENT] as Record<
    string,
    { name: string }
  >;
  return segmentPlans?.[planKey]?.name ?? planKey;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Aguardando Pagamento',
    processing: 'Processando',
    approved: 'Aprovado',
    pending_cancellation: 'Cancelamento Agendado',
    pending_downgrade: 'Downgrade Agendado',
    rejected: 'Rejeitado',
    cancelled: 'Cancelado',
    free: 'Gratuito',
    active: 'Ativo',
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    EXPIRED: 'Expirado',
    OVERDUE: 'Atrasado',
    PENDING_CANCELLATION: 'Cancelamento Agendado',
    FREE: 'Gratuito',
  };
  return map[status] ?? map[status?.toUpperCase()] ?? status ?? '—';
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

function parseDueDateFromNotes(
  notes: string | null | undefined,
): string | null {
  if (!notes?.trim()) return null;
  const match = notes.match(/Nova data de vencimento:\s*([^\s.]+)/i);
  if (!match?.[1]) return null;
  const date = new Date(match[1].trim());
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function getRequestExpiresAt(item: UpgradeRequest): string | null {
  const fromNotes = parseDueDateFromNotes(item.notes);
  if (fromNotes) return fromNotes;
  if (!item.processed_at) return null;
  const d = new Date(item.processed_at);
  d.setMonth(d.getMonth() + billingPeriodToMonths(item.billing_period));
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatNotesDisplay(notes: string | null | undefined): string {
  if (!notes?.trim()) return '';

  const lowerNotes = notes.toLowerCase();

  if (lowerNotes.includes('aproveitamento de crédito')) {
    return 'Upgrade com crédito aproveitado';
  }
  if (lowerNotes.includes('upgrade gratuito')) {
    return 'Upgrade gratuito';
  }

  const paymentLines = notes
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('[PaymentMethodChange '));

  if (paymentLines.length) {
    const lastLine = paymentLines[paymentLines.length - 1];
    const match = lastLine.match(/\] (.*)/);
    if (match?.[1]) {
      return `Alterado para ${match[1]
        .replace('->', 'para')
        .replace(/_/g, ' ')
        .toLowerCase()}`;
    }
    return 'Ver detalhes';
  }
  if (notes.includes('Cancelamento solicitado')) return 'Cancelamento solicitado';

  return 'Detalhes da operação';
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
    activeSubscriptionId,
    latestRequestStatus,
  } = data;

  const planKey = (profile.plan_key || 'FREE') as PlanKey;
  const permissions = PERMISSIONS_BY_PLAN[planKey];
  const photoCreditsLimit = permissions.photoCredits ?? 0;
  const photoCreditsUsed = poolStats.totalPhotosUsed ?? 0;

  const expiresAt =
    expiresAtFromData != null
      ? new Date(expiresAtFromData).toLocaleDateString('pt-BR', {
          timeZone: 'UTC',
        })
      : profile.plan_trial_expires
        ? new Date(profile.plan_trial_expires).toLocaleDateString('pt-BR', {
            timeZone: 'UTC',
          })
        : null;

  const hasRecurringSubscription = !!activeSubscriptionId;
  const hasNextPlan = !!getNextPlanKey(planKey);
  const hasPendingCancellation =
    latestRequestStatus === 'pending_cancellation' ||
    latestRequestStatus === 'pending_downgrade';

  const planBenefits = useMemo(
    () => getPlanBenefits(permissions, { items: 'galerias' }),
    [permissions],
  );

  const latestApprovedRequest = history.find((r) => r.status === 'approved');
  const cancelProcessedAt = latestApprovedRequest?.processed_at ?? null;
  const latestApprovedId = latestApprovedRequest?.id ?? null;

  // ─── Estado dos modais ────────────────────────────────────────────────────

  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [showManagePayment, setShowManagePayment] = useState(false);
  const [upgradeSheetOpen, setUpgradeSheetOpen] = useState(false);
  const [upgradeSheetInitialPlan, setUpgradeSheetInitialPlan] = useState<
    PlanKey | undefined
  >();
  const [notesSheetRequest, setNotesSheetRequest] = useState<UpgradeRequest | null>(
    null,
  );

  const { showToast, ToastElement } = useToast();

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleUpgrade = (targetPlanKey: PlanKey) => {
    router.refresh();
    setUpgradeSheetInitialPlan(targetPlanKey);
    setUpgradeSheetOpen(true);
  };

  const handleCancelSubscription = async (
    reason: CancelReason,
    comment: string,
  ) => {
    setCancelLoading(true);
    try {
      const res = await fetch('/api/dashboard/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, comment }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCancelModal(false);
        router.refresh();
        if (json.type === 'refund_immediate') {
          showToast(
            'Assinatura cancelada. O estorno será processado em até 48h.',
            'success',
          );
        } else if (json.access_ends_at) {
          showToast(
            `Cancelamento agendado. Seu acesso segue até ${new Date(
              json.access_ends_at,
            ).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`,
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

  const handleReactivateSubscription = async () => {
    if (!activeSubscriptionId) return;
    setReactivateLoading(true);
    try {
      const result = await reactivateSubscription(activeSubscriptionId);
      if (result.success) {
        setShowCancelModal(false);
        router.refresh();
        showToast('Assinatura reativada com sucesso.', 'success');
      } else {
        showToast(result.error ?? 'Erro ao reativar.', 'error');
      }
    } catch {
      showToast('Erro ao reativar assinatura.', 'error');
    } finally {
      setReactivateLoading(false);
    }
  };

  // ─── Colunas da tabela ────────────────────────────────────────────────────

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
          })}
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
      accessor: (item) => {
        const isLatestApproved =
          planKey !== 'FREE' &&
          item.status === 'approved' &&
          item.id === latestApprovedId;
        if (isLatestApproved) {
          return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
              Vigente
            </span>
          );
        }
        if (item.status === 'approved') {
          return (
            <span className="text-[11px] font-medium text-slate-600">
              {statusLabel(item.status)} (Ciclo Encerrado)
            </span>
          );
        }
        return (
          <span className="text-[11px] font-medium">
            {statusLabel(item.status)}
          </span>
        );
      },
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
      accessor: (item) => {
        const text = formatNotesDisplay(item.notes);
        if (!text)
          return <span className="text-slate-600 text-[11px]">—</span>;

        return (
          <div className="flex flex-col items-start">
            <span className="text-[11px] text-slate-600 max-w-[240px] block truncate">
              {text}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNotesSheetRequest(item);
              }}
              className="text-left text-[10px] text-gold font-semibold hover:underline"
              title="Ver detalhes"
            >
              Ver detalhes
            </button>
          </div>
        );
      },
      width: 'w-56',
    },
    {
      header: 'Ação',
      accessor: (item) => {
        const isPaidOrCancelled =
          item.status === 'approved' ||
          item.status === 'cancelled' ||
          item.status === 'pending_cancellation' ||
          item.status === 'rejected';
        const url = isPaidOrCancelled
          ? `/api/dashboard/payment-invoice-url?requestId=${encodeURIComponent(item.id)}`
          : item.payment_url?.startsWith('http')
            ? item.payment_url
            : null;
        if (!url) return <span className="text-slate-600 text-[11px]">—</span>;
        const actionLabel =
          item.status === 'pending'
            ? 'Abrir pagamento'
            : item.status === 'approved'
              ? 'Comprovante de pagamento'
              : isPaidOrCancelled
                ? 'Comprovante de cancelamento'
                : 'Ver pagamento';
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gold hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {actionLabel}
            <ExternalLink size={12} />
          </a>
        );
      },
      icon: ExternalLink,
      width: 'w-40',
    },
  ];

  // ─── Header ───────────────────────────────────────────────────────────────

  const headerContent = (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gold/80 mb-0.5">
          Minha assinatura
        </span>
        <h2 className="text-[15px] font-semibold uppercase text-petroleum leading-tight">
          Plano {planDisplayName(planKey)}
          {profile.is_trial && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-[10px] font-semibold text-gold align-middle">
              Teste Grátis
            </span>
          )}
        </h2>
      </div>
      {planKey !== 'FREE' &&
        (hasPendingCancellation ? (
          <button
            type="button"
            onClick={handleReactivateSubscription}
            disabled={!activeSubscriptionId || reactivateLoading}
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors shrink-0 disabled:opacity-50"
          >
            {reactivateLoading ? (
              <>
                <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                Reativando…
              </>
            ) : (
              <>
                <CheckCircle2 size={11} /> Reativar assinatura
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-400 hover:text-red-600 transition-colors shrink-0"
          >
            <AlertTriangle size={11} />
            Cancelar assinatura
          </button>
        ))}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <RelatorioBasePage
        title="Minha assinatura"
        onBack={() => router.push('/dashboard')}
        footerStatusText={`Plano ${planDisplayName(planKey)}`}
        headerContent={headerContent}
      >
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-4">
          <aside className="w-full lg:w-[300px] space-y-3 shrink-0">
            {/* Resumo do plano */}
            <div className="p-3 bg-white rounded-luxury border border-slate-200 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                <Crown size={14} className="text-gold shrink-0" />
                <div>
                  <p className="text-[9px] uppercase font-semibold text-slate-600 leading-tight">
                    Plano
                  </p>
                  <p className="text-[10px] font-semibold text-petroleum">
                    {planDisplayName(planKey)}
                  </p>
                </div>
              </div>
              {planKey !== 'FREE' && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gold shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-semibold text-slate-600 leading-tight mb-0.5">
                      {hasRecurringSubscription
                        ? 'Próxima cobrança'
                        : 'Expira em'}
                    </p>
                    <p className="text-[10px] font-semibold text-petroleum">
                      {expiresAt ?? '—'}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                <BadgeCheck
                  size={14}
                  className={
                    subscriptionStatus === 'OVERDUE'
                      ? 'text-red-500'
                      : 'text-gold'
                  }
                />
                <div>
                  <p className="text-[9px] uppercase font-semibold text-slate-600 leading-tight mb-0.5">
                    Status Atual
                  </p>
                  <p
                    className={`text-[10px] font-semibold ${
                      subscriptionStatus === 'OVERDUE'
                        ? 'text-red-600 animate-pulse'
                        : 'text-petroleum'
                    }`}
                  >
                    {statusLabel(subscriptionStatus)}
                  </p>
                </div>
              </div>
              {planKey !== 'FREE' && (
                <div className="flex items-center gap-2">
                  <Banknote size={14} className="text-gold shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-semibold text-slate-600 leading-tight">
                      Última cobrança
                    </p>
                    <p className="text-[10px] font-semibold text-petroleum">
                      {lastChargeAmount != null
                        ? formatBRL(lastChargeAmount)
                        : '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {planKey !== 'FREE' && activeSubscriptionId && (
              <button
                type="button"
                onClick={() => setShowManagePayment(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-luxury border border-slate-200 bg-white text-[10px] font-semibold uppercase tracking-wider text-petroleum/80 hover:text-petroleum hover:border-petroleum/30 transition-colors"
              >
                <Settings size={14} className="shrink-0" />
                Gerenciar pagamento
              </button>
            )}

            <PlanBenefitsSummaryCard
              planKey={planKey}
              planBenefits={planBenefits}
              photoCreditsUsed={photoCreditsUsed}
              photoCreditsLimit={photoCreditsLimit}
              activeGalleryCount={poolStats.activeGalleryCount ?? 0}
              maxGalleriesHardCap={permissions.maxGalleriesHardCap ?? 0}
              onClick={() => setShowBenefitsModal(true)}
            />

            <UpgradeUpsellCard
              currentPlanKey={planKey}
              onUpgrade={handleUpgrade}
            />

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
                    Alterar plano <ArrowRight size={10} />
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

      {/* Modais */}
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

      <ManagePaymentModal
        isOpen={showManagePayment}
        onClose={() => setShowManagePayment(false)}
        activeSubscriptionId={activeSubscriptionId ?? ''}
        profileFullName={profile.full_name}
        profileEmail={profile.email}
        profilePhone={profile.phone_contact}
        onSuccess={() => router.refresh()}
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

      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        processedAt={cancelProcessedAt}
        accessEndsAt={expiresAtFromData}
        planName={planDisplayName(planKey)}
        isLoading={cancelLoading}
        freeMaxGalleries={PERMISSIONS_BY_PLAN['FREE'].maxGalleriesHardCap ?? 3}
        freePhotoCredits={PERMISSIONS_BY_PLAN['FREE'].photoCredits ?? 500}
        premiumFeatureLabels={getPlanBenefits(permissions, {
          items: 'galerias',
        })
          .filter((b) => b.isPremium)
          .map((b) => b.label)
          .slice(0, 5)}
      />

      <UpgradeRequestNotesSheet
        request={notesSheetRequest}
        onClose={() => setNotesSheetRequest(null)}
      />

      {ToastElement}
    </>
  );
}
