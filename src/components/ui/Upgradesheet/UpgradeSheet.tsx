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
import { TermsOfServiceModal } from '@/app/(public)/termos/TermosContent';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import type { PlanKey } from '@/core/config/plans';
import { findNextPlanKeyWithFeature, planOrder } from '@/core/config/plans';
import { usePlan } from '@/core/context/PlanContext';
import { useSegment } from '@/hooks/useSegment';
import { UpgradeSheetProvider, useUpgradeSheetContext } from './UpgradeSheetContext';
import { PLAN_ICONS, STEP_TITLES } from './constants';
import { StepIndicator } from './StepIndicator';
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

function UpgradeSheetContent({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    step,
    setStep,
    selectedPlan,
    selectedPlanInfo,
    canProceedData,
    acceptedTerms,
    loading,
    handleClose,
    isExempt,
    planKey,
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
        <div className={`flex items-center gap-2 ${goBack[step] ? 'flex-row' : ''}`}>
          {goBack[step] && (
            <button
              type="button"
              onClick={() => setStep(goBack[step]!)}
              className="shrink-0 flex items-center gap-1.5 px-4 h-10 rounded-luxury border-2 border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider text-petroleum/50 hover:text-petroleum hover:border-slate-300 transition-all"
            >
              <ArrowLeft size={12} />
              Voltar
            </button>
          )}
          <div className="flex-1">
            {step === 'plan' && (
              <>
                {isExemptSamePlan ? (
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
                onClick={() => setStep('confirm')}
                className="btn-luxury-primary w-full"
              >
                <CheckCircle2 size={14} />
                Revisar e Confirmar
                <ChevronRight size={14} />
              </button>
            )}
            {step === 'confirm' && (
              <ConfirmButton />
            )}
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
      <TermsOfServiceModalWrapper />
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
      />
    </Sheet>
  );
}

function ConfirmButton() {
  const { acceptedTerms, loading, handleConfirm, billingType } = useUpgradeSheetContext();
  return (
    <button
      type="button"
      disabled={!acceptedTerms || loading}
      onClick={handleConfirm}
      className="btn-luxury-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-petroleum/30 border-t-petroleum rounded-full animate-spin" />
          Processando…
        </>
      ) : (
        <>
          <ArrowRight size={14} />
          {billingType === 'PIX' ? 'Confirmar e Gerar Pix' : 'Confirmar Solicitação'}
        </>
      )}
    </button>
  );
}

function TermsOfServiceModalWrapper() {
  const { showTermsModal, setShowTermsModal } = useUpgradeSheetContext();
  return (
    <TermsOfServiceModal
      isOpen={showTermsModal}
      onClose={() => setShowTermsModal(false)}
    />
  );
}

export function UpgradeSheet({
  isOpen,
  onClose,
  featureKey,
  initialPlanKey: initialPlanKeyProp,
}: UpgradeSheetProps) {
  const { planKey, profile, email } = usePlan();
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
      planKey={planKey as PlanKey}
      profile={profile}
      email={email}
      segment={segment}
      terms={terms}
    >
      <UpgradeSheetContent isOpen={isOpen} onClose={onClose} />
    </UpgradeSheetProvider>
  );
}
