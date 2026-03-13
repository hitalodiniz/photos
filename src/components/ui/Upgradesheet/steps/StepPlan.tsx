'use client';

import React, { useEffect, useState, useRef } from 'react';
import { SheetSection } from '@/components/ui/Sheet';
import {
  planOrder,
  PLANS_BY_SEGMENT,
  PERMISSIONS_BY_PLAN,
  getPlanBenefits,
} from '@/core/config/plans';
import type { PlanKey } from '@/core/config/plans';
import { getUpgradePreview } from '@/core/services/asaas.service';
import type { UpgradePreviewResult } from '@/core/types/billing';
import { PlanCard } from '../PlanCard';
import { PLAN_ICONS } from '../constants';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';
import LoadingSpinner from '../../LoadingSpinner';
import { Sparkles } from 'lucide-react';
import { profile } from 'console';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function StepPlan() {
  const {
    segment,
    planKey,
    selectedPlan,
    setSelectedPlan,
    expandedPlanKey,
    setExpandedPlanKey,
    suggestedPlanKey,
    terms,
    profile,
    billingType,
    billingPeriod,
    isExempt,
    setHasPendingUpgrade,
    setUpgradeCalculation,
    setDowngradeBlockedMessage,
  } = useUpgradeSheetContext();

  const [upgradePreview, setUpgradePreview] =
    useState<UpgradePreviewResult | null>(null);
  const [downgradeExpiresAt, setDowngradeExpiresAt] = useState<string | null>(
    null,
  );
  // Sinaliza que a API já respondeu ao menos uma vez (evita spinner para FREE)
  const [previewLoaded, setPreviewLoaded] = useState(false);

  // Pré-busca vencimento do plano atual (usado no tooltip de planos inferiores)
  useEffect(() => {
    if (planKey === 'FREE' || profile?.is_trial) {
      setDowngradeExpiresAt(null);
      return;
    }
    const idx = planOrder.indexOf(planKey as PlanKey);
    if (idx <= 0) return;
    const firstLower = planOrder[idx - 1];
    const t = setTimeout(() => {
      getUpgradePreview(firstLower, billingPeriod, billingType, segment).then(
        (result) => {
          const c = result.calculation;
          if (c?.type === 'downgrade' && c.current_plan_expires_at)
            setDowngradeExpiresAt(c.current_plan_expires_at);
        },
      );
    }, 150);
    return () => clearTimeout(t);
  }, [planKey, billingPeriod, billingType, segment]);

  const previewDebounceMs = 320;
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Usuário FREE ou trial: sem crédito — não precisa chamar API aqui
    if (planKey === 'FREE' || selectedPlan === 'FREE' || profile?.is_trial) {
      setUpgradePreview(null);
      setPreviewLoaded(true);
      setHasPendingUpgrade(false);
      setUpgradeCalculation(null);
      setDowngradeBlockedMessage(null);
      return;
    }

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    let cancelled = false;
    setPreviewLoaded(false);

    previewTimeoutRef.current = setTimeout(() => {
      previewTimeoutRef.current = null;
      // Busca já com período/forma atuais para refletir o mesmo cálculo das etapas seguintes.
      getUpgradePreview(selectedPlan, billingPeriod, billingType, segment).then(
        (result) => {
          if (!cancelled) {
            setUpgradePreview(result);
            setPreviewLoaded(true);
            setHasPendingUpgrade(result.has_pending ?? false);
            // Sempre propaga o cálculo bruto para o contexto, mesmo quando
            // has_active_plan vier false (ex.: downgrades recentes).
            setUpgradeCalculation(result.calculation ?? null);

            const selectedIdx = planOrder.indexOf(selectedPlan as PlanKey);
            const currentIdx = planOrder.indexOf(planKey as PlanKey);
            const isDowngradeByOrder =
              selectedIdx >= 0 && currentIdx >= 0 && selectedIdx < currentIdx;

            const isDowngrade =
              calc?.type === 'downgrade' && calc.current_plan_expires_at;
            const isWithdrawalWindow =
              calc?.is_downgrade_withdrawal_window === true;

            // Bloqueia downgrade apenas fora da janela de arrependimento.
            if (isDowngrade && isDowngradeByOrder && !isWithdrawalWindow) {
              setDowngradeBlockedMessage(
                `Mudança para planos inferiores permitida apenas após o vencimento do plano atual em ${formatDate(calc.current_plan_expires_at!)}.`,
              );
              setDowngradeExpiresAt(calc.current_plan_expires_at!);
            } else {
              setDowngradeBlockedMessage(null);
              if (calc?.current_plan_expires_at && isDowngradeByOrder)
                setDowngradeExpiresAt(calc.current_plan_expires_at);
              else if (!isDowngradeByOrder) setDowngradeExpiresAt(null);
            }
          }
        },
      );
    }, previewDebounceMs);

    return () => {
      cancelled = true;
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
    };
  }, [
    selectedPlan,
    billingType,
    segment,
    planKey,
    setHasPendingUpgrade,
    setUpgradeCalculation,
    setDowngradeBlockedMessage,
  ]);

  // Usa qualquer cálculo retornado pela API, mesmo quando has_active_plan for false.
  const calc = upgradePreview?.calculation;

  const selectedIdx = planOrder.indexOf(selectedPlan as PlanKey);
  const currentIdx = planOrder.indexOf(planKey as PlanKey);
  const isDowngradeByOrder =
    planKey !== 'FREE' &&
    !profile?.is_trial &&
    selectedIdx >= 0 &&
    currentIdx >= 0 &&
    selectedIdx < currentIdx;

  const showDowngradeBanner =
    calc && calc.type === 'downgrade' && isDowngradeByOrder;

  // Downgrade com direito de arrependimento: exibir crédito no topo
  const showDowngradeCreditAtTop =
    calc?.type === 'downgrade' &&
    calc.is_downgrade_withdrawal_window === true &&
    (calc.residual_credit ?? 0) > 0;
  const downgradeCreditValue = showDowngradeCreditAtTop
    ? (calc!.residual_credit ?? 0)
    : 0;
  const downgradeCreditExpiry = calc?.new_expiry_date;
  const downgradeCreditDays = calc?.free_upgrade_days_extended ?? 0;
  const downgradeCreditMonths = calc?.free_upgrade_months_covered ?? 0;

  // Há crédito do plano anterior (> 0) e não é downgrade
  const hasResidualCredit =
    calc &&
    calc.type !== 'current_plan' &&
    !isDowngradeByOrder &&
    (calc.residual_credit ?? 0) > 0;

  // Spinner só quando planKey !== FREE e ainda não temos resposta
  const showLoading =
    planKey !== 'FREE' &&
    !profile?.is_trial &&
    selectedPlan !== 'FREE' &&
    !previewLoaded;

  return (
    <SheetSection title="Escolha seu novo plano">
      {showDowngradeCreditAtTop && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-[11px] text-emerald-900 mb-3">
          <p className="font-bold text-emerald-800 uppercase text-[10px] tracking-wider mb-1.5">
            ✓ Crédito aplicado
          </p>
          <p className="font-semibold text-emerald-900">
            Plano Mensal · Crédito{' '}
            <span className="ml-1">R$ {downgradeCreditValue.toFixed(2)}</span>
          </p>
          <p className="text-emerald-800/90 mt-1 leading-snug">
            Este valor será convertido em saldo e aplicado ao plano escolhido.
            {downgradeCreditExpiry && downgradeCreditDays > 0 ? (
              <>
                {' '}
                Na etapa <strong>Pagamento</strong> você verá por quantos dias
                esse crédito cobre o plano e a data do próximo vencimento (
                {downgradeCreditMonths >= 1
                  ? `cerca de ${downgradeCreditMonths} ${downgradeCreditMonths === 1 ? 'mês' : 'meses'}`
                  : `${downgradeCreditDays} dias`}
                ). A próxima fatura será nessa data.
              </>
            ) : (
              ' Na etapa Pagamento você verá a data do próximo vencimento. A próxima fatura será nessa data.'
            )}
          </p>
        </div>
      )}

      {isExempt && selectedPlan === planKey && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5 text-[11px] text-petroleum">
          <p className="font-medium text-petroleum">
            Você possui isenção no plano atual {planKey}.
          </p>
        </div>
      )}

      {upgradePreview?.has_pending && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
          <p className="font-medium">
            Você já possui uma solicitação de upgrade em processamento. Aguarde
            a confirmação do pagamento ou o cancelamento automático (até 24h)
            para assinar novamente.
          </p>
        </div>
      )}

      {showDowngradeBanner && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
          {calc!.is_downgrade_withdrawal_window ? (
            <p className="font-medium">
              <span className="font-semibold text-petroleum">
                Crédito de outro pagamento:
              </span>{' '}
              Você receberá{' '}
              <span className="font-semibold text-petroleum">
                R$ {Math.max(0, calc!.residual_credit).toFixed(2)}
              </span>{' '}
              em créditos e a mudança para o novo plano será aplicada
              imediatamente.
            </p>
          ) : (
            <p className="font-medium">
              <span className="font-semibold text-petroleum">Agendamento:</span>{' '}
              Seu plano atual segue até{' '}
              <span className="font-semibold text-petroleum">
                {formatDate(
                  calc!.downgrade_effective_at ??
                    calc!.current_plan_expires_at ??
                    '',
                )}
              </span>
              . Nesta data, o downgrade será aplicado e o excesso de galerias
              será arquivado automaticamente.
            </p>
          )}
        </div>
      )}

      {showLoading ? (
        <LoadingSpinner
          message="Verificando crédito disponível…"
          size="sm"
          variant="light"
        />
      ) : (
        /*
         * Exibe apenas um hint discreto sobre a existência de crédito.
         * O breakdown completo (valor do período · crédito · desconto PIX · total)
         * aparece no StepBilling onde o usuário já escolheu período e forma —
         * evitando mostrar valores provisórios que mudariam aqui.
         */
        hasResidualCredit &&
        !profile?.is_trial && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-800">
            <Sparkles size={13} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="font-medium leading-snug">
              Você tem crédito dos dias não usados do plano anterior.{' '}
              <span className="font-semibold">
                O desconto será aplicado no próximo passo,
              </span>{' '}
              após você escolher o período e a forma de pagamento.
            </p>
          </div>
        )
      )}

      <div className="space-y-3">
        {planOrder
          .filter((p) => p !== 'FREE')
          .map((p) => {
            const info = PLANS_BY_SEGMENT[segment]?.[p];
            const perms = PERMISSIONS_BY_PLAN[p];
            const isCurr = p === (planKey as PlanKey);
            const isDowngrade =
              planKey !== 'FREE' &&
              !profile?.is_trial &&
              planOrder.indexOf(p) < planOrder.indexOf(planKey as PlanKey);
            const disabled = !profile?.is_trial && isCurr;
            const downgradeTooltip = undefined;
            return (
              <PlanCard
                key={p}
                planKey={p}
                planName={info?.name ?? p}
                price={info?.price ?? 0}
                isCurrentPlan={isCurr}
                isSelected={selectedPlan === p}
                isSuggested={p === suggestedPlanKey}
                disabled={disabled}
                disabledTooltip={downgradeTooltip}
                onSelect={() => setSelectedPlan(p)}
                perms={perms}
                isExpanded={expandedPlanKey === p}
                onToggleExpand={() =>
                  setExpandedPlanKey((prev) => (prev === p ? null : p))
                }
                benefits={getPlanBenefits(perms, terms)}
                planIcon={PLAN_ICONS[p]}
                isTrial={profile?.is_trial ?? false}
              />
            );
          })}
      </div>
    </SheetSection>
  );
}
