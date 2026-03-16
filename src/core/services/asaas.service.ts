// src/core/services/asaas.service.ts
'use server';

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 IMPORTS INTERNOS (para as funções que ainda estão aqui)
// ═══════════════════════════════════════════════════════════════════════════════

import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { revalidateUserCache } from '@/actions/revalidate.actions';
import {
  PLANS_BY_SEGMENT,
  getPeriodPrice,
  PIX_DISCOUNT_PERCENT,
  planOrder,
  type PlanKey,
  type SegmentType,
} from '@/core/config/plans';
import type {
  BillingPeriod,
  BillingType,
  CancellationResult,
  ExpiredSubscriptionCheck,
  PaymentMethodSummary,
  UpgradePriceCalculation,
  UpgradePreviewResult,
  UpgradeRequestPayload,
  UpgradeRequestResult,
} from '@/core/types/billing';

// Imports dos novos módulos
import { getNeedsAdjustment } from './asaas/gallery/adjustments';
import {
  addMonths,
  addDays,
  billingPeriodToMonths,
  parseExpiryFromNotes,
  periodOrder,
} from './asaas/utils/dates';
import {
  formatSnapshotAddress,
  buildCancellationNotes,
} from './asaas/utils/formatters';
import {
  billingPeriodToCommercialDays,
  calculateProRataCredit as calculateProRataCreditImpl,
} from './asaas/billing/pro-rata';
import { PENDING_UPGRADE_MAX_AGE_MS } from './asaas/utils/constants';
import { upsertBillingProfile } from './asaas/billing/billing-profile';
import { createOrUpdateAsaasCustomer } from './asaas/api/customers';
import {
  createAsaasSubscription,
  updateAsaasSubscriptionNextDueDate,
  updateAsaasSubscriptionPlanAndDueDate,
  setAsaasSubscriptionEndDate,
  cancelAsaasSubscriptionById,
  getAsaasSubscription,
  getActiveSubscriptionIdForCustomer,
} from './asaas/api/subscriptions';
import {
  getFirstPaymentFromSubscription,
  createAsaasCreditCardPayment,
  deletePendingPaymentsForSubscription,
  getAsaasPaymentStatus,
  getPaymentBillingInfo,
  deleteAsaasPayment,
} from './asaas/api/payments';
import { getPixQrCodeFromPayment } from './asaas/api/pix';
import { reactivateAutoArchivedGalleries as reactivateAutoArchivedGalleriesImpl } from './asaas/gallery/adjustments';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 TIPOS E INTERFACES (usados pelas funções abaixo)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CurrentActiveRequestRow {
  id: string;
  amount_final: number;
  amount_discount?: number | null;
  processed_at: string | null;
  billing_period: string | null;
  plan_key_requested: string;
  asaas_subscription_id?: string | null;
  notes?: string | null;
}

