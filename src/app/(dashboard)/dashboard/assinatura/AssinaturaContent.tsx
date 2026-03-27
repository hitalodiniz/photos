'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RelatorioBasePage } from '@/components/ui/RelatorioBasePage';

import { ManagePaymentSheet } from '@/components/ui/Assinatura/ManagePaymentSheet';
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
import {
  BILLING_DISPLAY_TIMEZONE,
  formatDateOnlyPtBrBilling,
  formatDateTimePtBrBilling,
} from '@/core/utils/data-helpers';
import { notesIndicateProRataOrCreditUpgrade } from '@/core/services/asaas/utils/formatters';
import { billingNotesDisplayText } from '@/core/services/asaas/utils/billing-notes-doc';
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
    pending_change: 'Alteração de plano agendada',
    rejected: 'Pagamento rejeitado',
    cancelled: 'Cancelado',
    free: 'Gratuito',
    active: 'Ativo',
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    EXPIRED: 'Expirado',
    OVERDUE: 'Atrasado',
    PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: 'Pagamento rejeitado',
    renewed: 'Renovado',
    RENEWED: 'Renovado',
    PENDING_CANCELLATION: 'Cancelamento Agendado',
    FREE: 'Gratuito',
    /** Status de cobrança Asaas espelhado em `asaas_raw_status` — exibir como assinatura ativa. */
    RECEIVED: 'Ativo',
    CONFIRMED: 'Ativo',
    RECEIVED_IN_CASH: 'Ativo',
  };
  return map[status] ?? map[status?.toUpperCase()] ?? status ?? '—';
}

