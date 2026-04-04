// src/core/services/billing.service.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase.server';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import type {
  BillingProfile,
  BillingPeriod,
  BillingType,
  UpgradeRequest,
  UpgradeRequestStatus,
} from '@/core/types/billing';
import {
  appendBillingNotesBlock,
  billingNotesDisplayText,
} from '@/core/services/asaas/utils/billing-notes-doc';
import {
  clearAsaasSubscriptionScheduledEnd,
  deleteAsaasPayment,
  getAsaasSubscription,
  updateAsaasSubscriptionPlanAndDueDate,
} from '@/core/services/asaas';
import {
  PLANS_BY_SEGMENT,
  getPeriodPrice,
  getPixAdjustedTotal,
  type PlanKey,
  type SegmentType,
} from '@/core/config/plans';
import { logSystemEvent } from '@/core/utils/telemetry';
import { revalidateUserCache } from '@/actions/revalidate.actions';
import { getCurrentUpgradeRequestFromHistory } from '@/core/services/billing/upgrade-request-current';

export { getCurrentUpgradeRequestFromHistory };

/**
 * Carrega tb_billing_profiles do usuário atual.
 * Retorna null se ainda não cadastrado (primeiro upgrade).
 */
export async function getBillingProfile(): Promise<BillingProfile | null> {
  const { success, userId } = await getAuthenticatedUser();
  if (!success || !userId) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tb_billing_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as BillingProfile;
}

/**
 * Lista tb_upgrade_requests do usuário atual, ordenado por created_at DESC.
 * Usado na página /dashboard/planos para mostrar histórico.
 */
export async function getUpgradeHistory(): Promise<UpgradeRequest[]> {
  const { success, userId } = await getAuthenticatedUser();
  if (!success || !userId) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tb_upgrade_requests')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as UpgradeRequest[];
}

