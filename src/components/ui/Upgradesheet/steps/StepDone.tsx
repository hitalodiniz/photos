'use client';

import React from 'react';
import { Sparkles, QrCode, FileText, CreditCard } from 'lucide-react';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';

export function StepDone() {
  const {
    paymentUrl,
    selectedPlanInfo,
    selectedPlan,
    billingType,
    handleClose,
  } = useUpgradeSheetContext();

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center">
        <Sparkles size={28} className="text-gold" />
      </div>
      <div className="space-y-2">
        <p className="text-[16px] font-bold text-petroleum uppercase tracking-wide">
          Solicitação enviada!
        </p>
        <p className="text-[12px] text-petroleum/60 leading-relaxed max-w-[260px]">
          {paymentUrl ? (
            <>
              Plano{' '}
              <strong className="text-petroleum">
                {selectedPlanInfo?.name ?? selectedPlan}
              </strong>
              . Conclua o pagamento para ativar.
            </>
          ) : (
            <>
              Recebemos o interesse no plano{' '}
              <strong className="text-petroleum">
                {selectedPlanInfo?.name ?? selectedPlan}
              </strong>
              . Em breve entraremos em contato pelo WhatsApp para concluir.
            </>
          )}
        </p>
      </div>
      {paymentUrl && (
        <a
          href={paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-luxury-primary w-full max-w-[220px] flex items-center justify-center gap-2"
        >
          {billingType === 'PIX' && <QrCode size={16} />}
          {billingType === 'BOLETO' && <FileText size={16} />}
          {billingType === 'CREDIT_CARD' && <CreditCard size={16} />}
          {billingType === 'PIX'
            ? 'Ver QR Code PIX'
            : billingType === 'BOLETO'
              ? 'Baixar Boleto'
              : 'Ir para pagamento'}
        </a>
      )}
      <button
        type="button"
        onClick={handleClose}
        className="text-[10px] font-bold uppercase tracking-wider text-gold hover:text-gold/70 transition-colors"
      >
        Fechar
      </button>
    </div>
  );
}
