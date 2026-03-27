// src/core/services/asaas.service.ts
'use server';

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 IMPORTS INTERNOS (para as funções que ainda estão aqui)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  createSupabaseAdmin,
  createSupabaseServerClient,
} from '@/lib/supabase.server';
import {
  getSaoPauloDateString,
  now as nowFn,
  utcIsoFrom,
  utcIsoOffsetFromNowMs,
} from '@/core/utils/data-helpers';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { revalidateUserCache } from '@/actions/revalidate.actions';
import { revalidatePath } from 'next/cache';
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
import { UPGRADE_REQUEST_STATUS_RENEWED } from '@/core/types/billing';

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
  notesIndicateProRataOrCreditUpgrade,
} from './asaas/utils/formatters';
import {
  appendBillingNotesBlock,
  createBillingNotesForNewUpgradeRequest,
  parseBillingNotesDoc,
} from './asaas/utils/billing-notes-doc';
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
  updateSubscriptionBillingMethod as updateAsaasSubscriptionBillingMethod,
  retryPendingCreditCardSubscription,
} from './asaas/api/subscriptions';
import {
  getSubscriptionPayments,
  getFirstPaymentFromSubscription,
  getLatestPendingPaymentFromSubscription,
  createAsaasReplacementPayment,
  deletePendingPaymentsForSubscription,
  getAsaasPaymentStatus,
  getAsaasPaymentCheckoutUrls,
  updateAsaasPaymentValue,
  getPaymentBillingInfo,
  deleteAsaasPayment,
} from './asaas/api/payments';
import { getPixQrCodeFromPayment } from './asaas/api/pix';
import { reactivateAutoArchivedGalleries as reactivateAutoArchivedGalleriesImpl } from './asaas/gallery/adjustments';
import { cancelUpgradeRequest } from '@/core/services/billing.service';