function billingPeriodToMonths(period: string | null | undefined): number {
  if (period === 'semiannual') return 6;
  if (period === 'annual') return 12;
  return 1;
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

/**
 * Extrai a data de vencimento das notes (ex.: upgrade gratuito "Nova data de vencimento: 2026-06-16T...").
 * Retorna a Date ou null.
 */
function parseExpiryFromNotes(notes: string | null | undefined): Date | null {
  const text = billingNotesDisplayText(notes);
  if (!text.trim()) return null;
  const match = text.match(/Nova data de vencimento:\s*([^\s.]+)/i);
  if (!match?.[1]) return null;
  const date = new Date(match[1].trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Calcula a data de expiração do plano pago a partir do histórico.
 * Preferência: data extraída das notes da solicitação aprovada ("Nova data de vencimento:");
 * caso contrário usa processed_at + billing_period.
 * Retorna ISO string ou null.
 */
export async function getSubscriptionExpiresAt(
  history: UpgradeRequest[],
): Promise<string | null> {
  const current = getCurrentUpgradeRequestFromHistory(history);
  if (!current) return null;

  const fromNotes = parseExpiryFromNotes(current.notes);
  if (fromNotes) return utcIsoFrom(fromNotes);

  if (!current.processed_at) return null;
  const start = new Date(current.processed_at);
  const months = billingPeriodToMonths(current.billing_period);
  const endsAt = addMonths(start, months);
  return utcIsoFrom(endsAt);
}

/**
 * Retorna o valor da última cobrança para exibição.
 * Preferência: solicitação aprovada; fallback: qualquer registro com amount_final > 0.
 */
export async function getLastChargeAmount(
  history: UpgradeRequest[],
): Promise<number | undefined> {
  const current = getCurrentUpgradeRequestFromHistory(history);
  if (current?.amount_final != null && current.amount_final > 0) {
    return current.amount_final;
  }
  const withCharge = history.find(
    (r) => r.amount_final != null && r.amount_final > 0,
  );
  return withCharge?.amount_final;
}

function defaultSegment(): SegmentType {
  const s = process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType | undefined;
  return s && s in PLANS_BY_SEGMENT ? s : 'PHOTOGRAPHER';
}

function billingPeriodToAsaasCycle(
  period: BillingPeriod,
): 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY' {
  if (period === 'annual') return 'YEARLY';
  if (period === 'semiannual') return 'SEMIANNUALLY';
  return 'MONTHLY';
}

/** Valor recorrente do plano anterior (equivale a restaurar cobrança antes do upgrade). */
function recurringValueForPlanAndBilling(
  planKey: PlanKey,
  period: BillingPeriod,
  billingType: BillingType,
  segment: SegmentType,
): number {
  const planInfo = PLANS_BY_SEGMENT[segment]?.[planKey];
  if (!planInfo) return 0;
  if (billingType === 'PIX' && period !== 'monthly') {
    return getPixAdjustedTotal(planInfo, period).totalWithPixDiscount;
  }
  return getPeriodPrice(planInfo, period).totalPrice;
}

/**
 * Plano anterior ao upgrade: `plan_key_current` na linha pendente (equivalente a `old_plan_key` quando existir no banco).
 * Remove cobrança pendente e restaura valor/plano/ciclo da assinatura no Asaas (PIX, boleto ou cartão).
 */
export async function rollbackPendingUpgradeOnAsaas(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  requestId: string;
  row: Pick<
    UpgradeRequest,
    | 'notes'
    | 'asaas_subscription_id'
    | 'asaas_payment_id'
    | 'plan_key_current'
    | 'billing_period'
    | 'billing_type'
  >;
}): Promise<{ success: boolean; error?: string; notes?: string | null }> {
  const { supabase, userId, requestId, row } = params;
  const subId = row.asaas_subscription_id?.trim();
  if (!subId) {
    return { success: true, notes: row.notes };
  }

  const segment = defaultSegment();
  const oldPlanKey = String(row.plan_key_current ?? '').toUpperCase() as PlanKey;
  if (!oldPlanKey || !PLANS_BY_SEGMENT[segment]?.[oldPlanKey]) {
    return {
      success: false,
      error: 'Plano anterior inválido para rollback.',
    };
  }

  const { data: prevPaid } = await supabase
    .from('tb_upgrade_requests')
    .select('billing_type, billing_period, amount_final')
    .eq('profile_id', userId)
    .eq('asaas_subscription_id', subId)
    .in('status', ['approved', 'renewed'])
    .neq('id', requestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: prevSamePlan } = await supabase
    .from('tb_upgrade_requests')
    .select('billing_type, billing_period, amount_final')
    .eq('profile_id', userId)
    .eq('plan_key_requested', oldPlanKey)
    .in('status', ['approved', 'renewed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const billingSource = prevPaid ?? prevSamePlan;
  const previousBillingType = (billingSource?.billing_type ??
    row.billing_type ??
    'CREDIT_CARD') as BillingType;
  const periodForRecurring = (billingSource?.billing_period ??
    row.billing_period) as BillingPeriod;

  const payId = row.asaas_payment_id?.trim();
  if (payId) {
    const del = await deleteAsaasPayment(payId);
    if (!del.success) {
      return {
        success: false,
        error:
          del.error ??
          'Não foi possível remover a cobrança pendente no gateway.',
      };
    }
  }

  const sub = await getAsaasSubscription(subId);
  if (!sub.success) {
    return {
      success: false,
      error: sub.error ?? 'Não foi possível ler a assinatura no Asaas.',
    };
  }
  const nextDueRaw = String(sub.nextDueDate ?? '');
  const nextDueDate = nextDueRaw.includes('T')
    ? nextDueRaw.split('T')[0]
    : nextDueRaw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) {
    return {
      success: false,
      error: 'Data de vencimento da assinatura inválida no Asaas.',
    };
  }

  const planInfo = PLANS_BY_SEGMENT[segment][oldPlanKey];
  const catalogRecurring = recurringValueForPlanAndBilling(
    oldPlanKey,
    periodForRecurring,
    previousBillingType,
    segment,
  );
  const lastPaidCycle =
    typeof billingSource?.amount_final === 'number' &&
    billingSource.amount_final > 0
      ? billingSource.amount_final
      : null;
  const recurringValue = lastPaidCycle ?? catalogRecurring;
  if (!(recurringValue > 0)) {
    return {
      success: false,
      error: 'Não foi possível calcular o valor da assinatura para rollback.',
    };
  }

  const put = await updateAsaasSubscriptionPlanAndDueDate(subId, {
    value: recurringValue,
    description: `Plano ${planInfo.name}`,
    nextDueDate,
    billingType: previousBillingType,
    cycle: billingPeriodToAsaasCycle(periodForRecurring),
    updatePendingPayments: true,
  });
  if (!put.success) {
    return {
      success: false,
      error: put.error ?? 'Falha ao reverter assinatura no Asaas.',
    };
  }

  const clearEnd = await clearAsaasSubscriptionScheduledEnd(subId, nextDueDate);
  if (!clearEnd.success) {
    return {
      success: false,
      error:
        clearEnd.error ??
        'Assinatura revertida parcialmente: não foi possível remover encerramento agendado no gateway.',
    };
  }

  const auditLine =
    'Rollback executado: upgrade cancelado antes do pagamento';
  return {
    success: true,
    notes: appendBillingNotesBlock(row.notes, auditLine),
  };
}

/**
 * Permite ao usuário cancelar uma solicitação 'pending'.
 */
export async function cancelUpgradeRequest(
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  const startedAt = Date.now();
  const { success, userId } = await getAuthenticatedUser();
  if (!success || !userId) {
    return { success: false, error: 'Não autenticado' };
  }

  const supabase = await createSupabaseServerClient();

  const { data: row, error: fetchError } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, status, profile_id, billing_type, plan_key_current, asaas_subscription_id, asaas_payment_id, billing_period, notes',
    )
    .eq('id', requestId)
    .single();

  if (fetchError || !row) {
    return { success: false, error: 'Solicitação não encontrada' };
  }

  if (row.profile_id !== userId) {
    return { success: false, error: 'Solicitação não pertence ao usuário' };
  }

  const st = row.status as UpgradeRequestStatus;
  if (st !== 'pending' && st !== 'processing') {
    return {
      success: false,
      error: 'Apenas solicitações pendentes podem ser canceladas',
    };
  }

  let mergedNotes: string | null | undefined = row.notes ?? null;

  const subIdForRollback = String(row.asaas_subscription_id ?? '').trim();
  if (subIdForRollback) {
    const rollback = await rollbackPendingUpgradeOnAsaas({
      supabase,
      userId,
      requestId,
      row: {
        notes: row.notes,
        asaas_subscription_id: row.asaas_subscription_id,
        asaas_payment_id: row.asaas_payment_id,
        plan_key_current: row.plan_key_current,
        billing_period: row.billing_period as BillingPeriod,
        billing_type: row.billing_type,
      },
    });
    if (!rollback.success) {
      return {
        success: false,
        error: rollback.error ?? 'Falha ao reverter assinatura no gateway.',
      };
    }
    mergedNotes = rollback.notes ?? row.notes;
  }

  const restorePlanKey = String(row.plan_key_current ?? '').trim();
  if (restorePlanKey) {
    const { error: profileErr } = await supabase
      .from('tb_profiles')
      .update({
        plan_key: restorePlanKey,
        updated_at: utcIsoFrom(nowFn()),
      })
      .eq('id', userId);
    if (profileErr) {
      console.error('[billing] cancelUpgradeRequest profile restore:', profileErr);
      return {
        success: false,
        error: 'Não foi possível restaurar o plano no perfil após o rollback.',
      };
    }
  }

  const { error: updateError } = await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      ...(mergedNotes !== undefined ? { notes: mergedNotes } : {}),
      updated_at: utcIsoFrom(nowFn()),
    })
    .eq('id', requestId)
    .eq('profile_id', userId);

  if (updateError) {
    console.error('[billing] cancelUpgradeRequest:', updateError);
    return { success: false, error: 'Erro ao cancelar solicitação' };
  }

  await logSystemEvent({
    serviceName: 'billing/cancel-upgrade-request',
    status: 'success',
    executionTimeMs: Date.now() - startedAt,
    payload: {
      profileId: userId,
      upgradeRequestId: requestId,
      restoredPlanKey: restorePlanKey || null,
      gatewayRollback: Boolean(subIdForRollback),
    },
  });

  revalidateUserCache(userId).catch((e) =>
    console.warn('[billing] cancelUpgradeRequest revalidateUserCache:', e),
  );

  return { success: true };
}

