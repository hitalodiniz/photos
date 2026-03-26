'use client';

import React from 'react';
import { CalendarCheck, Check, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';
import { formatDateLong } from '../utils';
import { StepDoneWrapper } from '@/components/ui/Billing/StepDoneWrapper';

const WHATSAPP_SUPPORT = '5531993522018';

function SupportLink() {
  const msg = encodeURIComponent(
    'Olá! Preciso de ajuda com meu pedido de upgrade.',
  );
  return (
    <a
      href={`https://wa.me/${WHATSAPP_SUPPORT}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 text-[10px] text-petroleum/80 hover:text-petroleum transition-colors"
    >
      <MessageCircle size={11} />
      Precisa de ajuda? Fale conosco
    </a>
  );
}

function ScheduledDone({
  planName,
  effectiveAt,
  onClose,
}: {
  planName: string;
  effectiveAt: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 px-4 py-3">
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-gold/10 border-2 border-gold/25 flex items-center justify-center">
          <CalendarCheck size={26} className="text-gold" />
        </div>
        <p className="text-[15px] font-bold text-petroleum uppercase">
          Downgrade agendado
        </p>
      </div>
      <p className="text-[11px] text-petroleum/80 text-center">
        A mudança para <strong>{planName}</strong> ocorrerá em{' '}
        <strong>{formatDateLong(effectiveAt)}</strong>.
      </p>
      <button type="button" onClick={onClose} className="btn-luxury-primary w-full">
        Fechar
      </button>
      <SupportLink />
    </div>
  );
}

function ImmediateDone({
  planName,
  onClose,
}: {
  planName: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 px-4 py-3">
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
          <Check size={26} className="text-emerald-600" strokeWidth={2.5} />
        </div>
        <p className="text-[15px] font-bold text-petroleum uppercase">Plano alterado</p>
      </div>
      <p className="text-[11px] text-petroleum/80 text-center">
        Seu plano foi alterado para <strong>{planName}</strong> imediatamente.
      </p>
      <button type="button" onClick={onClose} className="btn-luxury-primary w-full">
        Fechar
      </button>
      <SupportLink />
    </div>
  );
}

export function StepDoneRefactored() {
  const router = useRouter();
  const {
    paymentUrl,
    paymentDueDate,
    pixData,
    downgradeEffectiveAt,
    selectedPlanInfo,
    selectedPlan,
    billingType,
    billingPeriod,
    handleClose,
    upgradeRequestId,
    upgradeCalculation,
    requestWarning,
  } = useUpgradeSheetContext();

  const planName = selectedPlanInfo?.name ?? selectedPlan;
  const amount =
    typeof upgradeCalculation?.amount_final === 'number'
      ? upgradeCalculation.amount_final
      : selectedPlanInfo?.price;
  const nextBillingDateFormatted = upgradeCalculation?.new_expiry_date
    ? formatDateLong(upgradeCalculation.new_expiry_date)
    : null;

  const handleCloseAndRefresh = () => {
    handleClose();
    router.refresh();
  };

  const isScheduledChange =
    upgradeCalculation?.type === 'downgrade' &&
    upgradeCalculation.is_downgrade_withdrawal_window === false &&
    !!downgradeEffectiveAt;
  const isImmediateDowngrade =
    upgradeCalculation?.type === 'downgrade' &&
    upgradeCalculation.is_downgrade_withdrawal_window === true;

  if (isScheduledChange && downgradeEffectiveAt) {
    return (
      <div className="flex flex-col min-h-full overflow-y-auto">
        <ScheduledDone
          planName={planName}
          effectiveAt={downgradeEffectiveAt}
          onClose={handleCloseAndRefresh}
        />
      </div>
    );
  }

  if (isImmediateDowngrade && (upgradeCalculation?.amount_final ?? 0) === 0) {
    return (
      <div className="flex flex-col min-h-full overflow-y-auto">
        <ImmediateDone planName={planName} onClose={handleCloseAndRefresh} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full overflow-y-auto">
      {requestWarning && (
        <div className="mx-4 mt-2 rounded-luxury border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-[11px] text-amber-900 font-medium">{requestWarning}</p>
        </div>
      )}
      <StepDoneWrapper
        billingType={billingType}
        status="pending"
        paymentData={{
          pixData: pixData ?? {},
          paymentUrl,
          paymentDueDate,
          amount,
        }}
        planInfo={{
          name: planName,
          period: billingPeriod ?? 'monthly',
          nextBillingDate: nextBillingDateFormatted,
        }}
        upgradeRequestId={upgradeRequestId ?? ''}
        onClose={handleCloseAndRefresh}
      />
    </div>
  );
}

