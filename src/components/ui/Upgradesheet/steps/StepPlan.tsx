'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
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
import { Sparkles, CalendarClock, X } from 'lucide-react';
import { cancelScheduledChange } from '@/core/services/scheduled-change.service';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function normalizePlanKeyStep(raw: string | null | undefined): PlanKey {
  const u = String(raw ?? 'FREE').trim().toUpperCase() as PlanKey;
  return planOrder.includes(u) ? u : 'FREE';
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
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [cancellingScheduled, setCancellingScheduled] = useState(false);

  /**
   * Plano no cliente (PlanContext / props) — pode estar defasado do tb_profiles.
   */
  const clientPlanKey = useMemo((): PlanKey => {
    const raw = (
      (profile?.plan_key as PlanKey | undefined) ??
      planKey ??
      'FREE'
    ) as string;
    return normalizePlanKeyStep(raw);
  }, [profile?.plan_key, planKey]);

  /** Plano efetivo após `getUpgradePreview` (servidor / getAuthenticatedUser). */
  const truthPlanKey = useMemo((): PlanKey => {
    const pk = upgradePreview?.profile_plan_key;
    if (pk != null) return normalizePlanKeyStep(pk);
    return clientPlanKey;
  }, [upgradePreview?.profile_plan_key, clientPlanKey]);

  /**
   * Card “Seu plano atual”: com `profile_plan_key` do servidor ou após preview carregar no cliente.
   */
  const planKeyForCurrentCard = useMemo((): PlanKey | null => {
    if (upgradePreview?.profile_plan_key != null) {
      return normalizePlanKeyStep(upgradePreview.profile_plan_key);
    }
    if (!previewLoaded) return null;
    return clientPlanKey;
  }, [upgradePreview?.profile_plan_key, previewLoaded, clientPlanKey]);

  // Pré-busca vencimento do plano atual (tooltip de planos inferiores)
  useEffect(() => {
    if (truthPlanKey === 'FREE' || profile?.is_trial) {
      setDowngradeExpiresAt(null);
      return;
    }
    const idx = planOrder.indexOf(truthPlanKey);
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
  }, [truthPlanKey, billingPeriod, billingType, segment, profile?.is_trial]);

  const previewDebounceMs = 320;
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (clientPlanKey === 'FREE' || selectedPlan === 'FREE' || profile?.is_trial) {
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
    setUpgradePreview(null);

    previewTimeoutRef.current = setTimeout(() => {
      previewTimeoutRef.current = null;
      getUpgradePreview(selectedPlan, billingPeriod, billingType, segment).then(
        (result) => {
          if (!cancelled) {
            setUpgradePreview(result);
            setPreviewLoaded(true);
            setHasPendingUpgrade(result.has_pending ?? false);
            setUpgradeCalculation(result.calculation ?? null);

            const calc = result.calculation;
            const selectedIdx = planOrder.indexOf(selectedPlan as PlanKey);
            const currentPlanForIdx = result.profile_plan_key
              ? normalizePlanKeyStep(result.profile_plan_key)
              : clientPlanKey;
            const currentIdx = planOrder.indexOf(currentPlanForIdx);
            const isDowngradeByOrder =
              selectedIdx >= 0 && currentIdx >= 0 && selectedIdx < currentIdx;

            const isDowngrade =
              calc?.type === 'downgrade' && calc.current_plan_expires_at;
            const isWithdrawalWindow =
              calc?.is_downgrade_withdrawal_window === true;

            // Fora da janela de arrependimento: NÃO bloqueia mais — permite agendar
            if (isDowngrade && isDowngradeByOrder && !isWithdrawalWindow) {
              // Limpa bloqueio — o fluxo de agendamento está disponível
              setDowngradeBlockedMessage(null);
              setDowngradeExpiresAt(calc!.current_plan_expires_at!);
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
    clientPlanKey,
    setHasPendingUpgrade,
    setUpgradeCalculation,
    setDowngradeBlockedMessage,
    profile?.is_trial,
  ]);

  const calc = upgradePreview?.calculation;

  const selectedIdx = planOrder.indexOf(selectedPlan as PlanKey);
  const currentIdx = planOrder.indexOf(truthPlanKey);
  const isDowngradeByOrder =
    truthPlanKey !== 'FREE' &&
    !profile?.is_trial &&
    selectedIdx >= 0 &&
    currentIdx >= 0 &&
    selectedIdx < currentIdx;

  const showDowngradeBanner =
    calc && calc.type === 'downgrade' && isDowngradeByOrder;

  // Downgrade com direito de arrependimento
  const showDowngradeCreditAtTop =
    calc?.type === 'downgrade' &&
    calc.is_downgrade_withdrawal_window === true &&
    (calc.residual_credit ?? 0) > 0;
  const isWithinWithdrawalWindow =
    calc?.is_downgrade_withdrawal_window === true;

  const downgradeCreditValue = showDowngradeCreditAtTop
    ? (calc!.residual_credit ?? 0)
    : 0;
  const downgradeCreditExpiry = calc?.new_expiry_date;
  const downgradeCreditDays = calc?.free_upgrade_days_extended ?? 0;
  const downgradeCreditMonths = calc?.free_upgrade_months_covered ?? 0;

  // Downgrade fora da janela: agendamento
  const isScheduledDowngrade =
    calc?.type === 'downgrade' &&
    calc.is_downgrade_withdrawal_window === false &&
    isDowngradeByOrder;

  // Mudança já agendada (pending_change existente)
  const hasScheduledChange = upgradePreview?.has_scheduled_change === true;
  /** Última solicitação no histórico = cancelada (rótulo "Cancelado" na assinatura). */
  const latestRequestCancelled =
    upgradePreview?.latest_request_cancelled === true;
  const scheduledChangePlan = upgradePreview?.scheduled_change_plan_key;
  const scheduledChangeEffectiveAt =
    upgradePreview?.scheduled_change_effective_at;

  const hasResidualCredit =
    calc &&
    calc.type !== 'current_plan' &&
    !isDowngradeByOrder &&
    (calc.residual_credit ?? 0) > 0;
  const showZeroAmountResidualNotice =
    calc?.type === 'upgrade' &&
    calc.is_free_upgrade === true &&
    (calc.amount_final ?? 0) === 0 &&
    (calc.residual_credit ?? 0) > 0;

  const showLoading =
    truthPlanKey !== 'FREE' &&
    !profile?.is_trial &&
    selectedPlan !== 'FREE' &&
    !previewLoaded;

  const handleCancelScheduledChange = async () => {
    setCancellingScheduled(true);
    try {
      const result = await cancelScheduledChange();
      if (result.success) {
        // Recarrega o preview para refletir o estado atualizado
        setPreviewLoaded(false);
        getUpgradePreview(
          selectedPlan,
          billingPeriod,
          billingType,
          segment,
        ).then((r) => {
          setUpgradePreview(r);
          setPreviewLoaded(true);
          setUpgradeCalculation(r.calculation ?? null);
        });
      } else {
        console.error(
          '[StepPlan] Falha ao cancelar mudança agendada:',
          result.error,
        );
      }
    } finally {
      setCancellingScheduled(false);
    }
  };

  return (
    <SheetSection title="Escolha seu novo plano">
      {/* ── Mudança já agendada (pending_change ativo) ── */}
      {hasScheduledChange && scheduledChangePlan && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-[11px] text-blue-900 mb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <CalendarClock
                size={14}
                className="text-blue-500 shrink-0 mt-0.5"
              />
              <div>
                <p className="font-bold text-blue-800 uppercase text-[10px] tracking-wider mb-1">
                  Mudança agendada
                </p>
                <p className="leading-snug text-blue-900">
                  Seu plano será alterado para{' '}
                  <strong>{scheduledChangePlan}</strong>
                  {scheduledChangeEffectiveAt
                    ? ` em ${formatDate(scheduledChangeEffectiveAt)}`
                    : ''}
                  , ao vencimento do plano atual.
                </p>
                <p className="mt-1 text-blue-700 leading-snug">
                  Você ainda pode cancelar esta intenção e manter seu plano
                  atual.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelScheduledChange}
              disabled={cancellingScheduled}
              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded border border-blue-300 bg-white text-[10px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {cancellingScheduled ? (
                <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <X size={10} />
              )}
              Cancelar
            </button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {planOrder
          .filter((p) => p !== 'FREE')
          .map((p) => {
            const info = PLANS_BY_SEGMENT[segment]?.[p];
            const perms = PERMISSIONS_BY_PLAN[p];
            const isCurr =
              planKeyForCurrentCard !== null && p === planKeyForCurrentCard;
            const disabled = !profile?.is_trial && isCurr;
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
                disabledTooltip={undefined}
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

      {/* ── Crédito de arrependimento (≤ 7 dias) ── */}
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
              ' Na etapa Pagamento você verá a data do próximo vencimento.'
            )}
          </p>
        </div>
      )}

      {/* ── Aviso explícito: downgrade dentro da janela abre mão do estorno ── */}
      {isDowngradeByOrder && isWithinWithdrawalWindow && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-[11px] text-amber-900 mb-3">
          <p className="font-bold text-amber-800 uppercase text-[10px] tracking-wider mb-1">
            ⚠️ Atenção — você está dentro do prazo de arrependimento
          </p>
          <p className="leading-snug">
            Ao fazer o downgrade agora, você{' '}
            <strong>abre mão do direito de estorno</strong> e o crédito pro-rata
            dos dias não usados será aplicado ao novo plano. Se preferir o
            estorno total, cancele a assinatura em vez de fazer downgrade.
          </p>
        </div>
      )}

      {/* ── Banner de agendamento fora da janela ── */}
      {isScheduledDowngrade && !hasScheduledChange && showDowngradeBanner && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900 mb-3">
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
            . Ao confirmar, a mudança será agendada para essa data — você mantém
            o acesso até lá e a nova cobrança começa automaticamente no novo
            plano.
          </p>
        </div>
      )}

      {isExempt && selectedPlan === truthPlanKey && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5 text-[11px] text-petroleum">
          <p className="font-medium text-petroleum">
            Você possui isenção no plano atual {truthPlanKey}.
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

      {showZeroAmountResidualNotice && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[11px] text-blue-900">
          <p className="font-medium leading-snug">
            Upgrade realizado com saldo residual. De acordo com o CDC, não se
            aplica novo prazo de arrependimento para esta transação sem
            desembolso. Cancelamento disponível como agendamento.
          </p>
        </div>
      )}

      {/* Banner downgrade com crédito (janela arrependimento) */}
      {showDowngradeBanner &&
        calc!.is_downgrade_withdrawal_window &&
        !showDowngradeCreditAtTop && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
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
          </div>
        )}

      {showLoading ? (
        <LoadingSpinner
          message="Buscando dados da sua assinatura atual"
          size="xs"
          variant="light"
        />
      ) : (
        hasResidualCredit &&
        !profile?.is_trial && (
          <div className="flex items-start gap-2 p-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[11px] text-emerald-800">
            <Sparkles size={13} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="font-medium leading-snug">
              Você tem crédito dos dias não usados do plano atual.{' '}
              <span className="font-semibold">
                O desconto será aplicado na etapa de pagamento,
              </span>{' '}
              após você escolher o período e a forma de pagamento.
            </p>
          </div>
        )
      )}
    </SheetSection>
  );
}