export interface PendingUpgradeRow {
  id: string;
  created_at: string;
  plan_key_requested: string;
  billing_type: string;
  billing_period: string | null;
  asaas_subscription_id?: string | null;
  asaas_payment_id?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ FUNÇÕES QUE AINDA PERMANECEM NESTE ARQUIVO
// (TODO: migrar para billing/upgrade.ts, billing/downgrade.ts, etc)
// ═══════════════════════════════════════════════════════════════════════════════

// Wrappers async exportados para manter compatibilidade com testes e chamadas externas
export async function calculateProRataCredit(
  currentAmount: number,
  totalDays: 30 | 180 | 360,
  remainingDays: number,
): Promise<number> {
  return calculateProRataCreditImpl(currentAmount, totalDays, remainingDays);
}

export async function reactivateAutoArchivedGalleries(
  profileId: string,
  newPlanKey: PlanKey,
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{ reactivated: number; error?: string }> {
  return reactivateAutoArchivedGalleriesImpl(profileId, newPlanKey, supabaseClient);
}

/**
 * Busca a solicitação aprovada que representa o plano ativo do usuário.
 */
export async function getCurrentActiveRequest(
  userId: string,
  currentPlanKey: PlanKey,
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<CurrentActiveRequestRow | null> {
  if (!currentPlanKey || currentPlanKey === 'FREE') return null;

  const db = supabase ?? (await createSupabaseServerClient());
  const { data: rows } = await db
    .from('tb_upgrade_requests')
    .select(
      'id, amount_final, amount_discount, processed_at, billing_period, plan_key_requested, asaas_subscription_id, notes',
    )
    .eq('profile_id', userId)
    .eq('status', 'approved')
    .eq('plan_key_requested', currentPlanKey)
    .order('processed_at', { ascending: false })
    .limit(10);

  const list = (rows ?? []) as CurrentActiveRequestRow[];
  if (!list.length) return null;

  const now = new Date();
  for (const row of list) {
    if (!row?.processed_at) continue;
    const start = new Date(row.processed_at);
    let end = addMonths(start, billingPeriodToMonths(row.billing_period));
    const fromNotes = parseExpiryFromNotes(row.notes);
    if (fromNotes) end = fromNotes;
    if (end >= now) return row;
  }
  return list[0];
}

/**
 * Último request aprovado com pagamento efetivo (amount_final > 0).
 */
export async function getLastPaidUpgradeRequest(
  userId: string,
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{
  amount_final: number;
  asaas_subscription_id?: string | null;
} | null> {
  const db = supabase ?? (await createSupabaseServerClient());
  const { data: row } = await db
    .from('tb_upgrade_requests')
    .select('amount_final, asaas_subscription_id')
    .eq('profile_id', userId)
    .eq('status', 'approved')
    .gt('amount_final', 0)
    .order('processed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return row && typeof row.amount_final === 'number' ? row : null;
}

/**
 * Retorna a solicitação pendente mais recente (últimas 24h).
 */
export async function getPendingUpgradeRequest(
  userId: string,
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<PendingUpgradeRow | null> {
  const db = supabase ?? (await createSupabaseServerClient());
  const since = new Date(Date.now() - PENDING_UPGRADE_MAX_AGE_MS).toISOString();
  const { data } = await db
    .from('tb_upgrade_requests')
    .select(
      'id, created_at, plan_key_requested, billing_type, billing_period, asaas_subscription_id, asaas_payment_id',
    )
    .eq('profile_id', userId)
    .eq('status', 'pending')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as PendingUpgradeRow | null;
}

/**
 * Cancela uma solicitação pendente no Asaas e marca como 'cancelled' no banco.
 */
async function cancelPendingUpgradeInAsaasAndDb(
  pending: PendingUpgradeRow,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{
  success: boolean;
  paymentAlreadyReceived?: boolean;
  error?: string;
}> {
  const subId = pending.asaas_subscription_id?.trim();
  let payId = pending.asaas_payment_id?.trim();

  if (!payId && subId) {
    const first = await getFirstPaymentFromSubscription(subId);
    if (first.success && first.paymentId) payId = first.paymentId;
  }

  if (payId) {
    const statusRes = await getAsaasPaymentStatus(payId);
    if (statusRes.success && statusRes.status) {
      const s = statusRes.status;
      if (s === 'RECEIVED' || s === 'CONFIRMED') {
        const { error } = await supabase
          .from('tb_upgrade_requests')
          .update({
            status: 'cancelled',
            notes:
              'Invalidado para nova solicitação (pagamento já identificado no Asaas; valor será utilizado como crédito).',
            updated_at: new Date().toISOString(),
          })
          .eq('id', pending.id);
        return error
          ? { success: false, error: 'Erro ao atualizar solicitação anterior.' }
          : { success: true, paymentAlreadyReceived: true };
      }
    }
  }

  if (subId) {
    const res = await cancelAsaasSubscriptionById(subId);
    if (!res.success) return { success: false, error: res.error };
  } else if (payId) {
    const res = await deleteAsaasPayment(payId);
    if (!res.success) return { success: false, error: res.error };
  }

  const { error } = await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      notes:
        'Invalidado para nova solicitação (usuário alterou plano/ciclo/método de pagamento).',
      updated_at: new Date().toISOString(),
    })
    .eq('id', pending.id);
  return error
    ? { success: false, error: 'Erro ao atualizar solicitação anterior.' }
    : { success: true };
}

/**
 * Calcula o valor de upgrade com pro-rata (ano comercial 30/180/360 dias).
 */
export async function calculateUpgradePrice(
  currentRequest: CurrentActiveRequestRow | null,
  targetPlanKey: PlanKey,
  targetPeriod: BillingPeriod,
  billingType: BillingType,
  segment: SegmentType = 'PHOTOGRAPHER',
  currentPlanKeyFromProfile?: PlanKey,
  lastPaidAmountForProRata?: number,
): Promise<UpgradePriceCalculation> {
  const planInfo = PLANS_BY_SEGMENT[segment]?.[targetPlanKey];
  const now = new Date();

  if (!planInfo || planInfo.price <= 0) {
    return {
      type: 'upgrade',
      amount_original: 0,
      amount_discount: 0,
      amount_final: 0,
      residual_credit: 0,
      current_plan_expires_at: now.toISOString(),
      new_expiry_date: addDays(
        now,
        billingPeriodToCommercialDays(targetPeriod),
      ).toISOString(),
    };
  }

  const { totalPrice: totalPriceNew } = getPeriodPrice(planInfo, targetPeriod);
  const targetCommercialDays = billingPeriodToCommercialDays(targetPeriod);

  if (!currentRequest?.processed_at) {
    const pixDiscount =
      billingType === 'PIX' && targetPeriod !== 'monthly'
        ? Math.round(totalPriceNew * (PIX_DISCOUNT_PERCENT / 100) * 100) / 100
        : 0;
    return {
      type: 'upgrade',
      amount_original: totalPriceNew,
      amount_discount: pixDiscount,
      amount_final: Math.round((totalPriceNew - pixDiscount) * 100) / 100,
      residual_credit: 0,
      pix_discount_amount: pixDiscount,
      current_plan_expires_at: now.toISOString(),
      new_expiry_date: addDays(now, targetCommercialDays).toISOString(),
    };
  }

  const startDate = new Date(currentRequest.processed_at);
  const monthsCurrent = billingPeriodToMonths(currentRequest.billing_period);
  let currentPlanExpiresAt = addMonths(startDate, monthsCurrent);
  const expiryFromNotes = parseExpiryFromNotes(currentRequest.notes);
  if (expiryFromNotes && expiryFromNotes > currentPlanExpiresAt)
    currentPlanExpiresAt = expiryFromNotes;

  const totalMsCurrent = currentPlanExpiresAt.getTime() - startDate.getTime();
  const remainingMs = Math.max(
    0,
    currentPlanExpiresAt.getTime() - now.getTime(),
  );
  const totalDaysCommercial = billingPeriodToCommercialDays(
    currentRequest.billing_period,
  );
  const currentPlanKey = (currentPlanKeyFromProfile ??
    currentRequest.plan_key_requested) as PlanKey;
  const currentPeriod = (currentRequest.billing_period ??
    'monthly') as BillingPeriod;
  const planInfoCurrent = PLANS_BY_SEGMENT[segment]?.[currentPlanKey];

  const remainingDaysProRata =
    totalMsCurrent <= 0
      ? 0
      : totalDaysCommercial * (remainingMs / totalMsCurrent);
  const amountForProRata =
    currentRequest.amount_final > 0
      ? currentRequest.amount_final
      : lastPaidAmountForProRata != null && lastPaidAmountForProRata > 0
        ? lastPaidAmountForProRata
        : planInfoCurrent
          ? getPeriodPrice(planInfoCurrent, currentPeriod).totalPrice
          : 0;
  const residualCredit = await calculateProRataCredit(
    amountForProRata,
    totalDaysCommercial,
    remainingDaysProRata,
  );

  const daysSincePurchase = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (targetPlanKey === currentPlanKey && targetPeriod === currentPeriod) {
    return {
      type: 'current_plan',
      amount_original: totalPriceNew,
      amount_discount: 0,
      amount_final: 0,
      residual_credit: 0,
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
      new_expiry_date: currentPlanExpiresAt.toISOString(),
    };
  }

  const targetIdx = planOrder.indexOf(targetPlanKey);
  const currentIdx = planOrder.indexOf(currentPlanKey);
  const isDowngrade =
    targetIdx < currentIdx ||
    (targetIdx === currentIdx &&
      periodOrder(targetPeriod) < periodOrder(currentPeriod));

  if (isDowngrade) {
    const isWithdrawalWindow = daysSincePurchase <= 7;
    let previousCredit = 0;
    if (
      isWithdrawalWindow &&
      currentRequest.amount_final > 0 &&
      typeof currentRequest.amount_discount === 'number' &&
      currentRequest.amount_discount > 0
    ) {
      previousCredit = Math.max(0, currentRequest.amount_discount);
    }
    const creditForDowngrade = isWithdrawalWindow
      ? amountForProRata + previousCredit
      : residualCredit;
    const downgradeEffectiveAt = isWithdrawalWindow
      ? now
      : currentPlanExpiresAt;

    if (isWithdrawalWindow) {
      const amountToPayRaw =
        Math.round((totalPriceNew - creditForDowngrade) * 100) / 100;
      const amountToPay = Math.max(0, amountToPayRaw);

      const dailyPriceTarget =
        targetCommercialDays > 0 ? totalPriceNew / targetCommercialDays : 0;

      if (amountToPay <= 0 && dailyPriceTarget > 0) {
        const daysCoveredByCredit = Math.max(
          targetCommercialDays,
          Math.round((creditForDowngrade / dailyPriceTarget) * 100) / 100,
        );
        const newExpiry = addDays(now, daysCoveredByCredit);

        return {
          type: 'downgrade',
          is_free_upgrade: true,
          amount_original: totalPriceNew,
          amount_discount: creditForDowngrade,
          amount_final: 0,
          residual_credit: creditForDowngrade,
          current_plan_expires_at: currentPlanExpiresAt.toISOString(),
          downgrade_effective_at: now.toISOString(),
          is_downgrade_withdrawal_window: true,
          days_since_purchase: daysSincePurchase,
          new_expiry_date: newExpiry.toISOString(),
          free_upgrade_days_extended: daysCoveredByCredit,
          free_upgrade_months_covered: Math.floor(daysCoveredByCredit / 30),
        };
      }

      const newExpiry = addDays(now, targetCommercialDays);

      return {
        type: 'downgrade',
        amount_original: totalPriceNew,
        amount_discount: creditForDowngrade,
        amount_final: amountToPay,
        residual_credit: creditForDowngrade,
        current_plan_expires_at: currentPlanExpiresAt.toISOString(),
        downgrade_effective_at: now.toISOString(),
        is_downgrade_withdrawal_window: true,
        days_since_purchase: daysSincePurchase,
        new_expiry_date: newExpiry.toISOString(),
        free_upgrade_days_extended: targetCommercialDays,
        free_upgrade_months_covered: Math.floor(targetCommercialDays / 30),
      };
    }

    return {
      type: 'downgrade',
      amount_original: totalPriceNew,
      amount_discount: creditForDowngrade,
      amount_final: 0,
      residual_credit: creditForDowngrade,
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
      downgrade_effective_at: currentPlanExpiresAt.toISOString(),
      is_downgrade_withdrawal_window: false,
      days_since_purchase: daysSincePurchase,
    };
  }

  if (residualCredit >= totalPriceNew) {
    const dailyPriceNew = totalPriceNew / targetCommercialDays;
    const daysExtended =
      dailyPriceNew > 0
        ? Math.round(residualCredit / dailyPriceNew)
        : targetCommercialDays;
    const newExpiry = addDays(startDate, daysExtended);
    return {
      type: 'upgrade',
      is_free_upgrade: true,
      amount_original: totalPriceNew,
      amount_discount: totalPriceNew,
      amount_final: 0,
      residual_credit: residualCredit,
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
      new_expiry_date: newExpiry.toISOString(),
      free_upgrade_months_covered: Math.floor(daysExtended / 30),
      free_upgrade_days_extended: daysExtended,
    };
  }

  const amountToPayBeforePix = Math.max(
    0,
    Math.round((totalPriceNew - residualCredit) * 100) / 100,
  );
  const pixDiscount =
    billingType === 'PIX' && targetPeriod !== 'monthly'
      ? Math.round(amountToPayBeforePix * (PIX_DISCOUNT_PERCENT / 100) * 100) /
        100
      : 0;

  return {
    type: 'upgrade',
    amount_original: totalPriceNew,
    amount_discount: residualCredit + pixDiscount,
    amount_final: Math.round((amountToPayBeforePix - pixDiscount) * 100) / 100,
    residual_credit: residualCredit,
    pix_discount_amount: pixDiscount,
    current_plan_expires_at: currentPlanExpiresAt.toISOString(),
    new_expiry_date: addDays(now, targetCommercialDays).toISOString(),
  };
}

/**
 * Preview de upgrade/downgrade para exibir no modal antes da confirmação.
 */
export async function getUpgradePreview(
  targetPlanKey: PlanKey,
  targetPeriod: BillingPeriod,
  billingType: BillingType,
  segment: SegmentType = 'PHOTOGRAPHER',
): Promise<UpgradePreviewResult> {
  try {
    const { success, userId, profile } = await getAuthenticatedUser();
    if (!success || !userId)
      return {
        success: false,
        has_active_plan: false,
        error: 'Usuário não autenticado',
      };

    const supabase = await createSupabaseServerClient();
    const pending = await getPendingUpgradeRequest(userId, supabase);
    if (pending)
      return {
        success: true,
        has_active_plan: false,
        has_pending: true,
        calculation: undefined,
      };

    const currentPlanKeyFromProfile = profile?.plan_key
      ? (String(profile.plan_key).toUpperCase() as PlanKey)
      : undefined;

    let current: CurrentActiveRequestRow | null = null;
    if (currentPlanKeyFromProfile && currentPlanKeyFromProfile !== 'FREE') {
      current = await getCurrentActiveRequest(
        userId,
        currentPlanKeyFromProfile,
        supabase,
      );
    }

    let lastPaidAmountForProRata: number | undefined;
    if (current?.amount_final === 0) {
      const lastPaid = await getLastPaidUpgradeRequest(userId, supabase);
      if (lastPaid && lastPaid.amount_final > 0)
        lastPaidAmountForProRata = lastPaid.amount_final;
    }

    const calculation = await calculateUpgradePrice(
      current,
      targetPlanKey,
      targetPeriod,
      billingType,
      segment,
      currentPlanKeyFromProfile,
      lastPaidAmountForProRata,
    );
    const hasPlan =
      !!current ||
      (!!currentPlanKeyFromProfile && currentPlanKeyFromProfile !== 'FREE');
    return {
      success: true,
      has_active_plan: hasPlan,
      is_current_plan: calculation.type === 'current_plan',
      calculation,
    };
  } catch (e) {
    console.error('[getUpgradePreview]', e);
    return {
      success: false,
      has_active_plan: false,
      error: e instanceof Error ? e.message : 'Erro ao calcular preview',
    };
  }
}

/**
 * Status de uma solicitação de upgrade (para polling na tela PIX).
 */
export async function getUpgradeRequestStatus(
  requestId: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const { success, userId } = await getAuthenticatedUser();
    if (!success || !userId)
      return { success: false, error: 'Não autenticado' };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('tb_upgrade_requests')
      .select('status')
      .eq('id', requestId)
      .eq('profile_id', userId)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Solicitação não encontrada' };
    return { success: true, status: data.status as string };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Erro ao verificar status',
    };
  }
}

/**
 * Retorna um resumo do método de pagamento atual da assinatura ativa do usuário.
 */
export async function getCurrentPaymentMethodSummary(): Promise<{
  success: boolean;
  summary?: PaymentMethodSummary;
  error?: string;
}> {
  try {
    const { success, userId } = await getAuthenticatedUser();
    if (!success || !userId)
      return { success: false, error: 'Usuário não autenticado' };

    const supabase = await createSupabaseServerClient();
    const { data: row } = await supabase
      .from('tb_upgrade_requests')
      .select(
        'billing_type, asaas_subscription_id, asaas_payment_id, status, processed_at',
      )
      .eq('profile_id', userId)
      .eq('status', 'approved')
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row)
      return {
        success: true,
        summary: { billing_type: null },
      };

    const billingType = row.billing_type as BillingType;
    const subscriptionId = (row.asaas_subscription_id as string | null) ?? null;
    let paymentId = (row.asaas_payment_id as string | null) ?? null;

    if (billingType !== 'CREDIT_CARD')
      return {
        success: true,
        summary: { billing_type: billingType },
      };

    if (!paymentId && subscriptionId) {
      const first = await getFirstPaymentFromSubscription(subscriptionId);
      if (first.success && first.paymentId) paymentId = first.paymentId;
    }

    if (!paymentId)
      return {
        success: true,
        summary: { billing_type: billingType },
      };

    const billingInfo = await getPaymentBillingInfo(paymentId);
    if (!billingInfo.success) {
      return {
        success: true,
        summary: { billing_type: billingType },
      };
    }

    return {
      success: true,
      summary: {
        billing_type: billingType,
        ...(billingInfo.cardLast4 && { card_last4: billingInfo.cardLast4 }),
        ...(billingInfo.cardBrand && { card_brand: billingInfo.cardBrand }),
      },
    };
  } catch (e) {
    console.error('[getCurrentPaymentMethodSummary] Error:', e);
    return {
      success: false,
      error: 'Erro ao buscar método de pagamento atual',
    };
  }
}

/**
 * Aplica o downgrade de um usuário para FREE.
 */
export async function performDowngradeToFree(
  profileId: string,
  upgradeRequestId: string | null,
  reason: string,
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{
  success: boolean;
  needs_adjustment: boolean;
  excess_galleries: Array<{ id: string; title: string }>;
  error?: string;
}> {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());

  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('plan_key, is_exempt, metadata')
    .eq('id', profileId)
    .single();
  if (profile?.is_exempt === true)
    return { success: true, needs_adjustment: false, excess_galleries: [] };

  const oldPlan = (profile?.plan_key as string) ?? 'FREE';
  if (oldPlan === 'FREE')
    return { success: true, needs_adjustment: false, excess_galleries: [] };

  const newMetadata = {
    ...(profile?.metadata ?? {}),
    last_downgrade_alert_viewed: false,
  };

  const { error: planError } = await supabase
    .from('tb_profiles')
    .update({
      plan_key: 'FREE',
      metadata: newMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);
  if (planError) {
    console.error('[Downgrade] Erro ao atualizar plan_key:', planError);
    return {
      success: false,
      needs_adjustment: false,
      excess_galleries: [],
      error: 'Erro ao atualizar plano para FREE.',
    };
  }

  await supabase.from('tb_plan_history').insert({
    profile_id: profileId,
    old_plan: oldPlan,
    new_plan: 'FREE',
    reason,
  });

  if (upgradeRequestId) {
    await supabase
      .from('tb_upgrade_requests')
      .update({
        status: 'cancelled',
        notes: reason,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', upgradeRequestId);
  }

  const adjustment = await getNeedsAdjustment(profileId, 'FREE', supabase);

  if (adjustment.needs_adjustment && adjustment.excess_galleries.length > 0) {
    const excessIds = adjustment.excess_galleries.map((g) => g.id);
    const { error: hideError } = await supabase
      .from('tb_galerias')
      .update({
        is_public: false,
        auto_archived: true,
        updated_at: new Date().toISOString(),
      })
      .in('id', excessIds);
    if (hideError)
      console.warn(
        '[Downgrade] Não foi possível ocultar galerias excedentes:',
        hideError,
      );
  }

  return { success: true, ...adjustment };
}

/**
 * Cancela a assinatura do usuário autenticado.
 */
export async function handleSubscriptionCancellation(
  opts:
    | { reason?: string | null; comment?: string }
    | Awaited<ReturnType<typeof createSupabaseServerClient>> = {},
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<CancellationResult> {
  let reason: string | null = null;
  let comment = '';
  let resolvedSupabase = supabaseClient;
  if (opts && typeof (opts as { from?: unknown }).from === 'function') {
    resolvedSupabase =
      opts as Awaited<ReturnType<typeof createSupabaseServerClient>>;
  } else {
    const o = opts as { reason?: string | null; comment?: string };
    reason = o.reason ?? null;
    comment = o.comment ?? '';
  }

  const supabase = resolvedSupabase ?? (await createSupabaseServerClient());
  const { success: authOk, userId } = await getAuthenticatedUser();
  if (!authOk || !userId)
    return { success: false, error: 'Usuário não autenticado.' };

  const { data: request } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, status, asaas_payment_id, asaas_subscription_id, created_at, processed_at, billing_period, plan_key_requested, notes, amount_final',
    )
    .eq('profile_id', userId)
    .in('status', [
      'pending',
      'approved',
      'pending_cancellation',
      'pending_downgrade',
    ])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request)
    return { success: false, error: 'Nenhuma assinatura ativa encontrada.' };

  const purchaseDate = request.processed_at
    ? new Date(request.processed_at as string)
    : new Date(request.created_at);
  const now = new Date();
  const daysSincePurchase = Math.floor(
    (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const expiryFromNotes = parseExpiryFromNotes(request.notes);
  const accessEndsAt =
    expiryFromNotes && !Number.isNaN(expiryFromNotes.getTime())
      ? expiryFromNotes
      : addMonths(
          purchaseDate,
          billingPeriodToMonths(request.billing_period as string | null),
        );

  if (
    request.status === 'pending_downgrade' ||
    request.status === 'pending_cancellation'
  ) {
    return {
      success: true,
      type: 'scheduled_cancellation',
      access_ends_at: accessEndsAt.toISOString(),
    };
  }

  const accessEndsAtIso = accessEndsAt.toISOString();
  const endDateStr = accessEndsAt.toISOString().split('T')[0];

  if (daysSincePurchase <= 7 && request.status === 'approved') {
    if (request.asaas_subscription_id) {
      const cancelResult = await cancelAsaasSubscriptionById(
        request.asaas_subscription_id as string,
      );
      if (!cancelResult.success) {
        return {
          success: false,
          error:
            cancelResult.error ??
            'Não foi possível cancelar a assinatura no gateway.',
        };
      }
    } else {
      console.warn(
        '[Cancellation] tb_upgrade_requests sem asaas_subscription_id',
      );
    }

    const amountPaid =
      typeof (request as any).amount_final === 'number' &&
      (request as any).amount_final > 0
        ? (request as any).amount_final
        : 0;

    if (amountPaid > 0) {
      const { data: profileRow } = await supabase
        .from('tb_profiles')
        .select('metadata')
        .eq('id', userId)
        .maybeSingle();

      const currentMetadata =
        (profileRow?.metadata as Record<string, unknown>) || {};
      const currentBalanceRaw = (currentMetadata.credit_balance ?? 0) as
        | number
        | string;
      const currentBalance =
        typeof currentBalanceRaw === 'number'
          ? currentBalanceRaw
          : Number(currentBalanceRaw) || 0;
      const newBalance = Math.round((currentBalance + amountPaid) * 100) / 100;

      await supabase
        .from('tb_profiles')
        .update({
          metadata: { ...currentMetadata, credit_balance: newBalance },
          updated_at: now.toISOString(),
        })
        .eq('id', userId);
    }

    const downgradeResult = await performDowngradeToFree(
      userId,
      request.id,
      buildCancellationNotes(
        `Cancelamento com direito de arrependimento (${daysSincePurchase}d após compra)`,
        reason,
        comment,
      ),
      supabase,
    );
    return {
      success: downgradeResult.success,
      type: 'refund_immediate',
      needs_adjustment: downgradeResult.needs_adjustment,
      excess_galleries: downgradeResult.excess_galleries ?? [],
      error: downgradeResult.error,
    };
  }

  if (request.asaas_subscription_id) {
    const setEndResult = await setAsaasSubscriptionEndDate(
      request.asaas_subscription_id as string,
      endDateStr,
    );
    if (!setEndResult.success) {
      return {
        success: false,
        error:
          setEndResult.error ??
          'Não foi possível registrar o cancelamento no gateway.',
      };
    }
  } else {
    console.warn(
      '[Cancellation] tb_upgrade_requests sem asaas_subscription_id',
    );
  }

  await supabase
    .from('tb_profiles')
    .update({ is_cancelling: true, updated_at: now.toISOString() })
    .eq('id', userId);
  await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'pending_downgrade',
      notes: buildCancellationNotes(
        `Cancelamento solicitado em ${now.toISOString()}. Acesso até ${accessEndsAtIso}.`,
        reason,
        comment,
      ),
      updated_at: now.toISOString(),
    })
    .eq('id', request.id);
  await supabase.from('tb_plan_history').insert({
    profile_id: userId,
    old_plan: request.plan_key_requested as string,
    new_plan: request.plan_key_requested as string,
    reason: `Cancelamento agendado. Acesso até ${accessEndsAtIso}`,
  });

  return {
    success: true,
    type: 'scheduled_cancellation',
    access_ends_at: accessEndsAtIso,
  };
}

/**
 * Verifica assinaturas expiradas e aplica downgrade para FREE.
 */
export async function checkAndApplyExpiredSubscriptions(
  userId?: string,
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<ExpiredSubscriptionCheck> {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());

  let profileId = userId;
  if (!profileId) {
    const { success, userId: authUserId } = await getAuthenticatedUser();
    if (!success || !authUserId)
      return { applied: false, needs_adjustment: false, excess_galleries: [] };
    profileId = authUserId;
  }

  const { data: profileRow } = await supabase
    .from('tb_profiles')
    .select('is_exempt')
    .eq('id', profileId)
    .single();
  if (profileRow?.is_exempt === true)
    return { applied: false, needs_adjustment: false, excess_galleries: [] };

  const { data: pendingCancel } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, created_at, processed_at, billing_period, plan_key_requested, status',
    )
    .eq('profile_id', profileId)
    .in('status', ['pending_cancellation', 'pending_downgrade'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendingCancel)
    return { applied: false, needs_adjustment: false, excess_galleries: [] };

  const startDate = pendingCancel.processed_at
    ? new Date(pendingCancel.processed_at as string)
    : new Date(pendingCancel.created_at);
  const accessEndsAt = addMonths(
    startDate,
    billingPeriodToMonths(pendingCancel.billing_period as string | null),
  );

  if (new Date() < accessEndsAt)
    return { applied: false, needs_adjustment: false, excess_galleries: [] };

  const result = await performDowngradeToFree(
    profileId,
    pendingCancel.id,
    `Downgrade automático após término do período pago (expirou em ${accessEndsAt.toISOString()})`,
    supabase,
  );
  return {
    applied: result.success,
    needs_adjustment: result.needs_adjustment,
    excess_galleries: result.excess_galleries,
  };
}

/**
 * ⚠️ FUNÇÃO GIGANTE: requestUpgrade (será migrada posteriormente)
 */
export async function requestUpgrade(
  payload: UpgradeRequestPayload,
): Promise<UpgradeRequestResult> {
  const apiKey =
    process.env.ASAAS_API_KEY?.trim() || process.env.ASAAS_KEY?.trim() || null;
  if (!apiKey) {
    return {
      success: false,
      error:
        'Configuração de pagamento indisponível. Configure ASAAS_API_KEY no .env.local e reinicie o servidor.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    success: authOk,
    profile,
    userId,
    email,
  } = await getAuthenticatedUser();
  if (!authOk || !profile || !userId)
    return { success: false, error: 'Usuário não autenticado' };

  const segment = (payload.segment ?? 'PHOTOGRAPHER') as SegmentType;
  const planKey = payload.plan_key_requested as PlanKey;
  const planInfo = PLANS_BY_SEGMENT[segment]?.[planKey];
  if (!planInfo || planInfo.price <= 0)
    return { success: false, error: 'Plano inválido ou gratuito' };

  const planKeyCurrent = ((profile.plan_key &&
    String(profile.plan_key).toUpperCase()) ??
    'FREE') as PlanKey;

  if (profile.is_exempt === true && planKey === planKeyCurrent)
    return { success: true, billing_type: 'PIX' };

  const billingPeriod: BillingPeriod = payload.billing_period ?? 'monthly';

  const pendingRequest = await getPendingUpgradeRequest(userId, supabase);
  const isSamePendingPix =
    pendingRequest?.billing_type === 'PIX' &&
    pendingRequest.plan_key_requested === planKey &&
    pendingRequest.billing_period === billingPeriod;
  let paymentAlreadyReceivedWarning = false;

  if (pendingRequest && !isSamePendingPix) {
    const cancelResult = await cancelPendingUpgradeInAsaasAndDb(
      pendingRequest,
      supabase,
    );
    if (!cancelResult.success)
      return {
        success: false,
        error:
          cancelResult.error ??
          'Não foi possível invalidar a cobrança anterior.',
      };
    paymentAlreadyReceivedWarning =
      cancelResult.paymentAlreadyReceived === true;
  }

  let currentRequest = await getCurrentActiveRequest(
    userId,
    planKeyCurrent,
    supabase,
  );
  if (planKeyCurrent === 'FREE' || profile.is_exempt === true)
    currentRequest = null;

  let lastPaidAmountForProRata: number | undefined;
  if (currentRequest && currentRequest.amount_final === 0) {
    const lastPaid = await getLastPaidUpgradeRequest(userId, supabase);
    if (lastPaid && lastPaid.amount_final > 0)
      lastPaidAmountForProRata = lastPaid.amount_final;
  }

  const calculation = await calculateUpgradePrice(
    currentRequest,
    planKey,
    billingPeriod,
    payload.billing_type,
    segment,
    planKeyCurrent,
    lastPaidAmountForProRata,
  );

  if (calculation.type === 'current_plan') {
    return {
      success: false,
      error:
        'Este já é seu plano atual. Não é possível assinar novamente o mesmo plano e período.',
    };
  }

  const billingFullName = payload.full_name?.trim() ?? profile.full_name ?? '';
  const snapshot_address = formatSnapshotAddress(payload);

  // ── Upgrade Gratuito ──────────────────────────────────────────────────────
  if (calculation.is_free_upgrade && calculation.amount_final === 0) {
    const now = new Date().toISOString();
    const planDescription = `Plano ${planInfo.name}`;
    const nextDueStr = calculation.new_expiry_date?.split('T')[0];
    let asaasSubId: string | null =
      currentRequest?.asaas_subscription_id?.trim() ?? null;
    if (!asaasSubId) {
      const lastPaid = await getLastPaidUpgradeRequest(userId, supabase);
      asaasSubId = lastPaid?.asaas_subscription_id?.trim() ?? null;
    }
    if (!asaasSubId) {
      const { data: billingRow } = await supabase
        .from('tb_billing_profiles')
        .select('asaas_customer_id')
        .eq('id', userId)
        .maybeSingle();
      const customerId = billingRow?.asaas_customer_id?.trim();
      if (customerId) {
        const res = await getActiveSubscriptionIdForCustomer(customerId);
        if (res.success && res.subscriptionId) asaasSubId = res.subscriptionId;
      }
    }
    const value = getPeriodPrice(planInfo, billingPeriod).totalPrice;

    let notesAsaasSync = '';
    let deletedPaymentIds: string[] = [];
    let putSuccess = false;

    if (asaasSubId && nextDueStr && /^\d{4}-\d{2}-\d{2}$/.test(nextDueStr)) {
      const deleteResult =
        await deletePendingPaymentsForSubscription(asaasSubId);
      deletedPaymentIds = deleteResult.deletedIds;

      const putResult = await updateAsaasSubscriptionPlanAndDueDate(
        asaasSubId,
        {
          value,
          description: planDescription,
          nextDueDate: nextDueStr,
          updatePendingPayments: false,
        },
      );
      putSuccess = putResult.success;
      if (!putResult.success) {
        console.error(
          '[Asaas] Upgrade gratuito: falha ao atualizar assinatura:',
          putResult.error,
        );
      }

      const pendingRemoved =
        deletedPaymentIds.length > 0 ? deletedPaymentIds.join(', ') : 'Nenhuma';
      const statusLine = putSuccess
        ? 'Sincronizado com sucesso.'
        : `Falha no PUT: ${putResult.error ?? 'erro desconhecido'}`;
      notesAsaasSync = `\nSincronização Asaas:\n- Assinatura ${asaasSubId} atualizada para R$ ${value.toFixed(2)} (Vencimento: ${nextDueStr}).\n- Cobranças PENDING removidas: ${pendingRemoved}.\n- Status: ${statusLine}.`;
    } else {
      notesAsaasSync =
        '\nSincronização Asaas: não aplicável (sem assinatura anterior com nextDueDate válida).';
    }

    const notes =
      `Upgrade gratuito (Crédito): ${planDescription}.\n` +
      `Saldo residual R$ ${calculation.residual_credit.toFixed(2)}; nova data de vencimento: ${calculation.new_expiry_date ?? 'N/A'}.\n` +
      notesAsaasSync.trimStart();

    const { data: freeRow, error: freeErr } = await supabase
      .from('tb_upgrade_requests')
      .insert({
        profile_id: userId,
        plan_key_current: planKeyCurrent,
        plan_key_requested: planKey,
        billing_type: payload.billing_type,
        billing_period: billingPeriod,
        snapshot_name: billingFullName || (profile.full_name ?? ''),
        snapshot_cpf_cnpj: payload.cpf_cnpj,
        snapshot_email: email ?? '',
        snapshot_whatsapp: payload.whatsapp,
        snapshot_address,
        asaas_customer_id: null,
        asaas_subscription_id: asaasSubId,
        asaas_payment_id: null,
        payment_url: null,
        amount_original: calculation.amount_original,
        amount_discount: calculation.amount_discount,
        amount_final: 0,
        installments: 1,
        status: 'approved',
        processed_at: now,
        notes,
      })
      .select('id')
      .single();

    if (freeErr)
      return {
        success: false,
        error: 'Erro ao registrar upgrade gratuito. Tente novamente.',
      };

    await supabase
      .from('tb_profiles')
      .update({ plan_key: planKey, updated_at: now })
      .eq('id', userId);

    await reactivateAutoArchivedGalleries(userId, planKey, supabase);

    await revalidateUserCache(userId).catch((e) =>
      console.warn('[Upgrade gratuito] revalidateUserCache:', e),
    );
    return {
      success: true,
      billing_type: payload.billing_type,
      request_id: freeRow?.id,
    };
  }

  // ── Upgrade pago ──────────────────────────────────────────────────────────
  const {
    amount_original: amountOriginal,
    amount_discount: amountDiscount,
    amount_final: amountFinal,
  } = calculation;

  const hasCreditNextDueDate =
    Boolean(calculation.new_expiry_date) &&
    amountFinal > 0 &&
    !calculation.is_free_upgrade;
  const residualCreditValue = calculation.residual_credit ?? 0;
  const hasResidualCredit = residualCreditValue > 0;
  const notesCredit =
    hasResidualCredit && amountDiscount > 0
      ? `Aproveitamento de crédito pro-rata: R$ ${residualCreditValue.toFixed(2)} (dias não utilizados do plano anterior). Desconto total aplicado: R$ ${amountDiscount.toFixed(2)}. Valor final cobrado: R$ ${amountFinal.toFixed(2)}.${hasCreditNextDueDate && calculation.new_expiry_date ? ` Próximo vencimento do plano: ${calculation.new_expiry_date.split('T')[0]}. Nova data de vencimento: ${calculation.new_expiry_date}.` : ''}`
      : null;

  const isCreditCard = payload.billing_type === 'CREDIT_CARD';
  const requiresCardData = isCreditCard && calculation.amount_final > 0;
  if (requiresCardData) {
    const c = payload.credit_card;
    if (
      !c?.credit_card_holder_name?.trim() ||
      !c?.credit_card_number?.replace(/\D/g, '') ||
      !c?.credit_card_expiry_month ||
      !c?.credit_card_expiry_year ||
      !c?.credit_card_ccv
    ) {
      return {
        success: false,
        error:
          'Dados do cartão de crédito são obrigatórios para esta forma de pagamento.',
      };
    }
  }

  const maxInstallments =
    isCreditCard && billingPeriod === 'semiannual'
      ? 3
      : isCreditCard && billingPeriod === 'annual'
        ? 6
        : 1;
  const installments = Math.min(
    Math.max(1, payload.installments ?? 1),
    maxInstallments,
  );

  const upsertResult = await upsertBillingProfile(userId, {
    full_name: billingFullName || undefined,
    cpf_cnpj: payload.cpf_cnpj,
    postal_code: payload.postal_code,
    address: payload.address,
    address_number: payload.address_number,
    complement: payload.complement,
    province: payload.province,
    city: payload.city,
    state: payload.state,
  });
  if (!upsertResult.success)
    return { success: false, error: upsertResult.error };

  const { data: billingRow } = await supabase
    .from('tb_billing_profiles')
    .select('asaas_customer_id')
    .eq('id', userId)
    .single();
  const customerResult = await createOrUpdateAsaasCustomer(
    {
      name: billingFullName || (profile.full_name ?? 'Cliente'),
      email: email ?? '',
      cpfCnpj: payload.cpf_cnpj,
      phone: payload.whatsapp,
      postalCode: payload.postal_code,
      address: payload.address,
      addressNumber: payload.address_number,
      complement: payload.complement,
      province: payload.province,
      city: payload.city,
      state: payload.state,
    },
    billingRow?.asaas_customer_id ?? null,
  );
  if (!customerResult.success || !customerResult.customerId) {
    return {
      success: false,
      error: customerResult.error ?? 'Erro ao criar cliente no gateway',
    };
  }
  const asaasCustomerId = customerResult.customerId;

  await supabase
    .from('tb_billing_profiles')
    .update({
      asaas_customer_id: asaasCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  let creditCardDetails: any;
  let creditCardHolderInfo: any;
  if (isCreditCard && payload.credit_card) {
    const c = payload.credit_card;
    creditCardDetails = {
      holderName: c.credit_card_holder_name.trim(),
      number: c.credit_card_number.replace(/\D/g, ''),
      expiryMonth: c.credit_card_expiry_month
        .replace(/\D/g, '')
        .padStart(2, '0')
        .slice(-2),
      expiryYear: c.credit_card_expiry_year.replace(/\D/g, ''),
      ccv: c.credit_card_ccv.replace(/\D/g, ''),
    };
    creditCardHolderInfo = {
      name: billingFullName || (profile.full_name ?? 'Cliente'),
      email: email ?? '',
      cpfCnpj: payload.cpf_cnpj.replace(/\D/g, ''),
      postalCode: payload.postal_code.replace(/\D/g, ''),
      addressNumber: payload.address_number,
      addressComplement: payload.complement ?? undefined,
      phone: payload.whatsapp.replace(/\D/g, ''),
      mobilePhone: payload.whatsapp.replace(/\D/g, ''),
    };
  }

  let oneOffPaymentId: string | null = null;
  let oneOffInvoiceUrl: string | null = null;
  if (
    hasCreditNextDueDate &&
    isCreditCard &&
    creditCardDetails &&
    creditCardHolderInfo
  ) {
    const oneOff = await createAsaasCreditCardPayment(
      asaasCustomerId,
      amountFinal,
      new Date().toISOString().split('T')[0],
      `Plano ${planInfo.name}`,
      creditCardDetails,
      creditCardHolderInfo,
    );
    if (!oneOff.success || !oneOff.paymentId)
      return {
        success: false,
        error: oneOff.error ?? 'Erro ao cobrar diferença no cartão',
      };
    oneOffPaymentId = oneOff.paymentId;
    oneOffInvoiceUrl = oneOff.invoiceUrl ?? null;
  }

  const asaasCycle: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY' =
    billingPeriod === 'annual'
      ? 'YEARLY'
      : billingPeriod === 'semiannual'
        ? 'SEMIANNUALLY'
        : 'MONTHLY';
  const planPricePerPeriod = getPeriodPrice(planInfo, billingPeriod).totalPrice;
  const nextDueDateStr =
    hasCreditNextDueDate && calculation.new_expiry_date
      ? calculation.new_expiry_date.split('T')[0]
      : undefined;

  const subResult = await createAsaasSubscription({
    customerId: asaasCustomerId,
    billingType: payload.billing_type,
    cycle: asaasCycle,
    value:
      hasCreditNextDueDate && isCreditCard ? planPricePerPeriod : amountFinal,
    description: `Plano ${planInfo.name}`,
    ...(nextDueDateStr && { nextDueDate: nextDueDateStr }),
    installmentCount: installments > 1 ? installments : undefined,
    ...(creditCardDetails && { creditCardDetails }),
    ...(creditCardHolderInfo && { creditCardHolderInfo }),
  });

  if (!subResult.success || !subResult.subscriptionId) {
    return {
      success: false,
      error: subResult.error ?? 'Erro ao criar assinatura',
    };
  }
  const asaasSubscriptionId = subResult.subscriptionId;

  const paymentResult =
    await getFirstPaymentFromSubscription(asaasSubscriptionId);
  let asaasPaymentId: string | null = oneOffPaymentId;
  let paymentUrl: string | null = oneOffInvoiceUrl;
  let paymentDueDate: string | undefined;

  if (!asaasPaymentId || !paymentUrl) {
    if (paymentResult.success) {
      asaasPaymentId = asaasPaymentId ?? paymentResult.paymentId ?? null;
      paymentUrl =
        payload.billing_type === 'BOLETO'
          ? (paymentResult.bankSlipUrl ??
            paymentResult.paymentUrl ??
            subResult.bankSlipUrl ??
            subResult.invoiceUrl ??
            null)
          : (paymentUrl ??
            paymentResult.paymentUrl ??
            subResult.invoiceUrl ??
            subResult.bankSlipUrl ??
            null);
      paymentDueDate = paymentResult.dueDate;
    } else {
      paymentUrl =
        paymentUrl ?? subResult.invoiceUrl ?? subResult.bankSlipUrl ?? null;
    }
  } else if (paymentResult.success && paymentResult.dueDate) {
    paymentDueDate = paymentResult.dueDate;
  }

  const { data: insertRow, error: insertError } = await supabase
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: planKeyCurrent,
      plan_key_requested: planKey,
      billing_type: payload.billing_type,
      billing_period: billingPeriod,
      snapshot_name: billingFullName || (profile.full_name ?? ''),
      snapshot_cpf_cnpj: payload.cpf_cnpj,
      snapshot_email: email ?? '',
      snapshot_whatsapp: payload.whatsapp,
      snapshot_address,
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: asaasSubscriptionId,
      asaas_payment_id: asaasPaymentId,
      payment_url: paymentUrl,
      amount_original: amountOriginal,
      amount_discount: amountDiscount,
      amount_final: amountFinal,
      installments,
      status: 'pending',
      ...(notesCredit && { notes: notesCredit }),
    })
    .select('id')
    .single();

  if (insertError) {
    const msg =
      insertError.message ??
      (typeof insertError === 'object'
        ? JSON.stringify(insertError)
        : String(insertError));
    return {
      success: false,
      error:
        process.env.NODE_ENV === 'development'
          ? `Erro ao registrar solicitação: ${msg}`
          : 'Erro ao registrar solicitação. Tente novamente.',
    };
  }

  if (hasCreditNextDueDate && calculation.new_expiry_date) {
    const nds = calculation.new_expiry_date.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(nds)) {
      await updateAsaasSubscriptionNextDueDate(asaasSubscriptionId, nds).catch(
        (e) =>
          console.error(
            '[Asaas] Falha ao atualizar nextDueDate após insert:',
            e,
          ),
      );
    }
  }

  let pixQrCodeBase64: string | undefined;
  let pixCopyPaste: string | undefined;
  if (payload.billing_type === 'PIX' && asaasPaymentId) {
    const pixQr = await getPixQrCodeFromPayment(asaasPaymentId);
    if (pixQr.success) {
      pixQrCodeBase64 = pixQr.encodedImage;
      pixCopyPaste = pixQr.payload;
    }
  }

  return {
    success: true,
    payment_url: paymentUrl ?? undefined,
    billing_type: payload.billing_type,
    request_id: insertRow?.id,
    ...(paymentDueDate && { payment_due_date: paymentDueDate }),
    ...(pixQrCodeBase64 && { pix_qr_code_base64: pixQrCodeBase64 }),
    ...(pixCopyPaste && { pix_copy_paste: pixCopyPaste }),
    ...(paymentAlreadyReceivedWarning && {
      warning:
        'Pagamento já identificado. O valor será utilizado como crédito para o novo plano.',
    }),
  };
}