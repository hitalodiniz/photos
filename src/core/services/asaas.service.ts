// src/core/services/asaas.service.ts
'use server';

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 IMPORTS INTERNOS (para as funções que ainda estão aqui)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  createSupabaseAdmin,
  createSupabaseServerClient,
} from '@/lib/supabase.server';
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
  updateSubscriptionBillingMethod as updateAsaasSubscriptionBillingMethod,
} from './asaas/api/subscriptions';
import {
  getFirstPaymentFromSubscription,
  deletePendingPaymentsForSubscription,
  getAsaasPaymentStatus,
  getPaymentBillingInfo,
  deleteAsaasPayment,
} from './asaas/api/payments';
import { getPixQrCodeFromPayment } from './asaas/api/pix';
import { reactivateAutoArchivedGalleries as reactivateAutoArchivedGalleriesImpl } from './asaas/gallery/adjustments';
import { toSaoPauloIso } from '@/core/utils/date-time';

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

  const now = new Date();
  const startsAt = new Date(coupon.starts_at);
  const expiresAt = coupon.expires_at ? new Date(coupon.expires_at) : null;
  if (!Number.isNaN(startsAt.getTime()) && startsAt > now) {
    return { error: 'Cupom ainda não está vigente.' };
  }
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt < now) {
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
      'id, amount_final, amount_discount, billing_type, processed_at, created_at, billing_period, plan_key_requested, asaas_subscription_id, notes',
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
    const referenceDate = row?.processed_at ?? row?.created_at ?? null;
    if (!referenceDate) continue;
    const start = new Date(referenceDate);
    if (Number.isNaN(start.getTime())) continue;
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
      new_expiry_date: addMonths(
        now,
        billingPeriodToMonths(targetPeriod),
      ).toISOString(), // ✅
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
      current_plan_expires_at: now.toISOString(),
      new_expiry_date: addMonths(
        now,
        billingPeriodToMonths(targetPeriod),
      ).toISOString(),
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
      current_plan_expires_at: now.toISOString(),
      new_expiry_date: addMonths(
        now,
        billingPeriodToMonths(targetPeriod),
      ).toISOString(),
    };
  }
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
    const isWithdrawalWindow =
      daysSincePurchase <= 7 && currentRequest.amount_final > 0;
    const notesLower = (currentRequest.notes ?? '').toLowerCase();
    const isProRataDiscount =
      notesLower.includes('aproveitamento de crédito') ||
      notesLower.includes('credito pro-rata') ||
      notesLower.includes('crédito pro-rata');
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
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
      new_expiry_date: newExpiry.toISOString(), // ✅ Data real
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
    current_plan_expires_at: currentPlanExpiresAt.toISOString(),
    new_expiry_date: addMonths(
      now,
      billingPeriodToMonths(targetPeriod),
    ).toISOString(),
  };
}

