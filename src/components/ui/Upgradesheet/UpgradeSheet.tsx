'use client';

import React, { useState } from 'react';
import {
  Crown,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  CreditCard,
} from 'lucide-react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import type { PlanKey } from '@/core/config/plans';
import { findNextPlanKeyWithFeature, planOrder } from '@/core/config/plans';
import { usePlan } from '@/core/context/PlanContext';
import { useSegment } from '@/hooks/useSegment';
import {
  UpgradeSheetProvider,
  useUpgradeSheetContext,
} from './UpgradeSheetContext';
import { PLAN_ICONS, STEP_TITLES } from './constants';
import { StepIndicator } from './steps/StepIndicator';
import { StepPlan } from './steps/StepPlan';
import { StepPersonal } from './steps/StepPersonal';
import { StepBilling } from './steps/StepBilling';
import { StepConfirm } from './steps/StepConfirm';
import { StepDone } from './steps/StepDone';
import type { Step } from './types';
import type { UpgradeSheetProps } from './types';

const goBack: Partial<Record<Step, Step>> = {
  personal: 'plan',
  billing: 'personal',
  confirm: 'billing',
};

function UpgradeSheetContent({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    step,
    setStep,
    selectedPlan,
    selectedPlanInfo,
    canProceedData,
    handleClose,
    isExempt,
    planKey,
    hasPendingUpgrade,
    downgradeBlockedMessage,
    billingType,
    canProceedBilling,
    upgradeCalculation,
    setRequestError,
  } = useUpgradeSheetContext();

  const [showExemptConfirm, setShowExemptConfirm] = useState(false);

  const SelectedPlanIcon = PLAN_ICONS[selectedPlan] ?? ChevronRight;
  const isExemptSamePlan = isExempt && selectedPlan === planKey;
  const isExemptSuperiorPlan =
    isExempt &&
    planOrder.indexOf(selectedPlan) > planOrder.indexOf(planKey as PlanKey);

  const footer =
    step === 'done' ? null : (
      <SheetFooter>
        <div
          className={`flex items-center gap-2 ${goBack[step] ? 'flex-row' : ''}`}
        >
          {goBack[step] && (
            <button
              type="button"
              onClick={() => {
                if (goBack[step] === 'billing') setRequestError(null);
                setStep(goBack[step]!);
              }}
              className="shrink-0 flex items-center gap-1.5 px-4 h-10 rounded-md border-2 border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider text-petroleum/50 hover:text-petroleum hover:border-slate-300 transition-all"
            >
              <ArrowLeft size={12} />
              Voltar
            </button>
          )}
          <div className="flex-1">
            {step === 'plan' && (
              <>
                {hasPendingUpgrade ? (
                  <button
                    type="button"
                    disabled
                    className="btn-luxury-primary w-full opacity-60 cursor-not-allowed"
                  >
                    Aguardando confirmação do pagamento anterior
                  </button>
                ) : downgradeBlockedMessage ? (
                  <button
                    type="button"
                    disabled
                    title={downgradeBlockedMessage}
                    className="btn-luxury-primary w-full opacity-60 cursor-not-allowed"
                  >
                    Plano inferior — permitido após vencimento
                  </button>
                ) : isExemptSamePlan ? (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="btn-luxury-primary w-full"
                  >
                    Entendi
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isExemptSuperiorPlan) setShowExemptConfirm(true);
                      else setStep('personal');
                    }}
                    className="btn-luxury-primary w-full"
                  >
                    <SelectedPlanIcon size={14} strokeWidth={2} />
                    Assinar Plano {selectedPlanInfo?.name ?? selectedPlan}
                    <ChevronRight size={14} />
                  </button>
                )}
              </>
            )}
            {step === 'personal' && (
              <button
                type="button"
                disabled={!canProceedData}
                onClick={() => setStep('billing')}
                className="btn-luxury-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CreditCard size={14} />
                Próximo: Pagamento
                <ChevronRight size={14} />
              </button>
            )}
            {step === 'billing' && (
              <button
                type="button"
                disabled={
                  billingType === 'CREDIT_CARD' &&
                  !canProceedBilling &&
                  !(upgradeCalculation?.amount_final === 0)
                }
                onClick={() => setStep('confirm')}
                className="btn-luxury-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={14} />
                Revisar e Confirmar
                <ChevronRight size={14} />
              </button>
            )}
            {step === 'confirm' && <ConfirmButton />}
          </div>
        </div>
      </SheetFooter>
    );

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      title={STEP_TITLES[step].title}
      subtitle={STEP_TITLES[step].subtitle}
      icon={<Crown size={16} />}
      headerClassName="bg-petroleum"
      footer={footer}
      maxWidth="xl"
      position="right"
    >
      <div className="flex flex-col h-full">
        {step !== 'done' && <StepIndicator current={step} />}
        {step === 'plan' && <StepPlan />}
        {step === 'personal' && <StepPersonal />}
        {step === 'billing' && <StepBilling />}
        {step === 'confirm' && <StepConfirm />}
        {step === 'done' && <StepDone />}
      </div>

      <ConfirmationModal
        isOpen={showExemptConfirm}
        onClose={() => setShowExemptConfirm(false)}
        onConfirm={() => {
          setShowExemptConfirm(false);
          setStep('personal');
        }}
        title="Confirmar assinatura"
        message="Ao assinar um novo plano, seu benefício de isenção atual será substituído pela nova assinatura paga. Deseja prosseguir?"
        confirmText="Prosseguir"
        variant="primary"
        modalClassName="z-[9999]"
      />
    </Sheet>
  );
}

