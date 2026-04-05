'use client';

import { getPeriodPrice, PIX_DISCOUNT_PERCENT } from '@/core/config/plans';
import type { BillingPeriod, BillingType, UpgradePriceCalculation } from '@/core/types/billing';
import type { PlanInfo } from '@/core/config/plans';

export interface UpgradePriceResult {
  /** Valor cheio do período sem qualquer desconto. */
  amountPeriod: number;
  /** Crédito pro-rata do plano anterior (0 se não houver). */
  residualCredit: number;
  /** Valor após abatimento do crédito pro-rata. */
  amountAfterCredit: number;
  /** Desconto PIX calculado sobre amountAfterCredit (0 se não aplicável). */
  pixDiscountActual: number;
  /** Valor final a cobrar. 0 em upgrade gratuito. */
  amountFinal: number;
  /** Verdadeiro quando o crédito cobre integralmente o novo plano. */
  isFreeUpgrade: boolean;
}

/**
 * Centraliza o cálculo de preço de upgrade/assinatura.
 *
 * Regras:
 * - Crédito pro-rata vem de `upgradeCalculation.residual_credit` (type === 'upgrade').
 * - Desconto PIX (5%) se aplica somente nos períodos semestral/anual e apenas
 *   quando NÃO é upgrade gratuito, calculado sobre o valor pós-crédito.
 * - Upgrade gratuito (`is_free_upgrade === true`) → amountFinal = 0.
 */
export function useUpgradePrice(
  planInfoForPrice: PlanInfo,
  billingPeriod: BillingPeriod,
  billingType: BillingType,
  upgradeCalculation: UpgradePriceCalculation | null,
): UpgradePriceResult {
  const { effectiveMonthly, months } = getPeriodPrice(
    planInfoForPrice,
    billingPeriod,
  );

  const amountPeriod = Math.round(effectiveMonthly * months * 100) / 100;

  const isFreeUpgrade = upgradeCalculation?.is_free_upgrade === true;

  // Crédito vem de:
  // - upgrades com pro-rata (type === 'upgrade')
  // - downgrades dentro da janela de arrependimento (is_downgrade_withdrawal_window)
  const residualCredit =
    upgradeCalculation &&
    (upgradeCalculation.type === 'upgrade' ||
      (upgradeCalculation.type === 'downgrade' &&
        upgradeCalculation.is_downgrade_withdrawal_window === true))
      ? upgradeCalculation.residual_credit ?? 0
      : 0;

  const backendAmountFinal =
    typeof upgradeCalculation?.amount_final === 'number' &&
    Number.isFinite(upgradeCalculation.amount_final)
      ? Math.max(0, Math.round(upgradeCalculation.amount_final * 100) / 100)
      : null;
  const backendPixDiscount =
    typeof upgradeCalculation?.pix_discount_amount === 'number' &&
    Number.isFinite(upgradeCalculation.pix_discount_amount)
      ? Math.max(0, Math.round(upgradeCalculation.pix_discount_amount * 100) / 100)
      : null;

  const amountAfterCredit =
    backendAmountFinal !== null && backendPixDiscount !== null
      ? Math.round((backendAmountFinal + backendPixDiscount) * 100) / 100
      : residualCredit > 0 &&
          backendAmountFinal !== null &&
          billingType !== 'PIX'
        ? backendAmountFinal
        : amountPeriod;

  const pixDiscountActual =
    backendPixDiscount !== null
      ? backendPixDiscount
      : !isFreeUpgrade && billingType === 'PIX' && billingPeriod !== 'monthly'
        ? Math.round(amountAfterCredit * (PIX_DISCOUNT_PERCENT / 100) * 100) / 100
        : 0;

  const amountFinal =
    backendAmountFinal !== null
      ? backendAmountFinal
      : isFreeUpgrade
        ? 0
        : Math.max(
            0,
            Math.round((amountAfterCredit - pixDiscountActual) * 100) / 100,
          );

  return {
    amountPeriod,
    residualCredit,
    amountAfterCredit,
    pixDiscountActual,
    amountFinal,
    isFreeUpgrade,
  };
}