function normalizeProfilePlanKeyForPreview(
  planKey: string | null | undefined,
): PlanKey {
  const raw = String(planKey ?? 'FREE').trim().toUpperCase() as PlanKey;
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
    const latestRequestCancelled =
      latestRequestRow?.status === 'cancelled';

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
      profilePlanKeyForPreview !== 'FREE' ? profilePlanKeyForPreview : undefined;

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
 * Troca a forma de pagamento da assinatura vigente (server action).
 *
 * Regra crítica de negócio: ao "fugir" do cartão (BOLETO/PIX), o Asaas deve
 * esquecer imediatamente os dados do cartão para evitar recorrência fantasma.
 *
 * Também atualiza tb_upgrade_requests (billing_type + histórico em notes) e,
 * ao migrar para BOLETO/PIX, limpa asaas_payment_id travado de tentativa de cartão.
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
): Promise<{ success: boolean; error?: string }> {
  try {
    const { success, userId } = await getAuthenticatedUser();
    if (!success || !userId)
      return { success: false, error: 'Não autenticado' };

    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdmin();

    // Registro alvo para atualização:
    // A tabela do /dashboard/assinatura usa `history[0]` (getUpgradeHistory ordena por created_at DESC),
    // então aqui atualizamos o registro mais recente daquela assinatura.
    const { data: currentReq, error: currentReqErr } = await supabase
      .from('tb_upgrade_requests')
      .select(
        'id, billing_type, status, notes, asaas_payment_id, asaas_subscription_id',
      )
      .eq('profile_id', userId)
      .eq('asaas_subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (currentReqErr) {
      return {
        success: false,
        error: 'Erro ao carregar registro da assinatura.',
      };
    }
    if (!currentReq?.id) {
      // Sem um row para atualizar, não faz sentido retornar success (foi a causa da tabela "não gravar").
      return {
        success: false,
        error:
          'Não foi possível localizar o registro da sua assinatura para atualizar o pagamento.',
      };
    }

    // Permite troca mesmo com pending_downgrade (o alerta é UI; aqui não alteramos esse request)
    const { data: pendingDowngrade } = await supabase
      .from('tb_upgrade_requests')
      .select('id')
      .eq('profile_id', userId)
      .eq('status', 'pending_downgrade')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    void pendingDowngrade; // apenas para deixar explícito que não bloqueamos

    const asaasSubscriptionId =
      (currentReq.asaas_subscription_id as string | null) ?? subscriptionId;

    if (!asaasSubscriptionId || asaasSubscriptionId !== subscriptionId) {
      // Segurança: só permite operar na assinatura vigente do usuário.
      return { success: false, error: 'Assinatura inválida.' };
    }

    // 1) Atualiza no Asaas (inclui updatePendingPayments:true no módulo API)
    const asaasRes = await updateAsaasSubscriptionBillingMethod(
      subscriptionId,
      newMethod,
      creditCard ?? null,
      creditCardHolderInfo ?? null,
    );
    if (!asaasRes.success) return asaasRes;

    // 2) Atualiza tb_upgrade_requests (registro mais recente da assinatura)
    const previous = (currentReq.billing_type as string | null) ?? null;
    const nowIso = new Date().toISOString();
    const historyLine = `[PaymentMethodChange ${nowIso}] ${previous ?? 'UNKNOWN'} -> ${newMethod}`;
    const nextNotes = [currentReq.notes, historyLine]
      .filter(Boolean)
      .join('\n');

    const updatePatch: Record<string, unknown> = {
      billing_type: newMethod,
      notes: nextNotes,
      updated_at: nowIso,
    };

    // Ao migrar para BOLETO/PIX, limpamos payment_id travado de cartão
    // e registramos o NOVO paymentId gerado com updatePendingPayments:true
    if (newMethod === 'BOLETO' || newMethod === 'PIX') {
      const first = await getFirstPaymentFromSubscription(subscriptionId);
      updatePatch.asaas_payment_id =
        first.success && first.paymentId ? first.paymentId : null;
    }

    const { data: updatedRow, error: updErr } = await admin
      .from('tb_upgrade_requests')
      .update(updatePatch)
      .eq('id', currentReq.id)
      .eq('profile_id', userId)
      .select('id')
      .maybeSingle();
    if (updErr) {
      return {
        success: false,
        error:
          'Pagamento atualizado no Asaas, mas falhou ao salvar no sistema.',
      };
    }
    if (!updatedRow?.id) {
      return {
        success: false,
        error:
          'Pagamento atualizado no Asaas, mas o sistema não conseguiu registrar a mudança.',
      };
    }

    // 3) Revalida para tabela "Comprovante/Abrir Pagamento" apontar para o novo boleto/PIX
    revalidatePath('/dashboard/assinatura');
    await revalidateUserCache(userId);

    return { success: true };
  } catch (e) {
    console.error('[updateSubscriptionBillingMethod] Error:', e);
    return { success: false, error: 'Erro ao alterar forma de pagamento.' };
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
  const supabase = supabaseClient ?? (await createSupabaseAdmin());

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

  revalidatePath('/dashboard', 'layout');

  return { success: true, ...adjustment };
}

/**
 * Cancela a assinatura do usuário autenticado.
 */
import {
  getEndOfDaySaoPauloIso,
  getSaoPauloDateString,
} from '../utils/data-helpers';

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
    resolvedSupabase = opts as Awaited<
      ReturnType<typeof createSupabaseServerClient>
    >;
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
  const notesLower = String(request.notes ?? '').toLowerCase();
  const hasProRataCreditInNotes =
    notesLower.includes('aproveitamento de crédito') ||
    notesLower.includes('credito pro-rata') ||
    notesLower.includes('crédito pro-rata') ||
    notesLower.includes('upgrade gratuito');

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

  const accessEndsAtIso = getEndOfDaySaoPauloIso(accessEndsAt);
  const endDateStr = getSaoPauloDateString(accessEndsAt);
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

  if (
    daysSincePurchase <= 7 &&
    request.status === 'approved' &&
    amountPaid > 0 &&
    !hasProRataCreditInNotes
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

  const { data: updatedCancelRow, error: updateCancelErr } = await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'pending_downgrade',
      processed_at: accessEndsAtIso,
      scheduled_cancel_at: accessEndsAtIso,
      notes: buildCancellationNotes(
        `Cancelamento solicitado em ${now.toISOString()}. Acesso até ${accessEndsAtIso}.`,
        reason,
        comment,
      ),
      updated_at: now.toISOString(),
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
        updated_at: now.toISOString(),
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
    const now = new Date().toISOString();
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
  const immediateDueDate = toSaoPauloIso().split('T')[0];
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
      updated_at: new Date().toISOString(),
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
      value: subscriptionValue,
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
        value: subscriptionValue,
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
      value: subscriptionValue,
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
      notes: [requestNotes, couponNotes].filter(Boolean).join('\n'),
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