function ConfirmButton() {
  const {
    loading,
    handleConfirm,
    billingType,
    upgradeCalculation,
    isCalculationLoading,
  } = useUpgradeSheetContext();

  const isFreeUpgrade =
    upgradeCalculation?.is_free_upgrade === true ||
    (upgradeCalculation?.amount_final != null &&
      upgradeCalculation.amount_final === 0 &&
      upgradeCalculation.type !== 'downgrade');

  // Downgrade agendado fora da janela de arrependimento
  const isScheduledDowngrade =
    upgradeCalculation?.type === 'downgrade' &&
    upgradeCalculation.is_downgrade_withdrawal_window === false;

  const buttonLabel = () => {
    if (loading || isCalculationLoading) return null; // tratado no spinner
    if (isScheduledDowngrade) return 'Confirmar Agendamento';
    if (isFreeUpgrade) return 'Confirmar Atualização do Plano';
    if (billingType === 'PIX') return 'Confirmar e Gerar Pix';
    if (billingType === 'BOLETO') return 'Confirmar e Gerar Boleto';
    return 'Confirmar Solicitação';
  };

  return (
    <button
      type="button"
      disabled={loading || isCalculationLoading}
      onClick={handleConfirm}
      className="btn-luxury-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading || isCalculationLoading ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-petroleum/30 border-t-petroleum rounded-full animate-spin" />
          {isCalculationLoading ? 'Calculando...' : 'Processando…'}
        </>
      ) : (
        <>
          <ArrowRight size={14} />
          {buttonLabel()}
        </>
      )}
    </button>
  );
}

export function UpgradeSheet({
  isOpen,
  onClose,
  featureKey,
  initialPlanKey: initialPlanKeyProp,
  profileSource,
}: UpgradeSheetProps) {
  const ctx = usePlan();
  const profile = profileSource ?? ctx.profile;
  const email = profile?.email ?? ctx.email;

  const planKey = React.useMemo((): PlanKey => {
    if (profileSource) {
      const raw = String(
        profileSource.plan_key ?? 'FREE',
      ).toUpperCase() as PlanKey;
      return planOrder.includes(raw) ? raw : 'FREE';
    }
    return ctx.planKey as PlanKey;
  }, [profileSource, ctx.planKey]);

  const { terms, segment } = useSegment();

  const suggestedPlanKey = React.useMemo((): PlanKey => {
    if (initialPlanKeyProp) return initialPlanKeyProp;
    if (!featureKey) return 'PRO';
    return findNextPlanKeyWithFeature(planKey as PlanKey, featureKey) ?? 'PRO';
  }, [planKey, featureKey, initialPlanKeyProp]);

  return (
    <UpgradeSheetProvider
      isOpen={isOpen}
      onClose={onClose}
      suggestedPlanKey={suggestedPlanKey}
      planKey={planKey}
      profile={profile ?? null}
      email={email}
      segment={segment}
      terms={terms}
    >
      <UpgradeSheetContent isOpen={isOpen} onClose={onClose} />
    </UpgradeSheetProvider>
  );
}