function isRenewedStatus(status: unknown): boolean {
  return String(status ?? '').toUpperCase() === 'RENEWED';
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function billingPeriodLabel(period: string | null | undefined): string {
  const map: Record<string, string> = {
    monthly: 'Mensal',
    semiannual: 'Semestral',
    annual: 'Anual',
  };
  return map[String(period ?? '').toLowerCase()] ?? 'Mensal';
}

function billingPeriodToMonths(period: string | null | undefined): number {
  if (period === 'semiannual') return 6;
  if (period === 'annual') return 12;
  return 1;
}

function parseDueDateFromNotes(notes: string | null | undefined): Date | null {
  const text = billingNotesDisplayText(notes);
  if (!text.trim()) return null;
  const match = text.match(/Nova data de vencimento:\s*([^\s.]+)/i);
  if (!match?.[1]) return null;
  const date = new Date(match[1].trim());
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseEndDateFromNotes(notes: string | null | undefined): Date | null {
  const text = billingNotesDisplayText(notes);
  if (!text.trim()) return null;
  const patterns = [
    /encerrad[oa]\s+em:\s*([^\s.]+)/i,
    /acesso\s+até\s*([^\s.]+)/i,
    /expirou\s+em\s*([^\s.]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const date = new Date(match[1].trim());
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function parseNextDueDateFromNotes(
  notes: string | null | undefined,
): Date | null {
  const text = billingNotesDisplayText(notes);
  if (!text.trim()) return null;
  const match = text.match(/nextDueDate\s+([^\s.]+)/i);
  if (!match?.[1]) return null;
  const date = new Date(match[1].trim());
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Trilha adicionada em `reactivateSubscription` — linha pode seguir `cancelled` mas assinatura voltou ao Asaas. */
function notesIndicateSubscriptionReactivation(
  notes: string | null | undefined,
): boolean {
  const n = billingNotesDisplayText(notes);
  return /\[Reactivation\b/i.test(n) || /\bAssinatura reativada\b/i.test(n);
}

function formatAsaasYmdDate(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function calculateNextBillingDate(item: UpgradeRequest): Date | null {
  const fromNotes = parseDueDateFromNotes(item.notes);
  if (fromNotes) return fromNotes;

  const anchorDate = item.processed_at ?? item.created_at;
  if (!anchorDate) return null;
  const d = new Date(anchorDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + billingPeriodToMonths(item.billing_period));
  return d;
}

function getRequestExpiresAt(
  item: UpgradeRequest,
  opts?: { preferEndDate?: boolean },
): string | null {
  // Após reativação, "Acesso até …" do cancelamento fica nas notes mas não é mais a referência.
  if (
    opts?.preferEndDate &&
    !notesIndicateSubscriptionReactivation(item.notes)
  ) {
    const endDate = parseEndDateFromNotes(item.notes);
    if (endDate)
      return endDate.toLocaleDateString('pt-BR', {
        timeZone: BILLING_DISPLAY_TIMEZONE,
      });
  }
  const nextBillingDate = calculateNextBillingDate(item);
  if (!nextBillingDate) return null;
  return nextBillingDate.toLocaleDateString('pt-BR', {
    timeZone: BILLING_DISPLAY_TIMEZONE,
  });
}

function getBillingDateMeta(
  item: UpgradeRequest,
  opts?: {
    isCurrentVigenteWithScheduledChange?: boolean;
    isClosedCycle?: boolean;
    asaasNextDueDate?: string | null;
    asaasEndDate?: string | null;
  },
): {
  label: 'Próxima cobrança' | 'Vencimento' | 'Cancelamento';
  date: string | null;
} {
  const asaasNextDueDate = formatAsaasYmdDate(opts?.asaasNextDueDate);
  const asaasEndDate = formatAsaasYmdDate(opts?.asaasEndDate);
  const reactivated = notesIndicateSubscriptionReactivation(item.notes);

  // Reativação: `reactivateSubscription` grava [Reactivation] só na linha vigente daquela
  // assinatura Asaas; aqui ainda tratamos linha que segue cancelled/pending mas já reativou no gateway.
  if (
    reactivated &&
    (item.status === 'cancelled' ||
      item.status === 'pending_downgrade' ||
      item.status === 'pending_cancellation')
  ) {
    return {
      label: 'Vencimento',
      date:
        (opts?.isClosedCycle ? asaasEndDate : asaasNextDueDate) ??
        (opts?.isClosedCycle ? asaasNextDueDate : null) ??
        getRequestExpiresAt(item, { preferEndDate: opts?.isClosedCycle }),
    };
  }

  if (item.status === 'pending_downgrade') {
    return {
      label: 'Cancelamento',
      date:
        asaasEndDate ??
        asaasNextDueDate ??
        getRequestExpiresAt(item, { preferEndDate: true }) ??
        getRequestExpiresAt(item),
    };
  }

  // Status final: assinatura encerrada, sem próxima cobrança.
  if (item.status === 'cancelled') {
    return {
      label: 'Cancelamento',
      date:
        (item.processed_at
          ? new Date(item.processed_at).toLocaleDateString('pt-BR', {
              timeZone: BILLING_DISPLAY_TIMEZONE,
            })
          : null) ??
        asaasEndDate ??
        getRequestExpiresAt(item, { preferEndDate: true }) ??
        getRequestExpiresAt(item),
    };
  }

  if (item.status === 'pending_change') {
    // Fonte da verdade: Asaas nextDueDate da assinatura agendada.
    if (asaasNextDueDate)
      return { label: 'Próxima cobrança', date: asaasNextDueDate };

    // Fallbacks de segurança em caso de indisponibilidade do Asaas.
    const fromNotes = parseNextDueDateFromNotes(item.notes);
    const date = fromNotes
      ? fromNotes.toLocaleDateString('pt-BR', {
          timeZone: BILLING_DISPLAY_TIMEZONE,
        })
      : getPlanStartAt(item);
    return { label: 'Próxima cobrança', date };
  }

  if (opts?.isCurrentVigenteWithScheduledChange) {
    return {
      label: 'Vencimento',
      date: asaasEndDate ?? asaasNextDueDate ?? getRequestExpiresAt(item),
    };
  }
  if (item.status === 'approved' || isRenewedStatus(item.status)) {
    return {
      label: 'Vencimento',
      date:
        (opts?.isClosedCycle ? asaasEndDate : asaasNextDueDate) ??
        (opts?.isClosedCycle ? asaasNextDueDate : null) ??
        getRequestExpiresAt(item, { preferEndDate: opts?.isClosedCycle }),
    };
  }
  const isOpenPayment =
    item.status === 'pending' || item.status === 'processing';
  return {
    label: isOpenPayment ? 'Vencimento' : 'Próxima cobrança',
    date: asaasNextDueDate ?? getRequestExpiresAt(item),
  };
}

function getPlanStartAt(item: UpgradeRequest): string | null {
  const source = item.processed_at ?? item.created_at;
  if (!source) return null;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', {
    timeZone: BILLING_DISPLAY_TIMEZONE,
  });
}

/** Cancelado / rejeitado: linha encerrada para efeito de “vigente”. */
function isTerminalHistoryStatus(status: string): boolean {
  return status === 'cancelled' || status === 'rejected';
}

/** Solicitações ainda não pagas nunca devem ser marcadas como plano vigente. */
function isAwaitingPaymentHistoryStatus(item: UpgradeRequest): boolean {
  const domainStatus = String(item.status ?? '').toLowerCase();
  if (domainStatus === 'pending' || domainStatus === 'processing') return true;

  const rawStatus = String(item.asaas_raw_status ?? '').toUpperCase();
  return rawStatus === 'PENDING';
}

/**
 * Linha ainda dá acesso ou representa assinatura atual? Se expirada/vencida/atrasada,
 * o “vigente” passa para o próximo registro mais antigo na ordenação.
 */
function isHistoryRowExpiredOrOverdue(
  item: UpgradeRequest,
  asaasDates?: { endDate?: string | null; nextDueDate?: string | null },
): boolean {
  const raw = String(item.asaas_raw_status ?? '').toUpperCase();
  if (raw === 'EXPIRED' || raw === 'OVERDUE') return true;

  const now = Date.now();

  if (
    item.status === 'pending_downgrade' ||
    item.status === 'pending_cancellation'
  ) {
    const endSrc =
      item.scheduled_cancel_at?.trim() ||
      (asaasDates?.endDate ? `${asaasDates.endDate}T12:00:00.000Z` : '');
    if (endSrc) {
      const d = new Date(endSrc);
      if (!Number.isNaN(d.getTime()) && d.getTime() < now) return true;
    }
    return false;
  }

  if (item.status === 'approved' || isRenewedStatus(item.status)) {
    if (asaasDates?.endDate) {
      const d = new Date(`${asaasDates.endDate}T23:59:59.999Z`);
      if (!Number.isNaN(d.getTime()) && d.getTime() < now) return true;
    }
    const calcEnd = calculateNextBillingDate(item);
    if (calcEnd && calcEnd.getTime() < now) {
      if (asaasDates?.nextDueDate) {
        const nd = new Date(`${asaasDates.nextDueDate}T23:59:59.999Z`);
        if (!Number.isNaN(nd.getTime()) && nd.getTime() >= now) return false;
      }
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Plano vigente na tabela: o registro mais recente (`created_at` DESC) que não está
 * cancelado/rejeitado e ainda não está expirado, vencido ou em atraso — inclui
 * `pending_downgrade` e `pending_cancellation` enquanto o acesso não acabou.
 */
function resolveVigenteHistoryRequest(
  sortedHistory: UpgradeRequest[],
  asaasDatesBySubscriptionId: AssinaturaPageData['asaasDatesBySubscriptionId'],
): UpgradeRequest | null {
  for (const row of sortedHistory) {
    if (isTerminalHistoryStatus(row.status)) continue;
    if (isAwaitingPaymentHistoryStatus(row)) continue;
    const subId = row.asaas_subscription_id?.trim() ?? '';
    const asaasDates = subId ? asaasDatesBySubscriptionId[subId] : undefined;
    if (isHistoryRowExpiredOrOverdue(row, asaasDates)) continue;
    return row;
  }
  return null;
}

function formatNotesDisplay(notes: string | null | undefined): string {
  const text = billingNotesDisplayText(notes);
  if (!text.trim()) return '';

  const lowerNotes = text.toLowerCase();

  // Cancelamento × reativação: vários ciclos no mesmo log — vale o evento mais recente.
  const posReactivation = Math.max(
    text.lastIndexOf('[Reactivation'),
    text.lastIndexOf('Assinatura reativada'),
  );
  const posCancelSolicitado = text.lastIndexOf('Cancelamento solicitado');
  if (posCancelSolicitado > posReactivation) {
    const tail = text.slice(posCancelSolicitado);
    const refundTail = tail.match(/Estorno:\s*SIM\s*\(([^)]+)\)/i)?.[1];
    if (refundTail) {
      return `Cancelamento com estorno (${refundTail})`;
    }
    if (/Estorno:\s*SIM/i.test(tail)) {
      return 'Cancelamento com estorno';
    }
    if (/Estorno:\s*NÃO/i.test(tail) || /Estorno:\s*NAO/i.test(tail)) {
      return 'Cancelamento sem estorno';
    }
    return 'Cancelamento solicitado';
  }
  if (posReactivation >= 0) {
    return 'Assinatura reativada';
  }

  // Cancelamento: tenta exibir o resumo de estorno (com valor quando houver).
  const refundWithAmount = text.match(/Estorno:\s*SIM\s*\(([^)]+)\)/i)?.[1];
  if (refundWithAmount) {
    return `Cancelamento com estorno (${refundWithAmount})`;
  }
  if (/Estorno:\s*SIM/i.test(text)) {
    return 'Cancelamento com estorno';
  }
  if (/Estorno:\s*NÃO/i.test(text) || /Estorno:\s*NAO/i.test(text)) {
    return 'Cancelamento sem estorno';
  }

  // Cancelamento automático por inadimplência (cron), exibindo prazo aplicado quando disponível.
  const autoCancelNoPaymentMatch = text.match(
    /Cancelamento automático por falta de pagamento no prazo\s*\(([^)]+)\)/i,
  );
  if (autoCancelNoPaymentMatch?.[1]) {
    return `Cancelamento automático por falta de pagamento (${autoCancelNoPaymentMatch[1]})`;
  }
  if (/Cancelamento automático por falta de pagamento no prazo/i.test(text)) {
    return 'Cancelamento automático por falta de pagamento';
  }

  // Nova regra para identificar renovações do histórico simulado
  if (
    lowerNotes.includes('renovação mensal') ||
    lowerNotes.includes('renovação automática')
  ) {
    return 'Renovação Mensal';
  }
  if (lowerNotes.includes('aproveitamento de crédito')) {
    return 'Upgrade com crédito aproveitado';
  }
  if (lowerNotes.includes('upgrade gratuito')) {
    return 'Upgrade gratuito';
  }

  const paymentLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('[PaymentMethodChange '));

  if (paymentLines.length) {
    const lastLine = paymentLines[paymentLines.length - 1];
    const match = lastLine.match(/\] (.*)/);
    if (match?.[1]) {
      return `Forma de pagamento alterada de ${match[1]
        .replace('->', 'para')
        .replace(/_/g, ' ')
        .toLowerCase()}`;
    }
    return '';
  }

  if (text.includes('Cancelamento solicitado'))
    return 'Cancelamento solicitado';

  // Sem padrão conhecido: não força texto genérico; mostra apenas "Ver detalhes".
  return '';
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
    asaasDatesBySubscriptionId,
  } = data;
  const sortedHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [history],
  );
  const vigenteHistoryRequest = useMemo(
    () =>
      resolveVigenteHistoryRequest(sortedHistory, asaasDatesBySubscriptionId),
    [sortedHistory, asaasDatesBySubscriptionId],
  );
  const vigenteHistoryId = vigenteHistoryRequest?.id ?? null;
  const [localCancellationEndsAt, setLocalCancellationEndsAt] = useState<
    string | null
  >(null);

  const planKey = (profile.plan_key || 'FREE') as PlanKey;
  const permissions = PERMISSIONS_BY_PLAN[planKey];
  const photoCreditsLimit = permissions.photoCredits ?? 0;
  const photoCreditsUsed = poolStats.totalPhotosUsed ?? 0;

  const expiresAt =
    expiresAtFromData != null
      ? formatDateOnlyPtBrBilling(expiresAtFromData)
      : profile.plan_trial_expires
        ? formatDateOnlyPtBrBilling(profile.plan_trial_expires)
        : null;

  const hasRecurringSubscription = !!activeSubscriptionId;
  const hasScheduledChange = latestRequestStatus === 'pending_change';
  const hasNextPlan = !!getNextPlanKey(planKey);
  const latestApprovedRequest = sortedHistory.find(
    (r) => r.status === 'approved' || isRenewedStatus(r.status),
  );
  const latestPendingRequest = sortedHistory.find(
    (r) =>
      r.status === 'pending' ||
      r.status === 'processing' ||
      r.status === 'rejected',
  );
  /** Mais recente com cancelamento/downgrade agendado (não filtrar por effectiveSubscriptionId). */
  const latestPendingCancelRow = sortedHistory.find(
    (r) =>
      r.status === 'pending_cancellation' || r.status === 'pending_downgrade',
  );
  const fallbackSubscriptionId =
    sortedHistory
      .find((r) => (r.asaas_subscription_id?.trim() ?? '').length > 0)
      ?.asaas_subscription_id?.trim() ?? null;

  const effectiveSubscriptionId =
    activeSubscriptionId ??
    (latestApprovedRequest?.asaas_subscription_id?.trim() || null) ??
    fallbackSubscriptionId;

  const approvedSubForReactivate =
    latestApprovedRequest?.asaas_subscription_id?.trim() ?? '';

  const pendingSubForReactivate =
    latestPendingCancelRow?.asaas_subscription_id?.trim() ?? '';

  const reactivationSubscriptionId =
    approvedSubForReactivate &&
    pendingSubForReactivate &&
    approvedSubForReactivate !== pendingSubForReactivate
      ? approvedSubForReactivate
      : pendingSubForReactivate ||
        approvedSubForReactivate ||
        effectiveSubscriptionId;

  const pendingCancellationRequest = sortedHistory.find((r) => {
    const isPendingCancelStatus =
      r.status === 'pending_cancellation' || r.status === 'pending_downgrade';
    if (!isPendingCancelStatus) return false;
    if (!effectiveSubscriptionId) return true;
    const requestSubId = r.asaas_subscription_id?.trim() ?? '';
    // Quando a linha pendente não traz asaas_subscription_id, ainda consideramos válida.
    if (!requestSubId) return true;
    return requestSubId === effectiveSubscriptionId;
  });

  const hasPendingCancellation =
    !!pendingCancellationRequest || !!localCancellationEndsAt;

  const hasFutureAccess =
    expiresAtFromData != null &&
    !Number.isNaN(new Date(expiresAtFromData).getTime()) &&
    new Date(expiresAtFromData).getTime() > Date.now();

  const hasCancelledRecordForActiveSub = sortedHistory.some(
    (r) =>
      r.status === 'cancelled' &&
      !!effectiveSubscriptionId &&
      (r.asaas_subscription_id?.trim() ?? '') === effectiveSubscriptionId,
  );

  const hasNoPaymentCancellationForActiveSub = sortedHistory.some((r) => {
    const sameSubscription =
      !!effectiveSubscriptionId &&
      (r.asaas_subscription_id?.trim() ?? '') === effectiveSubscriptionId;
    if (!sameSubscription) return false;
    if (r.status !== 'cancelled') return false;
    return /cancelamento automático por falta de pagamento no prazo/i.test(
      r.notes ?? '',
    );
  });

  const canReactivateSubscription =
    !!reactivationSubscriptionId &&
    !hasNoPaymentCancellationForActiveSub &&
    (hasPendingCancellation ||
      (hasFutureAccess && hasCancelledRecordForActiveSub));

  const hasVigenteSubscriptionInRequests = vigenteHistoryId != null;

  const hasAnyAwaitingPaymentRecord = sortedHistory.some(
    isAwaitingPaymentHistoryStatus,
  );

  const cancellationEndsAt =
    localCancellationEndsAt ??
    formatDateOnlyPtBrBilling(
      pendingCancellationRequest?.scheduled_cancel_at ?? null,
    ) ??
    formatDateOnlyPtBrBilling(
      pendingCancellationRequest?.processed_at ?? null,
    ) ??
    expiresAt;

  const planBenefits = useMemo(
    () => getPlanBenefits(permissions, { items: 'galerias' }),
    [permissions],
  );

  const cancelProcessedAt = latestApprovedRequest?.processed_at ?? null;
  const cancelCreatedAt = latestApprovedRequest?.created_at ?? null;
  /**
   * Direito de arrependimento (Art. 49 CDC):
   * - Dentro de 7 dias da contratação
   * - Com desembolso real (amount_final > 0)
   * - NÃO foi upgrade com crédito pro-rata em qualquer linha da mesma assinatura Asaas
   *   (a linha mais recente pode ser só “Renovação” sem citar o pro-rata da contratação).
   */
  const hasRefundRight = (() => {
    if (!latestApprovedRequest) return false;
    // Regra de negócio: renovação (`renewed`) nunca entra em estorno de arrependimento.
    if (isRenewedStatus(latestApprovedRequest.status)) return false;

    const reference =
      latestApprovedRequest.processed_at ?? latestApprovedRequest.created_at;
    if (!reference) return false;

    const withinWindow =
      Date.now() - new Date(reference).getTime() < 7 * 24 * 60 * 60 * 1000;
    if (!withinWindow) return false;

    const hasPaid =
      typeof latestApprovedRequest.amount_final === 'number' &&
      latestApprovedRequest.amount_final > 0;
    if (!hasPaid) return false;

    const subId = (
      latestApprovedRequest.asaas_subscription_id ??
      effectiveSubscriptionId ??
      ''
    ).trim();
    let subscriptionHadProRataOrCredit = notesIndicateProRataOrCreditUpgrade(
      latestApprovedRequest.notes,
    );
    if (!subscriptionHadProRataOrCredit && subId) {
      subscriptionHadProRataOrCredit = sortedHistory.some(
        (r) =>
          (r.asaas_subscription_id?.trim() ?? '') === subId &&
          notesIndicateProRataOrCreditUpgrade(r.notes),
      );
    }
    if (subscriptionHadProRataOrCredit) return false;

    return true;
  })();
  const vigenteSubscriptionStatus = ((): string => {
    if (hasScheduledChange && latestApprovedRequest) {
      return (latestApprovedRequest.asaas_raw_status ??
        latestApprovedRequest.status) as string;
    }
    const row = vigenteHistoryRequest;
    if (!row) return subscriptionStatus;

    /** Status de domínio da linha vigente tem precedência sobre último status de pagamento Asaas. */
    const domain = row.status;
    if (
      domain === 'pending_downgrade' ||
      domain === 'pending_cancellation' ||
      domain === 'pending_change' ||
      domain === 'pending' ||
      domain === 'processing' ||
      domain === 'rejected' ||
      domain === 'cancelled'
    ) {
      return domain;
    }

    const raw = row.asaas_raw_status?.trim();
    if (raw) return raw;
    return row.status ?? subscriptionStatus;
  })();
  const vigenteSubscriptionStatusUpper = String(
    vigenteSubscriptionStatus ?? '',
  ).toUpperCase();

  // ─── Estado dos modais ────────────────────────────────────────────────────

  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [showManagePayment, setShowManagePayment] = useState(false);
  const [managePaymentTarget, setManagePaymentTarget] =
    useState<UpgradeRequest | null>(null);
  const [upgradeSheetOpen, setUpgradeSheetOpen] = useState(false);
  const [upgradeSheetInitialPlan, setUpgradeSheetInitialPlan] = useState<
    PlanKey | undefined
  >();
  const [notesSheetRequest, setNotesSheetRequest] =
    useState<UpgradeRequest | null>(null);

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
        body: JSON.stringify({
          reason,
          comment,
          allowImmediateRefund: hasRefundRight,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCancelModal(false);
        if (json.type === 'refund_immediate') {
          setLocalCancellationEndsAt(null);
        } else if (json.access_ends_at) {
          setLocalCancellationEndsAt(
            formatDateOnlyPtBrBilling(json.access_ends_at),
          );
        } else {
          setLocalCancellationEndsAt(
            formatDateOnlyPtBrBilling(
              pendingCancellationRequest?.scheduled_cancel_at ?? null,
            ),
          );
        }
        router.refresh();
        // Garantia adicional: força recarregamento da página para refletir
        // imediatamente o estado pós-cancelamento em todos os blocos da UI.
        if (typeof window !== 'undefined') {
          window.setTimeout(() => window.location.reload(), 120);
        }
        if (json.type === 'refund_immediate') {
          showToast(
            'Assinatura cancelada. O estorno será processado em até 72h.',
            'success',
          );
        } else if (json.access_ends_at) {
          showToast(
            `Cancelamento agendado. Seu acesso segue até ${formatDateOnlyPtBrBilling(json.access_ends_at) ?? '—'}.`,
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
    if (!reactivationSubscriptionId) return;
    setReactivateLoading(true);
    try {
      const result = await reactivateSubscription(reactivationSubscriptionId);
      if (result.success) {
        setShowCancelModal(false);
        setLocalCancellationEndsAt(null);
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
      header: 'Assinatura',
      accessor: (item) => (
        <span className="text-[11px] text-slate-700 whitespace-nowrap font-medium">
          {formatDateTimePtBrBilling(item.created_at)}
        </span>
      ),
      icon: Calendar,
    },
    {
      header: 'Início plano',
      accessor: (item) => (
        <span className="text-[11px] text-slate-700 whitespace-nowrap font-medium">
          {getPlanStartAt(item) ?? '—'}
        </span>
      ),
      icon: Calendar,
      width: 'w-28',
    },
    {
      header: 'Plano',
      accessor: (item) => (
        <span className="text-[11px] font-medium text-petroleum">
          {planDisplayName(item.plan_key_requested)}
        </span>
      ),
      icon: Package,
    },
    {
      header: 'Valor total',
      accessor: (item) => (
        <span className="text-[11px] font-medium">
          {formatBRL(item.amount_final)}
        </span>
      ),
      icon: CreditCard,
      align: 'right',
    },
    {
      header: 'Pagamento',
      accessor: (item) => (
        <span className="text-[10px] font-medium uppercase">
          {item.billing_type === 'CREDIT_CARD'
            ? 'Cartão de crédito'
            : item.billing_type}
        </span>
      ),
    },
    {
      header: 'Ciclo',
      accessor: (item) => (
        <span className="text-[11px] font-medium text-slate-600">
          {billingPeriodLabel(item.billing_period)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (item) => {
        const isLatestPendingRow = item.id === latestPendingRequest?.id;
        const isAwaitingLikeStatus =
          item.status === 'pending' ||
          item.status === 'processing' ||
          String(item.asaas_raw_status ?? '').toUpperCase() === 'OVERDUE';
        const isHistoricalAwaitingWithoutOpenCharge =
          !isLatestPendingRow && isAwaitingLikeStatus;
        const notesLower = billingNotesDisplayText(item.notes).toLowerCase();
        const isPaidCycle =
          item.status === 'approved' || isRenewedStatus(item.status);
        // Renovação real vem como status `renewed` ou notas do webhook ("Renovação …").
        // Não usar plan_key_requested === plan_key_current: no trial PRO → assinatura paga PRO
        // ambos os campos são iguais na primeira cobrança, mas não é renovação de ciclo.
        const isRenewalApproved =
          isPaidCycle &&
          (notesLower.includes('renovação') ||
            notesLower.includes('cobrança de renovação') ||
            isRenewedStatus(item.status));
        const isTableVigente = item.id === vigenteHistoryId;
        if (isTableVigente) {
          return (
            <div className="flex flex-col gap-0.5 min-w-24 font-medium">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-medium w-fit">
                Vigente
              </span>
              {item.status === 'pending_downgrade' && (
                <span className="text-[11px] font-medium text-slate-600">
                  {statusLabel('pending_downgrade')}
                </span>
              )}
              {item.status === 'pending_cancellation' && (
                <span className="text-[11px] font-medium text-slate-600">
                  {statusLabel('pending_cancellation')}
                </span>
              )}
              {item.status === 'pending_change' && (
                <span className="text-[11px] font-medium text-slate-600">
                  Alteração de plano agendada
                </span>
              )}
              {isLatestPendingRow &&
                (item.status === 'pending' || item.status === 'processing') && (
                  <span className="text-[11px] font-medium text-slate-600">
                    {statusLabel(item.status)}
                  </span>
                )}
              {isPaidCycle && isRenewalApproved && (
                <span className="inline-flex items-center  gap-1 px-1.5 py-0.5 rounded-md bg-champagne/30 text-petroleum-800 text-[10px] font-medium w-fit">
                  Renovação
                </span>
              )}
            </div>
          );
        }
        if (isPaidCycle) {
          if (isRenewalApproved) {
            return (
              <div className="flex flex-col gap-0.5 min-w-24 font-medium">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-champagne/30 text-petroleum-800 text-[10px] font-medium w-fit">
                  Renovação
                </span>
                <span className="text-[11px] font-medium text-slate-500 inline-flex items-center">
                  Pago
                </span>
              </div>
            );
          }
          return (
            <div className="flex flex-col gap-0.5 min-w-24 font-medium">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-champagne/30 text-petroleum-800 text-[10px] font-medium w-fit">
                Ciclo encerrado
              </span>
              <span className="text-[11px] font-medium text-slate-500 inline-flex items-center">
                Pago
              </span>
            </div>
          );
        }
        if (isHistoricalAwaitingWithoutOpenCharge) {
          return (
            <span className="text-[11px] font-medium text-slate-500">
              Ciclo encerrado
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
      header: 'Referência',
      accessor: (item) => {
        const isCurrentVigenteWithScheduledChange =
          hasScheduledChange &&
          (item.status === 'approved' || isRenewedStatus(item.status)) &&
          item.id === vigenteHistoryId;
        const isClosedCycle =
          (item.status === 'approved' || isRenewedStatus(item.status)) &&
          item.id !== vigenteHistoryId;
        const asaasSubscriptionId = item.asaas_subscription_id?.trim() ?? '';
        const asaasDates = asaasSubscriptionId
          ? asaasDatesBySubscriptionId[asaasSubscriptionId]
          : undefined;
        const { label, date } = getBillingDateMeta(item, {
          isCurrentVigenteWithScheduledChange,
          isClosedCycle,
          asaasNextDueDate: asaasDates?.nextDueDate ?? null,
          asaasEndDate: asaasDates?.endDate ?? null,
        });
        return (
          <div className="flex flex-col leading-tight font-medium">
            <span className="text-[10px] uppercase tracking-wide font-medium text-slate-500 mb-0.5">
              {label}
            </span>
            <span className="text-[11px] text-slate-700 whitespace-nowrap font-medium">
              {date ?? '—'}
            </span>
          </div>
        );
      },
      icon: Clock,
      width: 'w-36',
    },
    {
      header: 'Registros',
      accessor: (item) => {
        const text = formatNotesDisplay(item.notes);
        const hasRawNotes = Boolean(item.notes?.trim());
        if (!text && !hasRawNotes)
          return (
            <span className="text-[11px] leading-relaxed antialiased font-medium text-slate-500">
              —
            </span>
          );

        return (
          <div className="flex flex-col items-start gap-1 antialiased font-medium">
            {text && (
              // O line-clamp-3 já aplica as reticências automaticamente ao final da 3ª linha
              <span className="text-[11px] text-slate-500 max-w-[200px] line-clamp-3 overflow-hidden break-words leading-relaxed font-medium">
                {text}
              </span>
            )}

            {/* Se não houver resumo, mantém apenas o link para detalhe completo */}
            {hasRawNotes && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotesSheetRequest(item);
                }}
                className="text-left text-[11px] text-gold font-medium hover:underline mt-0.5"
                title="Ver detalhes"
              >
                Ver detalhes
              </button>
            )}
          </div>
        );
      },
      width: 'w-56',
    },
    {
      header: 'Ação',
      accessor: (item) => {
        const isLatestPendingRow = item.id === latestPendingRequest?.id;
        const billingType = String(item.billing_type ?? '').toUpperCase();
        const itemStatus = String(item.status ?? '').toLowerCase();
        const rawStatus = String(item.asaas_raw_status ?? '').toUpperCase();
        const isOverdueLike =
          itemStatus === 'overdue' || rawStatus === 'OVERDUE';
        const isPaidOrCancelled =
          itemStatus === 'approved' ||
          itemStatus === 'cancelled' ||
          itemStatus === 'renewed' ||
          itemStatus === 'pending_cancellation' ||
          itemStatus === 'pending_downgrade' ||
          itemStatus === 'rejected';
        const hasOpenPayment =
          itemStatus === 'pending' || itemStatus === 'processing';
        const isRejectedCurrentPending =
          isLatestPendingRow && itemStatus === 'rejected';
        const isRejectedCard =
          isLatestPendingRow &&
          itemStatus === 'rejected' &&
          billingType === 'CREDIT_CARD';
        const isPendingPix =
          isLatestPendingRow &&
          (hasOpenPayment || isOverdueLike) &&
          billingType === 'PIX';
        const isPendingBoleto =
          isLatestPendingRow &&
          (hasOpenPayment || isOverdueLike) &&
          billingType === 'BOLETO';
        const invoiceUrl = `/api/dashboard/payment-invoice-url?requestId=${encodeURIComponent(item.id)}`;
        const boletoUrl = `/api/dashboard/payment-boleto-url?requestId=${encodeURIComponent(item.id)}`;
        const url =
          isPendingPix || isPendingBoleto
            ? null
            : isRejectedCard
              ? null
              : hasOpenPayment
                ? item.payment_url?.startsWith('http')
                  ? item.payment_url
                  : invoiceUrl
                : isPaidOrCancelled
                  ? invoiceUrl
                  : null;
        if (
          isRejectedCurrentPending ||
          isRejectedCard ||
          isPendingPix ||
          isPendingBoleto ||
          (isLatestPendingRow &&
            (itemStatus === 'pending' ||
              itemStatus === 'processing' ||
              isOverdueLike))
        ) {
          return (
            <button
              type="button"
              className={`inline-flex h-7 items-center gap-1 rounded-md p-1 text-[9px] font-semibold uppercase tracking-wide text-petroleum transition-colors ${
                isRejectedCurrentPending || isRejectedCard
                  ? 'bg-red-400 hover:bg-red-300'
                  : 'bg-amber-500 hover:bg-amber-400'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setManagePaymentTarget(item);
                setShowManagePayment(true);
              }}
            >
              {isRejectedCurrentPending || isRejectedCard
                ? 'Regularizar pagamento'
                : 'Pagar agora'}
            </button>
          );
        }

        if (!url)
          return (
            <span className="text-slate-500 text-[11px] font-medium">—</span>
          );

        const actionLabel =
          itemStatus === 'approved' || itemStatus === 'renewed'
            ? 'Comprovante de pagamento'
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
            <ExternalLink size={14} />
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
          {profile.is_exempt && !profile.is_trial && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-600 align-middle">
              Isento
            </span>
          )}
        </h2>
        {hasPendingCancellation && cancellationEndsAt && (
          <p className="text-[10px] font-medium text-amber-700 mt-1">
            Assinatura atual será cancelada em {cancellationEndsAt}.
          </p>
        )}
      </div>
      {(hasVigenteSubscriptionInRequests || hasAnyAwaitingPaymentRecord) &&
        (canReactivateSubscription && !hasAnyAwaitingPaymentRecord ? (
          /* CONTAINER DE REATIVAÇÃO */
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gold/80">
              Assinatura interrompida
            </span>
            <button
              type="button"
              onClick={handleReactivateSubscription}
              disabled={!reactivationSubscriptionId || reactivateLoading}
              className="btn-luxury-primary h-8 "
            >
              {reactivateLoading ? (
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {reactivateLoading ? 'Processando...' : 'Reativar Plano'}
            </button>
          </div>
        ) : (
          /* BOTÃO CANCELAR COM BORDA */
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white font-semibold text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-red-900/30"
          >
            <AlertTriangle size={14} />
            {hasAnyAwaitingPaymentRecord
              ? 'Cancelar assinatura pendente de pagamento'
              : 'Cancelar assinatura'}
          </button>
        ))}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  const pendingChangeRequest = sortedHistory.find(
    (r) => r.status === 'pending_change',
  );
  /** Mais recente com cobrança efetiva (>0): inclui plano atual agendado para downgrade/cancelamento (último plano contratado). */
  const latestChargedVigenteRequest = sortedHistory.find(
    (r) =>
      (r.status === 'approved' ||
        isRenewedStatus(r.status) ||
        r.status === 'pending_downgrade' ||
        r.status === 'pending_cancellation') &&
      (r.amount_final ?? 0) > 0,
  );
  const nextCycleAmount = hasScheduledChange
    ? (pendingChangeRequest?.amount_original ??
      pendingChangeRequest?.amount_final ??
      latestApprovedRequest?.amount_original ??
      latestApprovedRequest?.amount_final ??
      latestChargedVigenteRequest?.amount_original ??
      lastChargeAmount ??
      0)
    : (latestApprovedRequest?.amount_original ??
      latestApprovedRequest?.amount_final ??
      latestChargedVigenteRequest?.amount_original ??
      lastChargeAmount ??
      0);
  const nextCycleDate = pendingChangeRequest
    ? (formatAsaasYmdDate(
        asaasDatesBySubscriptionId[
          pendingChangeRequest.asaas_subscription_id?.trim() ?? ''
        ]?.nextDueDate,
      ) ??
      getPlanStartAt(pendingChangeRequest) ??
      '—')
    : (formatAsaasYmdDate(
        asaasDatesBySubscriptionId[activeSubscriptionId?.trim() ?? '']
          ?.nextDueDate,
      ) ??
      expiresAt ??
      '—');
  /** Com downgrade/cancelamento agendado ainda há assinatura ativa, mas o card deve mostrar vencimento, não próxima cobrança. */
  const showSidebarNextCharge =
    hasRecurringSubscription && !hasScheduledChange && !hasPendingCancellation;
  const latestVigenteChargeAmount = latestChargedVigenteRequest?.amount_final;
  const currentBillingType = latestChargedVigenteRequest?.billing_type ?? null;
  const billingCycleLabel =
    currentBillingType == null
      ? 'Sem cobrança registrada'
      : currentBillingType === 'CREDIT_CARD'
        ? 'Cobrança Automática no Cartão de Crédito'
        : 'Pagamento Manual via PIX ou Boleto';

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
                <Calendar size={16} className="text-gold shrink-0" />
                <div>
                  <p className="text-[9px] uppercase font-semibold text-slate-600 leading-tight">
                    Ciclo
                  </p>
                  <p className="text-[10px] font-semibold text-petroleum">
                    {billingPeriodLabel(
                      latestChargedVigenteRequest?.billing_period,
                    )}
                  </p>
                </div>
              </div>
              {planKey !== 'FREE' && (
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gold shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-semibold text-slate-600  mb-0.5">
                      {showSidebarNextCharge ? 'Próxima cobrança' : 'Expira em'}
                    </p>
                    <p className="text-[10px] font-semibold text-petroleum">
                      {showSidebarNextCharge
                        ? nextCycleDate
                        : (cancellationEndsAt ?? expiresAt ?? '—')}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                <BadgeCheck
                  size={16}
                  className={
                    vigenteSubscriptionStatusUpper === 'OVERDUE'
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
                      vigenteSubscriptionStatusUpper === 'OVERDUE'
                        ? 'text-red-600 animate-pulse'
                        : 'text-petroleum'
                    }`}
                  >
                    {statusLabel(vigenteSubscriptionStatus)}
                  </p>
                </div>
              </div>
              {planKey !== 'FREE' && (
                <div className="flex items-center gap-2">
                  <Banknote size={16} className="text-gold shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-semibold text-slate-600 leading-tight">
                      Última cobrança
                    </p>
                    <p className="text-[10px] font-semibold text-petroleum">
                      {latestVigenteChargeAmount != null
                        ? formatBRL(latestVigenteChargeAmount)
                        : '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Card de Próximo Ciclo / Cobrança Futura ─── */}
            {planKey !== 'FREE' && showSidebarNextCharge && (
              <div className="p-3 bg-white rounded-luxury border border-slate-200 shadow-sm space-y-2 animate-in fade-in slide-in-from-left-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                    Próximo Ciclo
                  </span>
                  <BadgeCheck size={12} className="text-gold" />
                </div>

                <div className="flex flex-col">
                  <p className="text-[14px] font-semibold text-petroleum">
                    {formatBRL(nextCycleAmount)}
                  </p>
                  <p className="text-[10px] text-slate-600 leading-tight">
                    {hasScheduledChange
                      ? 'Nova assinatura e cobrança em'
                      : 'Próxima cobrança em'}
                    :
                    <span className="text-petroleum font-medium ml-1">
                      {nextCycleDate}
                    </span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <CreditCard size={12} className="text-gold" />
                  <p className="text-[9px] text-slate-500 uppercase font-semibold">
                    {billingCycleLabel}
                  </p>
                </div>
              </div>
            )}

            {planKey !== 'FREE' &&
              activeSubscriptionId &&
              showSidebarNextCharge && (
                <button
                  type="button"
                  onClick={() => setShowManagePayment(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-luxury border border-slate-200 bg-white text-[10px] font-semibold uppercase tracking-wider text-petroleum/80 hover:text-petroleum hover:border-petroleum/30 transition-colors"
                >
                  <Settings size={16} className="shrink-0" />
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
                  Você pode alterar seu plano a qualquer momento.
                </p>
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpgrade(planKey)}
                    className="btn-luxury-primary w-full"
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
                data={sortedHistory}
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

      <ManagePaymentSheet
        isOpen={showManagePayment}
        onClose={() => {
          setShowManagePayment(false);
          setManagePaymentTarget(null);
        }}
        activeSubscriptionId={
          managePaymentTarget?.asaas_subscription_id ??
          activeSubscriptionId ??
          ''
        }
        activeRequestId={
          managePaymentTarget?.id ?? latestPendingRequest?.id ?? null
        }
        profileFullName={profile.full_name}
        profileEmail={profile.email}
        profilePhone={profile.phone_contact}
        currentBillingType={
          (managePaymentTarget?.billing_type ??
            currentBillingType ??
            'CREDIT_CARD') as any
        }
        hasRejectedInvoice={
          String(
            managePaymentTarget?.status ?? latestPendingRequest?.status ?? '',
          ).toLowerCase() === 'rejected' &&
          String(
            managePaymentTarget?.billing_type ??
              latestPendingRequest?.billing_type ??
              currentBillingType ??
              '',
          ).toUpperCase() === 'CREDIT_CARD'
        }
        activeRequestStatus={
          String(
            managePaymentTarget?.status ?? latestPendingRequest?.status ?? '',
          ).toLowerCase() === 'rejected'
            ? 'rejected'
            : String(
                  managePaymentTarget?.asaas_raw_status ??
                    latestPendingRequest?.asaas_raw_status ??
                    '',
                ).toUpperCase() === 'OVERDUE'
              ? 'overdue'
              : 'pending'
        }
        amount={
          managePaymentTarget?.amount_final ??
          latestPendingRequest?.amount_final ??
          0
        }
        dueDate={
          (managePaymentTarget as any)?.due_date ??
          (latestPendingRequest as any)?.due_date ??
          null
        }
        existingInvoice={
          managePaymentTarget
            ? {
                billingType: (managePaymentTarget?.billing_type ?? null) as any,
                paymentUrl: managePaymentTarget?.payment_url ?? null,
                dueDate:
                  (managePaymentTarget as any)?.due_date ??
                  (latestPendingRequest as any)?.due_date ??
                  null,
                amount:
                  managePaymentTarget?.amount_final ??
                  latestPendingRequest?.amount_final ??
                  undefined,
              }
            : latestPendingRequest
              ? {
                  billingType: (latestPendingRequest?.billing_type ??
                    null) as any,
                  paymentUrl: latestPendingRequest?.payment_url ?? null,
                  dueDate: (latestPendingRequest as any)?.due_date ?? null,
                  amount: latestPendingRequest?.amount_final ?? undefined,
                }
              : null
        }
        planName={planDisplayName(planKey)}
        planPeriod={managePaymentTarget?.billing_period ?? 'monthly'}
        onSuccess={(_newPaymentId) => router.refresh()}
      />

      <UpgradeSheet
        isOpen={upgradeSheetOpen}
        onClose={() => {
          router.refresh();
          setUpgradeSheetOpen(false);
          setUpgradeSheetInitialPlan(undefined);
        }}
        initialPlanKey={upgradeSheetInitialPlan}
        profileSource={profile}
      />

      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        processedAt={cancelProcessedAt}
        createdAt={cancelCreatedAt}
        hasRefundRight={hasRefundRight}
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
        isAdmin={profile.roles?.includes('admin') === true}
        onClose={() => setNotesSheetRequest(null)}
      />

      {ToastElement}
    </>
  );
}