/** Renovação de ciclo (mesmo plano no Asaas) — valor do enum em `tb_upgrade_requests.status`. */
export async function isRenewalUpgradeRequestStatus(
  status: string | null | undefined,
): Promise<boolean> {
  return String(status ?? '').toLowerCase() === UPGRADE_REQUEST_STATUS_RENEWED;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 TIPOS E INTERFACES (usados pelas funções abaixo)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CurrentActiveRequestRow {
  id: string;
  amount_final: number;
  amount_discount?: number | null;
  billing_type?: string | null;
  processed_at: string | null;
  created_at?: string | null;
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

type CouponApplyMode = 'once' | 'forever';
type CouponDiscountType = 'fixed' | 'percentage';

interface CouponRow {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  used_count: number | null;
  starts_at: string;
  expires_at: string | null;
  active: boolean | null;
  apply_mode: string;
}

interface ResolvedCoupon {
  row: CouponRow;
  applyMode: CouponApplyMode;
  discountType: CouponDiscountType;
  discountAmount: number;
  finalAmount: number;
  asaasDiscount?:
    | {
        value: number;
        dueDateLimitDays: number;
        type: 'FIXED' | 'PERCENTAGE';
      }
    | undefined;
}

function normalizeCouponDiscountType(
  v: string | null | undefined,
): CouponDiscountType {
  const raw = String(v ?? '').toLowerCase();
  return raw.includes('percent') || raw.includes('perc')
    ? 'percentage'
    : 'fixed';
}

function normalizeCouponApplyMode(
  v: string | null | undefined,
): CouponApplyMode {
  return String(v ?? '').toLowerCase() === 'forever' ? 'forever' : 'once';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateCouponDiscount(
  baseAmount: number,
  discountType: CouponDiscountType,
  discountValue: number,
): { discountAmount: number; finalAmount: number } {
  const normalizedBase = Math.max(0, round2(baseAmount));
  const normalizedDiscountValue = Math.max(0, round2(discountValue));
  const discountAmount =
    discountType === 'percentage'
      ? round2(normalizedBase * (normalizedDiscountValue / 100))
      : Math.min(normalizedBase, normalizedDiscountValue);
  return {
    discountAmount,
    finalAmount: round2(Math.max(0, normalizedBase - discountAmount)),
  };
}

async function resolveCouponForAmount(
  couponCodeRaw: string | null | undefined,
  amountBase: number,
): Promise<{ coupon?: ResolvedCoupon; error?: string }> {
  const couponCode = String(couponCodeRaw ?? '')
    .trim()
    .toUpperCase();
  if (!couponCode) return {};

  const admin = createSupabaseAdmin();
  const { data: coupon, error } = await admin
    .from('tb_coupons')
    .select(
      'id, code, discount_type, discount_value, max_uses, used_count, starts_at, expires_at, active, apply_mode',
    )
    .eq('code', couponCode)
    .maybeSingle();

  if (error) {
    return { error: 'Não foi possível validar o cupom no momento.' };
  }
  if (!coupon) return { error: 'Cupom inválido.' };
  if (coupon.active === false) return { error: 'Cupom inativo.' };

  const now = nowFn();
  const startsAt = new Date(coupon.starts_at);
  const expiresAt = coupon.expires_at ? new Date(coupon.expires_at) : null;
  if (!Number.isNaN(startsAt.getTime()) && startsAt.getTime() > now.getTime()) {
    return { error: 'Cupom ainda não está vigente.' };
  }
  if (
    expiresAt &&
    !Number.isNaN(expiresAt.getTime()) &&
    expiresAt.getTime() < now.getTime()
  ) {
    return { error: 'Cupom expirado.' };
  }
  if (
    typeof coupon.max_uses === 'number' &&
    (coupon.used_count ?? 0) >= coupon.max_uses
  ) {
    return { error: 'Cupom atingiu o limite de uso.' };
  }

  const discountType = normalizeCouponDiscountType(coupon.discount_type);
  const applyMode = normalizeCouponApplyMode(coupon.apply_mode);
  const { discountAmount, finalAmount } = calculateCouponDiscount(
    amountBase,
    discountType,
    Number(coupon.discount_value ?? 0),
  );

  const asaasDiscount =
    applyMode === 'once'
      ? {
          value:
            discountType === 'percentage'
              ? Number(coupon.discount_value ?? 0)
              : discountAmount,
          dueDateLimitDays: 0,
          type: (discountType === 'percentage' ? 'PERCENTAGE' : 'FIXED') as
            | 'PERCENTAGE'
            | 'FIXED',
        }
      : undefined;

  return {
    coupon: {
      row: coupon as CouponRow,
      applyMode,
      discountType,
      discountAmount,
      finalAmount,
      asaasDiscount,
    },
  };
}

async function applyCouponToCalculationPreview(
  calculation: UpgradePriceCalculation,
  couponCodeRaw: string | null | undefined,
): Promise<{ calculation: UpgradePriceCalculation; error?: string }> {
  const code = String(couponCodeRaw ?? '').trim();
  if (!code) return { calculation };

  const couponResolution = await resolveCouponForAmount(
    code,
    calculation.amount_final,
  );
  if (couponResolution.error)
    return { calculation, error: couponResolution.error };
  const coupon = couponResolution.coupon;
  if (!coupon) return { calculation };

  const nextAmountFinal =
    coupon.applyMode === 'forever'
      ? coupon.finalAmount
      : round2(Math.max(0, calculation.amount_final - coupon.discountAmount));
  return {
    calculation: {
      ...calculation,
      amount_final: nextAmountFinal,
      amount_discount: round2(
        calculation.amount_discount + coupon.discountAmount,
      ),
      coupon_code_applied: coupon.row.code,
      coupon_discount_amount: coupon.discountAmount,
      coupon_apply_mode: coupon.applyMode,
    },
  };
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
  return reactivateAutoArchivedGalleriesImpl(
    profileId,
    newPlanKey,
    supabaseClient,
  );
}

/**
 * Busca a solicitação que representa o plano ativo do usuário (`approved` ou `renewed`).
 * Renovações de ciclo gravam linha `renewed`; sem ela o pro-rata usaria o ciclo antigo.
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
      'id, amount_final, amount_discount, billing_type, processed_at, created_at, billing_period, plan_key_requested, asaas_subscription_id, notes',
    )
    .eq('profile_id', userId)
    .in('status', ['approved', UPGRADE_REQUEST_STATUS_RENEWED])
    .eq('plan_key_requested', currentPlanKey)
    .order('processed_at', { ascending: false })
    .limit(10);

  const list = (rows ?? []) as CurrentActiveRequestRow[];
  if (!list.length) return null;

  const now = nowFn();
  for (const row of list) {
    const referenceDate = row?.processed_at ?? row?.created_at ?? null;
    if (!referenceDate) continue;
    const start = new Date(referenceDate);
    if (Number.isNaN(start.getTime())) continue;
    let end = addMonths(start, billingPeriodToMonths(row.billing_period));
    const fromNotes = parseExpiryFromNotes(row.notes);
    if (fromNotes) end = fromNotes;
    if (end.getTime() >= now.getTime()) return row;
  }
  return list[0];
}

/**
 * Último request pago (approved ou renewed) com amount_final > 0 — base para pro-rata quando o ciclo atual tem valor zero no registro.
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
    .in('status', ['approved', UPGRADE_REQUEST_STATUS_RENEWED])
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
  const since = utcIsoOffsetFromNowMs(-PENDING_UPGRADE_MAX_AGE_MS);
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
            notes: appendBillingNotesBlock(
              null,
              'Invalidado para nova solicitação (pagamento já identificado no Asaas; valor será utilizado como crédito).',
            ),
            updated_at: utcIsoFrom(),
          })
          .eq('id', pending.id);
        return error
          ? { success: false, error: 'Erro ao atualizar solicitação anterior.' }
          : { success: true, paymentAlreadyReceived: true };
      }
    }
  }

  if (subId) {
    const res = await cancelAsaasSubscriptionById(subId, {
      deletePendingPayments: true,
    });
    if (!res.success) return { success: false, error: res.error };
  } else if (payId) {
    const res = await deleteAsaasPayment(payId);
    if (!res.success) return { success: false, error: res.error };
  }

  const { error } = await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      notes: appendBillingNotesBlock(
        null,
        'Invalidado para nova solicitação (usuário alterou plano/ciclo/método de pagamento).',
      ),
      updated_at: utcIsoFrom(),
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
  const now = nowFn();

  if (!planInfo || planInfo.price <= 0) {
    return {
      type: 'upgrade',
      amount_original: 0,
      amount_discount: 0,
      amount_final: 0,
      residual_credit: 0,
      current_plan_expires_at: utcIsoFrom(now),
      new_expiry_date: utcIsoFrom(
        addMonths(now, billingPeriodToMonths(targetPeriod)),
      ), // ✅
    };
  }

  const { totalPrice: totalPriceNew } = getPeriodPrice(planInfo, targetPeriod);
  const targetCommercialDays = billingPeriodToCommercialDays(targetPeriod);

  const startDateRaw =
    currentRequest?.processed_at ?? currentRequest?.created_at ?? null;
  if (!startDateRaw) {
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
      current_plan_expires_at: utcIsoFrom(now),
      new_expiry_date: utcIsoFrom(
        addMonths(now, billingPeriodToMonths(targetPeriod)),
      ),
    };
  }

  const startDate = new Date(startDateRaw);
  if (Number.isNaN(startDate.getTime())) {
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
      current_plan_expires_at: utcIsoFrom(now),
      new_expiry_date: utcIsoFrom(
        addMonths(now, billingPeriodToMonths(targetPeriod)),
      ),
    };
  }
  const monthsCurrent = billingPeriodToMonths(currentRequest.billing_period);
  let currentPlanExpiresAt = addMonths(startDate, monthsCurrent);
  const expiryFromNotes = parseExpiryFromNotes(currentRequest.notes);
  if (
    expiryFromNotes &&
    expiryFromNotes.getTime() > currentPlanExpiresAt.getTime()
  )
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
  const currentPlanFullPrice = planInfoCurrent
    ? getPeriodPrice(planInfoCurrent, currentPeriod).totalPrice
    : 0;
  const paidReferenceAmount =
    currentRequest.amount_final > 0
      ? currentRequest.amount_final
      : lastPaidAmountForProRata != null && lastPaidAmountForProRata > 0
        ? lastPaidAmountForProRata
        : 0;
  // Baseia o pro-rata no valor integral do plano atual (investimento teórico total).
  // Se houver um valor pago maior que o preço de tabela, preserva o maior valor.
  const amountForProRata = Math.max(currentPlanFullPrice, paidReferenceAmount);
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
      current_plan_expires_at: utcIsoFrom(currentPlanExpiresAt),
      new_expiry_date: utcIsoFrom(currentPlanExpiresAt),
    };
  }

  const targetIdx = planOrder.indexOf(targetPlanKey);
  const currentIdx = planOrder.indexOf(currentPlanKey);
  const isDowngrade =
    targetIdx < currentIdx ||
    (targetIdx === currentIdx &&
      periodOrder(targetPeriod) < periodOrder(currentPeriod));

  if (isDowngrade) {
    const isWithdrawalWindow =
      daysSincePurchase <= 7 && currentRequest.amount_final > 0;
    let isProRataDiscount = false;
    try {
      const doc = parseBillingNotesDoc(currentRequest.notes ?? null);
      isProRataDiscount = doc.noRefundCreditProRata === true;
    } catch {
      isProRataDiscount = false;
    }
    let previousCredit = 0;
    if (
      isWithdrawalWindow &&
      currentRequest.amount_final > 0 &&
      typeof currentRequest.amount_discount === 'number' &&
      currentRequest.amount_discount > 0 &&
      !isProRataDiscount
    ) {
      previousCredit = Math.max(0, currentRequest.amount_discount);
    }
    const creditForDowngrade = isWithdrawalWindow
      ? amountForProRata + previousCredit
      : 0;
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
          current_plan_expires_at: utcIsoFrom(currentPlanExpiresAt),
          downgrade_effective_at: utcIsoFrom(now),
          is_downgrade_withdrawal_window: true,
          days_since_purchase: daysSincePurchase,
          new_expiry_date: utcIsoFrom(newExpiry),
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
        current_plan_expires_at: utcIsoFrom(currentPlanExpiresAt),
        downgrade_effective_at: utcIsoFrom(now),
        is_downgrade_withdrawal_window: true,
        days_since_purchase: daysSincePurchase,
        new_expiry_date: utcIsoFrom(newExpiry),
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
      current_plan_expires_at: utcIsoFrom(currentPlanExpiresAt),
      downgrade_effective_at: utcIsoFrom(currentPlanExpiresAt),
      is_downgrade_withdrawal_window: false,
      days_since_purchase: daysSincePurchase,
    };
  }

  if (residualCredit >= totalPriceNew) {
    const dailyPriceNew = totalPriceNew / targetCommercialDays;
    const daysCovered =
      dailyPriceNew > 0
        ? Math.round(residualCredit / dailyPriceNew)
        : targetCommercialDays;
    const newExpiry = addDays(now, Math.max(targetCommercialDays, daysCovered));
    const monthsCovered = Math.max(
      1,
      Math.floor(Math.max(targetCommercialDays, daysCovered) / 30),
    );

    return {
      type: 'upgrade',
      is_free_upgrade: true,
      amount_original: totalPriceNew,
      amount_discount: totalPriceNew,
      amount_final: 0,
      residual_credit: residualCredit,
      current_plan_expires_at: utcIsoFrom(currentPlanExpiresAt),
      new_expiry_date: utcIsoFrom(newExpiry), // ✅ Data real
      free_upgrade_months_covered: monthsCovered,
      free_upgrade_days_extended: Math.max(targetCommercialDays, daysCovered),
    };
  }

  // Para cobrança imediata, o Asaas trabalha melhor com dias inteiros.
  // Mantemos `residual_credit` como crédito "preciso" (dias fracionários),
  // mas para o valor a pagar arredondamos os dias restantes para cima.
  const remainingDaysForPayment = Math.min(
    totalDaysCommercial,
    Math.ceil(Math.max(0, remainingDaysProRata)),
  );
  const creditForPayment = await calculateProRataCredit(
    amountForProRata,
    totalDaysCommercial,
    remainingDaysForPayment,
  );

  const amountToPayBeforePix = Math.max(
    0,
    Math.round((totalPriceNew - creditForPayment) * 100) / 100,
  );
  const pixDiscount =
    billingType === 'PIX' && targetPeriod !== 'monthly'
      ? Math.round(amountToPayBeforePix * (PIX_DISCOUNT_PERCENT / 100) * 100) /
        100
      : 0;

  return {
    type: 'upgrade',
    amount_original: totalPriceNew,
    amount_discount: creditForPayment + pixDiscount,
    amount_final: Math.round((amountToPayBeforePix - pixDiscount) * 100) / 100,
    residual_credit: residualCredit,
    pix_discount_amount: pixDiscount,
    current_plan_expires_at: utcIsoFrom(currentPlanExpiresAt),
    new_expiry_date: utcIsoFrom(
      addMonths(now, billingPeriodToMonths(targetPeriod)),
    ),
  };
}

function normalizeProfilePlanKeyForPreview(
  planKey: string | null | undefined,
): PlanKey {
  const raw = String(planKey ?? 'FREE')
    .trim()
    .toUpperCase() as PlanKey;
  return planOrder.includes(raw) ? raw : 'FREE';
}

/**
 * Preview de upgrade/downgrade para exibir no modal antes da confirmação.
 * Também detecta intenções de mudança agendadas (pending_change).
 */
export async function getUpgradePreview(
  targetPlanKey: PlanKey,
  targetPeriod: BillingPeriod,
  billingType: BillingType,
  segment: SegmentType = 'PHOTOGRAPHER',
  couponCode?: string,
): Promise<UpgradePreviewResult> {
  try {
    const { success, userId, profile } = await getAuthenticatedUser();
    if (!success || !userId)
      return {
        success: false,
        has_active_plan: false,
        error: 'Usuário não autenticado',
      };

    const profilePlanKeyForPreview = normalizeProfilePlanKeyForPreview(
      profile?.plan_key as string | undefined,
    );

    const supabase = await createSupabaseServerClient();

    const { data: latestRequestRow } = await supabase
      .from('tb_upgrade_requests')
      .select('status')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const latestRequestCancelled = latestRequestRow?.status === 'cancelled';

    // ── Verifica pending normal (pagamento em processamento) ────────────────
    const pending = await getPendingUpgradeRequest(userId, supabase);
    if (pending)
      return {
        success: true,
        has_active_plan: false,
        has_pending: true,
        calculation: undefined,
        latest_request_cancelled: latestRequestCancelled,
        profile_plan_key: profilePlanKeyForPreview,
      };

    const { data: pendingDowngradeRow } = await supabase
      .from('tb_upgrade_requests')
      .select('id')
      .eq('profile_id', userId)
      .eq('status', 'pending_downgrade')
      .limit(1)
      .maybeSingle();
    if (pendingDowngradeRow)
      return {
        success: true,
        has_active_plan: false,
        has_pending_downgrade: true,
        calculation: undefined,
        latest_request_cancelled: latestRequestCancelled,
        profile_plan_key: profilePlanKeyForPreview,
      };

    // ── NOVO: Verifica pending_change ativo ──────────────────────────────────
    const { data: scheduledChange } = await supabase
      .from('tb_upgrade_requests')
      .select('id, plan_key_requested, processed_at, billing_period')
      .eq('profile_id', userId)
      .eq('status', 'pending_change')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentPlanKeyFromProfile =
      profilePlanKeyForPreview !== 'FREE'
        ? profilePlanKeyForPreview
        : undefined;

    let current: CurrentActiveRequestRow | null = null;
    if (currentPlanKeyFromProfile) {
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
    const couponAppliedResult = await applyCouponToCalculationPreview(
      calculation,
      couponCode,
    );
    if (couponAppliedResult.error) {
      return {
        success: false,
        has_active_plan: false,
        error: couponAppliedResult.error,
      };
    }
    const calculationWithBillingType = couponAppliedResult.calculation
      ? {
          ...couponAppliedResult.calculation,
          current_billing_type:
            (current?.billing_type as BillingType | null) ?? null,
        }
      : couponAppliedResult.calculation;

    const hasPlan = !!current || !!currentPlanKeyFromProfile;

    return {
      success: true,
      has_active_plan: hasPlan,
      is_current_plan: couponAppliedResult.calculation.type === 'current_plan',
      latest_request_cancelled: latestRequestCancelled,
      profile_plan_key: profilePlanKeyForPreview,
      calculation: calculationWithBillingType,
      // Propaga info do pending_change para a UI
      ...(scheduledChange && {
        has_scheduled_change: true,
        scheduled_change_plan_key: scheduledChange.plan_key_requested as string,
        scheduled_change_effective_at:
          scheduledChange.processed_at ?? undefined,
      }),
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
    const { success, userId, email, profile } = await getAuthenticatedUser();
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
    const { success, userId, email, profile } = await getAuthenticatedUser();
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
 * Troca a forma de pagamento da assinatura vigente (server action).
 *
 * Fluxo por método:
 *
 * PIX / BOLETO:
 *   1. Atualiza método no Asaas (remove cartão, updatePendingPayments: true)
 *   2. Deleta cobranças pendentes antigas de outros métodos
 *   3. Busca/cria cobrança pendente no novo método
 *   4. Atualiza tb_upgrade_requests
 *
 * CREDIT_CARD:
 *   1. Tenta cobrar imediatamente (createAsaasReplacementPayment)
 *   2. Se cartão REJEITADO → rollback no Asaas, retorna erro, NÃO altera banco
 *   3. Se cartão APROVADO/PENDING →
 *      a. Atualiza método da assinatura no Asaas
 *      b. Deleta cobranças pendentes antigas de PIX/BOLETO
 *      c. Mantém a cobrança aprovada/pending do cartão
 *      d. Atualiza tb_upgrade_requests
 */
export async function updateSubscriptionBillingMethod(
  subscriptionId: string,
  newMethod: 'BOLETO' | 'PIX' | 'CREDIT_CARD',
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  } | null,
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
    mobilePhone: string;
  } | null,
  options?: {
    targetRequestId?: string | null;
  },
): Promise<{
  success: boolean;
  requestId?: string;
  newPaymentId?: string;
  paymentUrl?: string;
  paymentDueDate?: string;
  hasPendingPayment?: boolean;
  paymentStatus?: 'pending' | 'approved' | 'rejected' | 'overdue';
  pixData?: { qrCode?: string; copyPaste?: string };
  error?: string;
}> {
  try {
    const { success, userId, email, profile } = await getAuthenticatedUser();
    if (!success || !userId)
      return { success: false, error: 'Não autenticado' };

    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdmin();

    // ── 1. Busca o registro da assinatura ─────────────────────────────────────
    const baseSelect =
      'id, billing_type, status, notes, asaas_payment_id, asaas_subscription_id, ' +
      'asaas_raw_status, overdue_since, plan_key_current, plan_key_requested, ' +
      'billing_period, snapshot_name, snapshot_cpf_cnpj, snapshot_email, ' +
      'snapshot_whatsapp, snapshot_address, asaas_customer_id, ' +
      'amount_original, amount_discount, amount_final, installments, payment_url';

    const targetRequestId = options?.targetRequestId?.trim() || null;
    let currentReq: any = null;

    if (targetRequestId) {
      const { data, error } = await supabase
        .from('tb_upgrade_requests')
        .select(baseSelect)
        .eq('profile_id', userId)
        .eq('id', targetRequestId)
        .maybeSingle();
      if (error)
        return {
          success: false,
          error: 'Erro ao carregar registro da assinatura.',
        };
      currentReq = data;
      if (
        currentReq &&
        String(currentReq.asaas_subscription_id ?? '').trim() !==
          String(subscriptionId ?? '').trim()
      ) {
        return { success: false, error: 'Assinatura inválida.' };
      }
    } else {
      const { data, error } = await supabase
        .from('tb_upgrade_requests')
        .select(baseSelect)
        .eq('profile_id', userId)
        .eq('asaas_subscription_id', subscriptionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error)
        return {
          success: false,
          error: 'Erro ao carregar registro da assinatura.',
        };
      currentReq = data;
    }

    if (!currentReq?.id) {
      return {
        success: false,
        error:
          'Não foi possível localizar o registro da sua assinatura para atualizar o pagamento.',
      };
    }

    const asaasSubscriptionId = String(
      currentReq.asaas_subscription_id ?? subscriptionId,
    ).trim();
    const asaasCustomerId = String(currentReq.asaas_customer_id ?? '').trim();
    const amountFinal = Number(currentReq.amount_final ?? 0);
    const previousMethod = String(currentReq.billing_type ?? '')
      .trim()
      .toUpperCase() as 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    const nowIso = utcIsoFrom();
    const isOpenPaymentStatus = (status: string | null | undefined) => {
      const s = String(status ?? '').toUpperCase();
      return s === 'PENDING' || s === 'OVERDUE' || s === 'AWAITING_RISK_ANALYSIS';
    };

    // ── 2. Fluxo CREDIT_CARD ──────────────────────────────────────────────────
    if (newMethod === 'CREDIT_CARD') {
      if (!creditCard || !creditCardHolderInfo) {
        return { success: false, error: 'Dados do cartão são obrigatórios.' };
      }
      if (!(amountFinal > 0) || !asaasCustomerId) {
        return {
          success: false,
          error: 'Dados da assinatura incompletos para cobrar no cartão.',
        };
      }

      const holderEmailCandidates = [
        String(creditCardHolderInfo.email ?? '').trim(),
        String(email ?? '').trim(),
        String(currentReq.snapshot_email ?? '').trim(),
      ].filter(Boolean);
      const holderEmail = holderEmailCandidates[0] ?? '';
      const isHolderEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(holderEmail);
      if (!isHolderEmailValid) {
        return {
          success: false,
          paymentStatus: 'rejected',
          error:
            'Informe um e-mail válido do titular do cartão para processar a cobrança.',
        };
      }

      const holderPhoneCandidates = [
        String(creditCardHolderInfo.phone ?? '').replace(/\D/g, ''),
        String(creditCardHolderInfo.mobilePhone ?? '').replace(/\D/g, ''),
        String(currentReq.snapshot_whatsapp ?? '').replace(/\D/g, ''),
        String(profile?.phone_contact ?? '').replace(/\D/g, ''),
      ].filter((value) => value.length >= 10);
      const holderPhone = holderPhoneCandidates[0] ?? '';
      if (!holderPhone) {
        return {
          success: false,
          paymentStatus: 'rejected',
          error:
            'Informe o número de contato com DDD do titular do cartão para processar a cobrança.',
        };
      }
      const normalizedCreditCardHolderInfo = {
        ...creditCardHolderInfo,
        email: holderEmail,
        phone: holderPhone,
        mobilePhone: holderPhone,
      };

      // 2a. Tenta cobrar imediatamente no cartão
      const dueDate = nowIso.split('T')[0];
      const cardCharge = await createAsaasReplacementPayment({
        customerId: asaasCustomerId,
        subscriptionId: asaasSubscriptionId,
        billingType: 'CREDIT_CARD',
        value: amountFinal,
        dueDate,
        description: `Pagamento de assinatura ${String(currentReq.plan_key_requested ?? '').trim() || 'plano'}`,
        creditCard,
        creditCardHolderInfo: normalizedCreditCardHolderInfo,
      });

      // 2b. Cartão rejeitado → não altera nada
      if (!cardCharge.success || !cardCharge.paymentId) {
        return {
          success: false,
          paymentStatus: 'rejected',
          error:
            cardCharge.error ??
            'Cartão não aprovado. Nenhuma alteração foi realizada.',
        };
      }

      // Verifica status real da cobrança
      const statusRes = await getAsaasPaymentStatus(cardCharge.paymentId);
      const gatewayStatus = String(statusRes.status ?? '').toUpperCase();
      const isRejected =
        gatewayStatus === 'REFUSED' ||
        gatewayStatus === 'FAILED' ||
        gatewayStatus === 'OVERDUE';

      if (isRejected) {
        // Tenta apagar a cobrança recém-criada (cleanup)
        await deleteAsaasPayment(cardCharge.paymentId).catch(() => {});
        return {
          success: false,
          paymentStatus: 'rejected',
          error: 'Cartão não aprovado. Nenhuma alteração foi realizada.',
        };
      }

      // 2c. Cartão aprovado/pendente → atualiza método da assinatura no Asaas
      const asaasUpdate = await updateAsaasSubscriptionBillingMethod(
        asaasSubscriptionId,
        'CREDIT_CARD',
        creditCard,
        normalizedCreditCardHolderInfo,
      );
      if (!asaasUpdate.success) {
        // Cleanup: remove a cobrança avulsa criada pois não conseguimos atualizar a assinatura
        await deleteAsaasPayment(cardCharge.paymentId).catch(() => {});
        return {
          success: false,
          error:
            asaasUpdate.error ?? 'Erro ao atualizar assinatura no gateway.',
        };
      }

      // 2d. Apaga cobranças pendentes antigas de PIX/BOLETO
      if (previousMethod !== 'CREDIT_CARD') {
        const oldPendings = await getSubscriptionPayments(asaasSubscriptionId);
        if (oldPendings.success && Array.isArray(oldPendings.payments)) {
          for (const p of oldPendings.payments) {
            const pid = String(p.id ?? '').trim();
            if (!pid || pid === cardCharge.paymentId) continue;
            if (!isOpenPaymentStatus(p.status)) continue;
            const info = await getPaymentBillingInfo(pid);
            const pType = String(info.billingType ?? '').toUpperCase();
            if (pType !== 'CREDIT_CARD') {
              await deleteAsaasPayment(pid).catch(() => {});
            }
          }
        }
      }

      // 2e. Atualiza tb_upgrade_requests
      const isApproved =
        gatewayStatus === 'RECEIVED' ||
        gatewayStatus === 'CONFIRMED' ||
        gatewayStatus === 'RECEIVED_IN_CASH';

      const historyLine = `[PaymentMethodChange ${nowIso}] ${previousMethod} -> CREDIT_CARD`;
      const nextNotes = appendBillingNotesBlock(currentReq.notes, historyLine);

      const updatePatch: Record<string, unknown> = {
        billing_type: 'CREDIT_CARD',
        asaas_payment_id: cardCharge.paymentId,
        payment_url: cardCharge.invoiceUrl ?? null,
        asaas_raw_status: isApproved ? 'RECEIVED' : 'PENDING',
        status: isApproved ? 'approved' : 'pending',
        notes: nextNotes,
        updated_at: nowIso,
      };

      const { error: updErr } = await admin
        .from('tb_upgrade_requests')
        .update(updatePatch)
        .eq('id', currentReq.id)
        .eq('profile_id', userId);

      if (updErr) {
        return {
          success: false,
          error:
            'Pagamento processado no Asaas, mas falhou ao salvar no sistema.',
        };
      }

      revalidatePath('/dashboard/assinatura');
      await revalidateUserCache(userId);

      return {
        success: true,
        requestId: currentReq.id,
        newPaymentId: cardCharge.paymentId,
        paymentUrl: cardCharge.invoiceUrl ?? undefined,
        paymentDueDate: cardCharge.dueDate ?? undefined,
        hasPendingPayment: !isApproved,
        paymentStatus: isApproved ? 'approved' : 'pending',
      };
    }

    // ── 3. Fluxo PIX / BOLETO ─────────────────────────────────────────────────

    // 3a. Atualiza método no Asaas (remove cartão se havia, gera nova cobrança)
    const asaasUpdate = await updateAsaasSubscriptionBillingMethod(
      asaasSubscriptionId,
      newMethod,
      null,
      null,
    );
    if (!asaasUpdate.success) {
      return {
        success: false,
        error: asaasUpdate.error ?? 'Erro ao atualizar método no gateway.',
      };
    }

    // 3b. Deleta cobranças em aberto de outros métodos (PENDING/OVERDUE/etc)
    const oldPendings = await getSubscriptionPayments(asaasSubscriptionId);
    if (oldPendings.success && Array.isArray(oldPendings.payments)) {
      for (const p of oldPendings.payments) {
        const pid = String(p.id ?? '').trim();
        if (!pid) continue;
        if (!isOpenPaymentStatus(p.status)) continue;
        const info = await getPaymentBillingInfo(pid);
        const pType = String(info.billingType ?? '').toUpperCase();
        // Mantém apenas cobranças do novo método
        if (pType !== newMethod) {
          await deleteAsaasPayment(pid).catch(() => {});
        }
      }
    }

    // 3c. Busca a cobrança pendente gerada pelo Asaas
    let newPaymentId: string | undefined;
    let paymentUrl: string | undefined;
    let paymentDueDate: string | undefined;

    const pendingPayment =
      await getLatestPendingPaymentFromSubscription(asaasSubscriptionId);
    if (pendingPayment.success && pendingPayment.paymentId) {
      newPaymentId = pendingPayment.paymentId;
      paymentUrl =
        newMethod === 'BOLETO'
          ? (pendingPayment.bankSlipUrl ?? pendingPayment.invoiceUrl)
          : (pendingPayment.invoiceUrl ?? pendingPayment.bankSlipUrl);
      paymentDueDate = pendingPayment.dueDate;
    } else {
      // Fallback: cria nova cobrança manualmente
      if (amountFinal > 0 && asaasCustomerId) {
        const dueDate = nowIso.split('T')[0];
        const created = await createAsaasReplacementPayment({
          customerId: asaasCustomerId,
          subscriptionId: asaasSubscriptionId,
          billingType: newMethod,
          value: amountFinal,
          dueDate,
          description: `Pagamento de assinatura ${String(currentReq.plan_key_requested ?? '').trim() || 'plano'}`,
          creditCard: null,
          creditCardHolderInfo: null,
        });
        if (created.success && created.paymentId) {
          newPaymentId = created.paymentId;
          paymentUrl =
            newMethod === 'BOLETO'
              ? (created.bankSlipUrl ?? created.invoiceUrl)
              : (created.invoiceUrl ?? created.bankSlipUrl);
          paymentDueDate = created.dueDate;
        }
      }
    }

    // 3d. Corrige valor pro-rata se havia desconto
    if (newPaymentId) {
      const amountOriginal = Number(currentReq.amount_original ?? 0);
      if (amountFinal > 0 && amountFinal < amountOriginal) {
        await updateAsaasPaymentValue(newPaymentId, amountFinal).catch(
          () => {},
        );
      }
    }

    // 3e. Busca dados PIX / URL boleto
    let pixData: { qrCode?: string; copyPaste?: string } | undefined;

    if (newMethod === 'PIX' && newPaymentId) {
      const pixQr = await getPixQrCodeFromPayment(newPaymentId);
      if (pixQr.success) {
        pixData = { qrCode: pixQr.encodedImage, copyPaste: pixQr.payload };
      }
    }

    if (newMethod === 'BOLETO' && newPaymentId && !paymentUrl) {
      const checkout = await getAsaasPaymentCheckoutUrls(newPaymentId);
      if (checkout.success) {
        paymentUrl = checkout.bankSlipUrl ?? checkout.invoiceUrl;
        paymentDueDate = checkout.dueDate ?? paymentDueDate;
      }
    }

    // 3f. Atualiza tb_upgrade_requests
    const historyLine = `[PaymentMethodChange ${nowIso}] ${previousMethod} -> ${newMethod}`;
    const nextNotes = appendBillingNotesBlock(currentReq.notes, historyLine);

    const updatePatch: Record<string, unknown> = {
      billing_type: newMethod,
      notes: nextNotes,
      updated_at: nowIso,
    };

    if (newPaymentId) {
      updatePatch.asaas_payment_id = newPaymentId;
      updatePatch.payment_url = paymentUrl ?? null;
      updatePatch.asaas_raw_status = 'PENDING';
      updatePatch.status = 'pending';
    }

    const { error: updErr } = await admin
      .from('tb_upgrade_requests')
      .update(updatePatch)
      .eq('id', currentReq.id)
      .eq('profile_id', userId);

    if (updErr) {
      return {
        success: false,
        error:
          'Pagamento atualizado no Asaas, mas falhou ao salvar no sistema.',
      };
    }

    revalidatePath('/dashboard/assinatura');
    await revalidateUserCache(userId);

    return {
      success: true,
      requestId: currentReq.id,
      ...(newPaymentId && { newPaymentId }),
      ...(paymentUrl && { paymentUrl }),
      ...(paymentDueDate && { paymentDueDate }),
      hasPendingPayment: !!newPaymentId,
      paymentStatus: 'pending',
      ...(pixData && { pixData }),
    };
  } catch (e) {
    console.error('[updateSubscriptionBillingMethod] Error:', e);
    return { success: false, error: 'Erro ao alterar forma de pagamento.' };
  }
}

export async function deletePendingInvoiceBeforeBillingChange(
  subscriptionId: string,
  options?: { targetRequestId?: string | null },
): Promise<{ success: boolean; deleted: boolean; error?: string }> {
  try {
    const { success, userId } = await getAuthenticatedUser();
    if (!success || !userId) {
      return { success: false, deleted: false, error: 'Não autenticado.' };
    }

    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdmin();
    const targetRequestId = options?.targetRequestId?.trim() || null;
    const subId = String(subscriptionId ?? '').trim();
    if (!subId) {
      return {
        success: false,
        deleted: false,
        error: 'Assinatura inválida para remover cobrança pendente.',
      };
    }

    const baseSelect = 'id, asaas_payment_id, asaas_subscription_id';
    let currentReq: any = null;
    if (targetRequestId) {
      const byId = await supabase
        .from('tb_upgrade_requests')
        .select(baseSelect)
        .eq('profile_id', userId)
        .eq('id', targetRequestId)
        .maybeSingle();
      if (byId.error) {
        return {
          success: false,
          deleted: false,
          error: 'Não foi possível localizar a cobrança pendente.',
        };
      }
      currentReq = byId.data;
      if (
        currentReq &&
        String(currentReq.asaas_subscription_id ?? '').trim() !== subId
      ) {
        return {
          success: false,
          deleted: false,
          error: 'Assinatura inválida.',
        };
      }
    } else {
      const latest = await supabase
        .from('tb_upgrade_requests')
        .select(baseSelect)
        .eq('profile_id', userId)
        .eq('asaas_subscription_id', subId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest.error) {
        return {
          success: false,
          deleted: false,
          error: 'Não foi possível localizar a cobrança pendente.',
        };
      }
      currentReq = latest.data;
    }

    let paymentId = String(currentReq?.asaas_payment_id ?? '').trim() || null;
    if (!paymentId) {
      const pending = await getLatestPendingPaymentFromSubscription(subId);
      if (!pending.success) {
        return {
          success: false,
          deleted: false,
          error:
            pending.error ??
            'Não foi possível localizar cobrança pendente no gateway.',
        };
      }
      paymentId = pending.paymentId ?? null;
    }

    if (!paymentId) {
      return { success: true, deleted: false };
    }

    const deleted = await deleteAsaasPayment(paymentId);
    if (!deleted.success) {
      return {
        success: false,
        deleted: false,
        error:
          deleted.error ??
          'Não foi possível remover a cobrança pendente antiga.',
      };
    }

    if (currentReq?.id) {
      await admin
        .from('tb_upgrade_requests')
        .update({
          asaas_payment_id: null,
          payment_url: null,
          updated_at: utcIsoFrom(),
        })
        .eq('id', currentReq.id)
        .eq('profile_id', userId);
    }

    return { success: true, deleted: true };
  } catch (e) {
    console.error('[deletePendingInvoiceBeforeBillingChange] Error:', e);
    return {
      success: false,
      deleted: false,
      error:
        'Erro ao remover cobrança pendente antiga. Tente novamente em instantes.',
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
  options?: { skipRevalidatePath?: boolean },
): Promise<{
  success: boolean;
  needs_adjustment: boolean;
  excess_galleries: Array<{ id: string; title: string }>;
  error?: string;
}> {
  const supabase = supabaseClient ?? (await createSupabaseAdmin());

  const readFirstUpgradeRequestById = async (
    requestId: string,
  ): Promise<{
    notes?: string | null;
    asaas_subscription_id?: string | null;
  } | null> => {
    const queryResult = (await supabase
      .from('tb_upgrade_requests')
      .select('notes, asaas_subscription_id')
      .eq('id', requestId)) as unknown as {
      data?:
        | { notes?: string | null; asaas_subscription_id?: string | null }
        | Array<{
            notes?: string | null;
            asaas_subscription_id?: string | null;
          }>
        | null;
    };
    if (!queryResult?.data) return null;
    return Array.isArray(queryResult.data)
      ? (queryResult.data[0] ?? null)
      : queryResult.data;
  };

  const resolveAsaasSubscriptionIdForDowngrade = async (
    requestId: string | null,
    profileMetadata: Record<string, unknown> | null | undefined,
  ): Promise<string | null> => {
    // 1) prioridade: request alvo do downgrade
    if (requestId) {
      const fromRequest = await readFirstUpgradeRequestById(requestId).catch(
        () => null,
      );
      const subId = fromRequest?.asaas_subscription_id?.trim();
      if (subId) return subId;
    }

    // 2) fallback: requests do perfil (mais recente com subscription_id válido)
    try {
      const historyResult = (await supabase
        .from('tb_upgrade_requests')
        .select('asaas_subscription_id, created_at')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20)) as unknown as {
        data?: Array<{
          asaas_subscription_id?: string | null;
          created_at?: string | null;
        }> | null;
      };
      const historySubId =
        (historyResult.data ?? [])
          .map((r) => r.asaas_subscription_id?.trim())
          .find((v) => !!v) ?? null;
      if (historySubId) return historySubId;
    } catch (e) {
      console.warn('[Downgrade] Fallback por histórico indisponível:', e);
    }

    // 3) fallback: customer_id (tb_billing_profiles ou metadata do perfil) -> assinatura ativa no Asaas
    let customerId: string | null = null;
    try {
      const billingRow = await supabase
        .from('tb_billing_profiles')
        .select('asaas_customer_id')
        .eq('id', profileId)
        .maybeSingle();
      customerId = billingRow.data?.asaas_customer_id?.trim() ?? null;
    } catch (e) {
      console.warn('[Downgrade] Fallback por billing profile indisponível:', e);
    }

    if (!customerId && profileMetadata && typeof profileMetadata === 'object') {
      const md = profileMetadata as Record<string, unknown>;
      const direct = md.asaas_customer_id;
      const billing = md.billing;
      if (typeof direct === 'string' && direct.trim()) {
        customerId = direct.trim();
      } else if (
        billing &&
        typeof billing === 'object' &&
        typeof (billing as Record<string, unknown>).asaas_customer_id ===
          'string' &&
        (billing as Record<string, unknown>).asaas_customer_id
      ) {
        customerId = String(
          (billing as Record<string, unknown>).asaas_customer_id,
        ).trim();
      }
    }

    if (!customerId) return null;
    const activeSub = await getActiveSubscriptionIdForCustomer(customerId);
    if (activeSub.success && activeSub.subscriptionId) {
      return activeSub.subscriptionId.trim();
    }
    return null;
  };

  const ensureAsaasSubscriptionClosed = async (
    subscriptionId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const preStatus = await getAsaasSubscription(subscriptionId).catch(
      () => null,
    );
    const status = String(preStatus?.status ?? '').toUpperCase();
    if (preStatus?.success && (status === 'INACTIVE' || status === 'EXPIRED')) {
      return { success: true };
    }

    const cancelResult = await cancelAsaasSubscriptionById(subscriptionId, {
      deletePendingPayments: true,
    });
    if (cancelResult.success) return { success: true };

    // Hardening: alguns cenários já cancelaram no Asaas, mas o DELETE devolve erro de estado.
    const postStatus = await getAsaasSubscription(subscriptionId).catch(
      () => null,
    );
    const normalizedPost = String(postStatus?.status ?? '').toUpperCase();
    if (
      postStatus?.success &&
      (normalizedPost === 'INACTIVE' || normalizedPost === 'EXPIRED')
    ) {
      return { success: true };
    }
    return {
      success: false,
      error:
        cancelResult.error ??
        'Não foi possível encerrar a assinatura no gateway.',
    };
  };

  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('plan_key, is_exempt, is_trial, metadata')
    .eq('id', profileId)
    .single();
  if (profile?.is_exempt === true)
    return { success: true, needs_adjustment: false, excess_galleries: [] };

  const oldPlan = (profile?.plan_key as string) ?? 'FREE';
  if (oldPlan === 'FREE')
    return { success: true, needs_adjustment: false, excess_galleries: [] };

  const resolvedSubscriptionId = await resolveAsaasSubscriptionIdForDowngrade(
    upgradeRequestId,
    (profile?.metadata as Record<string, unknown> | null | undefined) ?? null,
  );
  if (resolvedSubscriptionId) {
    const closeResult = await ensureAsaasSubscriptionClosed(
      resolvedSubscriptionId,
    );
    if (!closeResult.success) {
      return {
        success: false,
        needs_adjustment: false,
        excess_galleries: [],
        error:
          closeResult.error ??
          'Não foi possível encerrar a assinatura no gateway.',
      };
    }
  } else if (profile?.is_trial === false) {
    // Fail-safe para plano pago: sem assinatura resolvida, não aplica FREE para evitar estado inconsistente.
    return {
      success: false,
      needs_adjustment: false,
      excess_galleries: [],
      error:
        'Não foi possível localizar a assinatura no gateway para encerramento antes do downgrade.',
    };
  }

  const newMetadata = {
    ...(profile?.metadata ?? {}),
    last_downgrade_alert_viewed: false,
    downgrade_reason: reason,
    downgrade_at: utcIsoFrom(),
  };

  const { error: planError } = await supabase
    .from('tb_profiles')
    .update({
      plan_key: 'FREE',
      metadata: newMetadata,
      updated_at: utcIsoFrom(),
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
    const reqNotesRow = await readFirstUpgradeRequestById(
      upgradeRequestId,
    ).catch(() => null);
    await supabase
      .from('tb_upgrade_requests')
      .update({
        status: 'cancelled',
        notes: appendBillingNotesBlock(reqNotesRow?.notes ?? null, reason),
        processed_at: utcIsoFrom(),
        updated_at: utcIsoFrom(),
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
        updated_at: utcIsoFrom(),
      })
      .in('id', excessIds);
    if (hideError)
      console.warn(
        '[Downgrade] Não foi possível ocultar galerias excedentes:',
        hideError,
      );
  }

  if (!options?.skipRevalidatePath) {
    revalidatePath('/dashboard', 'layout');
  }

  return { success: true, ...adjustment };
}

/**
 * Cancela a assinatura do usuário autenticado.
 */
export async function handleSubscriptionCancellation(
  opts:
    | {
        reason?: string | null;
        comment?: string;
        allowImmediateRefund?: boolean;
      }
    | Awaited<ReturnType<typeof createSupabaseServerClient>> = {},
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<CancellationResult> {
  let reason: string | null = null;
  let comment = '';
  let allowImmediateRefund = true;
  let resolvedSupabase = supabaseClient;
  if (opts && typeof (opts as { from?: unknown }).from === 'function') {
    resolvedSupabase = opts as Awaited<
      ReturnType<typeof createSupabaseServerClient>
    >;
  } else {
    const o = opts as {
      reason?: string | null;
      comment?: string;
      allowImmediateRefund?: boolean;
    };
    reason = o.reason ?? null;
    comment = o.comment ?? '';
    allowImmediateRefund =
      typeof o.allowImmediateRefund === 'boolean'
        ? o.allowImmediateRefund
        : true;
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
      'renewed',
      'pending_cancellation',
      'pending_downgrade',
    ])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request)
    return { success: false, error: 'Nenhuma assinatura ativa encontrada.' };

  /** Upgrade com pagamento em aberto: rollback no Asaas — não agendale encerramento no ciclo. */
  if (request.status === 'pending' || request.status === 'processing') {
    const rolled = await cancelUpgradeRequest(request.id as string);
    if (!rolled.success) {
      return {
        success: false,
        error:
          rolled.error ??
          'Não foi possível cancelar a solicitação de upgrade pendente.',
      };
    }
    revalidatePath('/dashboard/assinatura');
    await revalidateUserCache(userId).catch((err) =>
      console.warn('[Cancellation] revalidateUserCache:', err),
    );
    return { success: true, type: 'pending_upgrade_rolled_back' };
  }

  const purchaseDate = request.processed_at
    ? new Date(request.processed_at as string)
    : new Date(request.created_at);
  const now = nowFn();
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
  let hasProRataCreditInNotes = notesIndicateProRataOrCreditUpgrade(
    request.notes,
  );
  const subIdForProRata = String(request.asaas_subscription_id ?? '').trim();
  if (!hasProRataCreditInNotes && subIdForProRata) {
    const { data: subHistoryRows } = await supabase
      .from('tb_upgrade_requests')
      .select('notes')
      .eq('profile_id', userId)
      .eq('asaas_subscription_id', subIdForProRata);
    hasProRataCreditInNotes = (subHistoryRows ?? []).some((row) =>
      notesIndicateProRataOrCreditUpgrade(row.notes),
    );
  }

  if (
    request.status === 'pending_downgrade' ||
    request.status === 'pending_cancellation'
  ) {
    return {
      success: true,
      type: 'scheduled_cancellation',
      access_ends_at: utcIsoFrom(accessEndsAt),
    };
  }

  /** Fim do dia (America/Sao_Paulo) como instante UTC — sempre via `utcIsoFrom`. */
  const accessEndsAtIso = utcIsoFrom(
    new Date(`${getSaoPauloDateString(accessEndsAt)}T23:59:59-03:00`),
  );
  const endDateStr = utcIsoFrom(accessEndsAt).split('T')[0];
  let amountPaid =
    typeof (request as any).amount_final === 'number' &&
    (request as any).amount_final > 0
      ? (request as any).amount_final
      : 0;

  if (amountPaid === 0) {
    const lastPaid = await getLastPaidUpgradeRequest(userId, supabase);
    if (lastPaid?.amount_final && lastPaid.amount_final > 0) {
      amountPaid = lastPaid.amount_final;
    }
  }

  const amountPaidFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.max(0, amountPaid));

  // Renovação nunca entra no fluxo de estorno imediato por arrependimento.
  const isRenewedCancellation =
    String(request.status ?? '').toLowerCase() === 'renewed';

  if (
    allowImmediateRefund &&
    daysSincePurchase <= 7 &&
    request.status === 'approved' &&
    amountPaid > 0 &&
    !hasProRataCreditInNotes &&
    !isRenewedCancellation
  ) {
    if (request.asaas_subscription_id) {
      const cancelResult = await cancelAsaasSubscriptionById(
        request.asaas_subscription_id as string,
        { deletePendingPayments: true },
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
          updated_at: utcIsoFrom(now),
        })
        .eq('id', userId);
    }

    const downgradeResult = await performDowngradeToFree(
      userId,
      request.id,
      buildCancellationNotes(
        `Cancelamento com direito de arrependimento (${daysSincePurchase}d após compra). Estorno: SIM (${amountPaidFormatted}).`,
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

  const { data: updatedCancelRow, error: updateCancelErr } = await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'pending_downgrade',
      processed_at: accessEndsAtIso,
      scheduled_cancel_at: accessEndsAtIso,
      notes: appendBillingNotesBlock(
        request.notes as string | null | undefined,
        buildCancellationNotes(
          `Cancelamento solicitado em ${utcIsoFrom(now)}. Acesso até ${accessEndsAtIso}. Estorno: NÃO.`,
          reason,
          comment,
        ),
      ),
      updated_at: utcIsoFrom(now),
    })
    .eq('id', request.id)
    .select('id, scheduled_cancel_at, status')
    .maybeSingle();
  if (updateCancelErr) {
    console.error(
      '[Cancellation] failed to persist pending_downgrade:',
      updateCancelErr,
    );
    return {
      success: false,
      error: updateCancelErr.message?.includes('scheduled_cancel_at')
        ? 'A coluna scheduled_cancel_at ainda não foi aplicada no banco. Execute as migrations pendentes.'
        : 'Não foi possível salvar o cancelamento no histórico local.',
    };
  }
  // Hardening: alguns ambientes podem limpar/ignorar campos via trigger.
  // Se scheduled_cancel_at não voltar preenchido, forçamos em um 2º update.
  if (!updatedCancelRow?.id || !updatedCancelRow?.scheduled_cancel_at) {
    const { data: forcedRow, error: forceScheduleErr } = await supabase
      .from('tb_upgrade_requests')
      .update({
        scheduled_cancel_at: accessEndsAtIso,
        updated_at: utcIsoFrom(now),
      })
      .eq('id', request.id)
      .eq('profile_id', userId)
      .select('id, scheduled_cancel_at')
      .maybeSingle();
    if (forceScheduleErr) {
      console.error(
        '[Cancellation] failed to force scheduled_cancel_at:',
        forceScheduleErr,
      );
      return {
        success: false,
        error:
          'Cancelamento registrado, mas não foi possível persistir scheduled_cancel_at.',
      };
    }
    if (!forcedRow?.id || !forcedRow?.scheduled_cancel_at) {
      return {
        success: false,
        error:
          'Cancelamento não foi aplicado ao registro local. Verifique políticas RLS da tb_upgrade_requests.',
      };
    }
  }
  await supabase.from('tb_plan_history').insert({
    profile_id: userId,
    old_plan: request.plan_key_requested as string,
    new_plan: request.plan_key_requested as string,
    reason: `Cancelamento agendado. Acesso até ${accessEndsAtIso}`,
  });
  revalidatePath('/dashboard', 'layout');

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

  if (nowFn().getTime() < accessEndsAt.getTime())
    return { applied: false, needs_adjustment: false, excess_galleries: [] };

  const result = await performDowngradeToFree(
    profileId,
    pendingCancel.id,
    `Downgrade automático após término do período pago (expirou em ${utcIsoFrom(accessEndsAt)})`,
    supabase,
    { skipRevalidatePath: true },
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

  const { data: pendingDowngradeBlock } = await supabase
    .from('tb_upgrade_requests')
    .select('id')
    .eq('profile_id', userId)
    .eq('status', 'pending_downgrade')
    .limit(1)
    .maybeSingle();
  if (pendingDowngradeBlock) {
    return {
      success: false,
      error:
        'Há um cancelamento com downgrade agendado. Não é possível contratar um novo plano até essa solicitação ser concluída ou alterada.',
    };
  }

  const { data: overdueBlock } = await supabase
    .from('tb_upgrade_requests')
    .select('id')
    .eq('profile_id', userId)
    .not('overdue_since', 'is', null)
    .limit(1)
    .maybeSingle();
  if (overdueBlock) {
    return {
      success: false,
      error:
        'Você possui uma fatura em atraso. Por favor, acesse a aba Assinatura e regularize o pagamento pendente antes de alterar seu plano.',
    };
  }

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

  const effectiveBillingType: BillingType =
    calculation.type === 'downgrade' &&
    calculation.is_downgrade_withdrawal_window === true &&
    currentRequest?.billing_type
      ? (currentRequest.billing_type as BillingType)
      : payload.billing_type;

  const billingFullName = payload.full_name?.trim() ?? profile.full_name ?? '';
  const snapshot_address = formatSnapshotAddress(payload);

  // ── Upgrade Gratuito ──────────────────────────────────────────────────────
  if (calculation.is_free_upgrade && calculation.amount_final === 0) {
    const nowStr = utcIsoFrom();
    const planDescription = `Plano ${planInfo.name}`;
    const nextDueStr = calculation.new_expiry_date?.split('T')[0];
    const asaasCycle: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY' =
      billingPeriod === 'annual'
        ? 'YEARLY'
        : billingPeriod === 'semiannual'
          ? 'SEMIANNUALLY'
          : 'MONTHLY';
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
          cycle: asaasCycle,
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
      `Saldo residual R$ ${calculation.residual_credit.toFixed(2)}; próximo vencimento do plano: ${nextDueStr ?? 'N/A'}.\n` +
      notesAsaasSync.trimStart();

    const { data: freeRow, error: freeErr } = await supabase
      .from('tb_upgrade_requests')
      .insert({
        profile_id: userId,
        plan_key_current: planKeyCurrent,
        plan_key_requested: planKey,
        billing_type: effectiveBillingType,
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
        processed_at: nowStr,
        notes: createBillingNotesForNewUpgradeRequest({
          logBody: notes,
          noRefundFreeCreditUpgrade: true,
        }),
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
      .update({ plan_key: planKey, updated_at: nowStr })
      .eq('id', userId);

    await reactivateAutoArchivedGalleries(userId, planKey, supabase);
    revalidatePath('/dashboard', 'layout');

    await revalidateUserCache(userId).catch((e) =>
      console.warn('[Upgrade gratuito] revalidateUserCache:', e),
    );
    return {
      success: true,
      billing_type: effectiveBillingType,
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
  const nextDueDateFromCalculation =
    calculation.new_expiry_date?.split('T')[0] ?? null;
  const residualCreditValue = calculation.residual_credit ?? 0;
  const hasResidualCredit = residualCreditValue > 0;
  const notesCredit =
    hasResidualCredit && amountDiscount > 0
      ? `Aproveitamento de crédito pro-rata: R$ ${residualCreditValue.toFixed(2)} (dias não utilizados do plano anterior). Desconto total aplicado: R$ ${amountDiscount.toFixed(2)}. Valor final cobrado: R$ ${amountFinal.toFixed(2)}.${hasCreditNextDueDate && nextDueDateFromCalculation ? ` Próximo vencimento do plano: ${nextDueDateFromCalculation}.` : ''}`
      : null;
  const isFirstSubscription =
    planKeyCurrent === 'FREE' &&
    (profile.is_exempt !== true || !currentRequest?.asaas_subscription_id);
  const baseRequestNotes = isFirstSubscription
    ? `Início do plano ${planInfo.name}: primeira assinatura criada${billingPeriod ? ` (${billingPeriod})` : ''}.`
    : `Solicitação de alteração para o plano ${planInfo.name}${billingPeriod ? ` (${billingPeriod})` : ''}.`;
  const requestNotes = [baseRequestNotes, notesCredit]
    .filter(Boolean)
    .join('\n');
  const asaasCycle: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY' =
    billingPeriod === 'annual'
      ? 'YEARLY'
      : billingPeriod === 'semiannual'
        ? 'SEMIANNUALLY'
        : 'MONTHLY';
  const planPricePerPeriod = getPeriodPrice(planInfo, billingPeriod).totalPrice;
  const immediateDueDate = utcIsoFrom(nowFn()).split('T')[0];
  // Regra:
  // - Upgrade sem crédito: valor cheio do plano para cobrança imediata.
  // - Upgrade com crédito: respeita amountFinal calculado (evita cobrar valor cheio indevido).
  const hasCreditApplied = amountDiscount > 0;
  const baseSubscriptionValue = hasCreditApplied
    ? amountFinal
    : planPricePerPeriod;
  const couponResolution = await resolveCouponForAmount(
    payload.coupon_code,
    baseSubscriptionValue,
  );
  if (couponResolution.error) {
    return { success: false, error: couponResolution.error };
  }
  const appliedCoupon = couponResolution.coupon;
  const couponDiscountAmount = appliedCoupon?.discountAmount ?? 0;
  const couponIsForever = appliedCoupon?.applyMode === 'forever';
  const couponAsaasDiscount =
    appliedCoupon?.applyMode === 'once'
      ? appliedCoupon.asaasDiscount
      : undefined;
  const subscriptionValue = couponIsForever
    ? (appliedCoupon?.finalAmount ?? baseSubscriptionValue)
    : baseSubscriptionValue;
  const recurringSubscriptionValue = hasCreditApplied
    ? planPricePerPeriod
    : subscriptionValue;
  const amountFinalWithCoupon = couponIsForever
    ? subscriptionValue
    : round2(Math.max(0, baseSubscriptionValue - couponDiscountAmount));
  const amountDiscountWithCoupon = round2(
    amountDiscount + couponDiscountAmount,
  );
  const couponNotes = appliedCoupon
    ? `Cupom aplicado (${appliedCoupon.row.code}): ${appliedCoupon.applyMode === 'forever' ? 'desconto recorrente em todos os ciclos' : 'desconto somente na primeira cobrança'} no valor de R$ ${appliedCoupon.discountAmount.toFixed(2)}.`
    : null;
  const planDescription = `Plano ${planInfo.name}`;

  const isCreditCard = effectiveBillingType === 'CREDIT_CARD';
  const useSavedCard = isCreditCard && payload.use_saved_card === true;
  const requiresCardData = isCreditCard && amountFinalWithCoupon > 0;
  if (requiresCardData && !useSavedCard) {
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
      updated_at: utcIsoFrom(),
    })
    .eq('id', userId);

  let creditCardDetails: any;
  let creditCardHolderInfo: any;
  if (isCreditCard && !useSavedCard && payload.credit_card) {
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

  let asaasSubscriptionId: string | null =
    currentRequest?.asaas_subscription_id?.trim() ?? null;

  const subResult: {
    success: boolean;
    subscriptionId?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    error?: string;
  } = { success: false };

  if (asaasSubscriptionId) {
    const updatePayload = {
      value: recurringSubscriptionValue,
      description: planDescription,
      nextDueDate: immediateDueDate,
      cycle: asaasCycle,
      updatePendingPayments: true,
      // Explicitar billingType ajuda o gateway a reconstruir a cobrança imediata corretamente.
      billingType: effectiveBillingType,
      ...(couponAsaasDiscount && { discount: couponAsaasDiscount }),
    };
    console.log(
      '[Asaas][Upgrade] update subscription payload:',
      JSON.stringify(
        {
          subscriptionId: asaasSubscriptionId,
          ...updatePayload,
        },
        null,
        2,
      ),
    );
    const putResult = await updateAsaasSubscriptionPlanAndDueDate(
      asaasSubscriptionId,
      updatePayload,
    );
    if (putResult.success) {
      subResult.success = true;
      subResult.subscriptionId = asaasSubscriptionId;
    } else {
      // Fallback resiliente: se o update da assinatura existente falhar,
      // cria nova assinatura com cobrança imediata para não bloquear checkout.
      const createPayload = {
        customerId: asaasCustomerId,
        billingType: effectiveBillingType,
        cycle: asaasCycle,
        value: recurringSubscriptionValue,
        description: planDescription,
        nextDueDate: immediateDueDate,
        updatePendingPayments: true,
        installmentCount: installments > 1 ? installments : undefined,
        ...(couponAsaasDiscount && { discount: couponAsaasDiscount }),
        ...(creditCardDetails && { creditCardDetails }),
        ...(creditCardHolderInfo && { creditCardHolderInfo }),
      };
      console.log(
        '[Asaas][Upgrade] create subscription payload (fallback):',
        JSON.stringify(createPayload, null, 2),
      );
      const createResult = await createAsaasSubscription(createPayload);
      if (!createResult.success || !createResult.subscriptionId) {
        return {
          success: false,
          error:
            putResult.error ??
            createResult.error ??
            'Erro ao atualizar/criar assinatura',
        };
      }
      subResult.success = true;
      subResult.subscriptionId = createResult.subscriptionId;
      subResult.invoiceUrl = createResult.invoiceUrl;
      subResult.bankSlipUrl = createResult.bankSlipUrl;
      asaasSubscriptionId = createResult.subscriptionId;
    }
  } else {
    const createPayload = {
      customerId: asaasCustomerId,
      billingType: effectiveBillingType,
      cycle: asaasCycle,
      value: recurringSubscriptionValue,
      description: planDescription,
      nextDueDate: immediateDueDate,
      updatePendingPayments: true,
      installmentCount: installments > 1 ? installments : undefined,
      ...(couponAsaasDiscount && { discount: couponAsaasDiscount }),
      ...(creditCardDetails && { creditCardDetails }),
      ...(creditCardHolderInfo && { creditCardHolderInfo }),
    };
    console.log(
      '[Asaas][Upgrade] create subscription payload:',
      JSON.stringify(createPayload, null, 2),
    );
    const createResult = await createAsaasSubscription(createPayload);
    if (!createResult.success || !createResult.subscriptionId) {
      return {
        success: false,
        error: createResult.error ?? 'Erro ao criar assinatura',
      };
    }
    subResult.success = true;
    subResult.subscriptionId = createResult.subscriptionId;
    subResult.invoiceUrl = createResult.invoiceUrl;
    subResult.bankSlipUrl = createResult.bankSlipUrl;
    asaasSubscriptionId = createResult.subscriptionId;
  }

  if (!asaasSubscriptionId) {
    return { success: false, error: 'Assinatura Asaas não disponível.' };
  }
  const paymentResult =
    await getFirstPaymentFromSubscription(asaasSubscriptionId);
  let asaasPaymentId: string | null = null;
  let paymentUrl: string | null = null;
  let paymentDueDate: string | undefined;

  if (!asaasPaymentId || !paymentUrl) {
    if (paymentResult.success) {
      asaasPaymentId = asaasPaymentId ?? paymentResult.paymentId ?? null;
      paymentUrl =
        effectiveBillingType === 'BOLETO'
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

  // Regra de upgrade com crédito/pro-rata:
  // - Assinatura permanece com valor recorrente cheio do plano.
  // - Somente a cobrança pendente imediata é ajustada para a diferença calculada.
  if (
    hasCreditApplied &&
    asaasPaymentId &&
    Number.isFinite(amountFinalWithCoupon) &&
    amountFinalWithCoupon > 0
  ) {
    const paymentValueResult = await updateAsaasPaymentValue(
      asaasPaymentId,
      round2(amountFinalWithCoupon),
    );
    if (!paymentValueResult.success) {
      return {
        success: false,
        error:
          paymentValueResult.error ??
          'Erro ao ajustar valor da cobrança imediata no gateway.',
      };
    }

    if (effectiveBillingType === 'BOLETO') {
      paymentUrl =
        paymentValueResult.bankSlipUrl ??
        paymentValueResult.invoiceUrl ??
        paymentUrl;
    } else {
      paymentUrl = paymentValueResult.invoiceUrl ?? paymentUrl;
    }
    paymentDueDate = paymentValueResult.dueDate ?? paymentDueDate;
  }

  const { data: insertRow, error: insertError } = await supabase
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: planKeyCurrent,
      plan_key_requested: planKey,
      billing_type: effectiveBillingType,
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
      amount_discount: amountDiscountWithCoupon,
      amount_final: amountFinalWithCoupon,
      installments,
      status: 'pending',
      notes: createBillingNotesForNewUpgradeRequest({
        logBody: [requestNotes, couponNotes].filter(Boolean).join('\n'),
        noRefundCreditProRata: Boolean(notesCredit?.trim()),
      }),
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

  if (appliedCoupon?.row.id) {
    await createSupabaseAdmin()
      .from('tb_coupons')
      .update({
        used_count: (appliedCoupon.row.used_count ?? 0) + 1,
      } as Record<string, unknown>)
      .eq('id', appliedCoupon.row.id);
  }

  // Não sobrescreve nextDueDate após criação/atualização para evitar conflito de ciclo
  // e geração de cobranças duplicadas no mesmo período.

  let pixQrCodeBase64: string | undefined;
  let pixCopyPaste: string | undefined;
  if (effectiveBillingType === 'PIX' && asaasPaymentId) {
    const pixQr = await getPixQrCodeFromPayment(asaasPaymentId);
    if (pixQr.success) {
      pixQrCodeBase64 = pixQr.encodedImage;
      pixCopyPaste = pixQr.payload;
    }
  }

  return {
    success: true,
    payment_url: paymentUrl ?? undefined,
    billing_type: effectiveBillingType,
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