/**
 * Retorna a data desde quando a assinatura do usuário está em atraso.
 * Retorna null se não houver atraso ou nenhuma assinatura ativa.
 */
export async function getOverdueSince(
  profileId: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('tb_upgrade_requests')
    .select('overdue_since')
    .eq('profile_id', profileId)
    .eq('status', 'approved')
    .not('overdue_since', 'is', null)
    .order('overdue_since', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.overdue_since ?? null;
}

/**
 * Dados para o badge de atraso na Navbar: link direto (PIX/boleto no banco)
 * ou redirect pela API que resolve invoiceUrl no Asaas.
 */
export async function getOverdueBadgeData(profileId: string): Promise<{
  overdueSince: string | null;
  paymentHref: string | null;
}> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('tb_upgrade_requests')
    .select('id, overdue_since, payment_url, asaas_payment_id')
    .eq('profile_id', profileId)
    .eq('status', 'approved')
    .not('overdue_since', 'is', null)
    .order('overdue_since', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.overdue_since) {
    return { overdueSince: null, paymentHref: null };
  }

  const direct = (data.payment_url ?? '').trim();
  if (direct.startsWith('http://') || direct.startsWith('https://')) {
    return { overdueSince: data.overdue_since, paymentHref: direct };
  }

  if (data.asaas_payment_id && data.id) {
    return {
      overdueSince: data.overdue_since,
      paymentHref: `/api/dashboard/payment-invoice-url?requestId=${encodeURIComponent(data.id)}`,
    };
  }

  return {
    overdueSince: data.overdue_since,
    paymentHref: '/dashboard/assinatura',
  };
}
