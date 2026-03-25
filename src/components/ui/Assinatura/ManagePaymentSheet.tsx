'use client';

import React, { useEffect, useState } from 'react';
import { Settings, CreditCard, QrCode, Banknote, Lock } from 'lucide-react';
import { Sheet, SheetSection, SheetFooter } from '@/components/ui/Sheet';
import { useToast } from '@/hooks/useToast';
import { getBillingProfile } from '@/core/services/billing.service';
import { updateSubscriptionBillingMethod } from '@/core/services/asaas.service';
import type { BillingType } from '@/core/types/billing';
import {
  BillingFormBlock,
  emptyCardFields,
  isCreditCardValid,
  type CreditCardFields,
} from './BillingFormBlock';

interface ManagePaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubscriptionId: string;
  profileFullName?: string;
  profileEmail?: string;
  profilePhone?: string;
  currentBillingType?: BillingType;
  onSuccess: () => void;
}

export function ManagePaymentSheet({
  isOpen,
  onClose,
  activeSubscriptionId,
  profileFullName,
  profileEmail,
  profilePhone,
  currentBillingType = 'CREDIT_CARD',
  onSuccess,
}: ManagePaymentSheetProps) {
  const [billingType, setBillingType] = useState<BillingType>('CREDIT_CARD');
  const [creditCard, setCreditCard] =
    useState<CreditCardFields>(emptyCardFields());
  const [billingProfile, setBillingProfile] = useState<{
    full_name?: string;
    cpf_cnpj: string;
    postal_code: string;
    address: string;
    address_number: string;
    complement?: string;
    province: string;
    city: string;
    state: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast, ToastElement } = useToast();

  useEffect(() => {
    if (!isOpen || billingType !== 'CREDIT_CARD' || billingProfile) return;
    getBillingProfile().then((b) => {
      if (b) setBillingProfile(b);
    });
  }, [isOpen, billingType, billingProfile]);

  useEffect(() => {
    if (!isOpen) {
      setBillingType('CREDIT_CARD');
      setCreditCard(emptyCardFields());
    }
  }, [isOpen]);

  const formatCancellationDetails = (detailsString: string) => {
    if (!detailsString) return '';

    // Regex para capturar as datas e o motivo
    const dateMatch = detailsString.match(/solicitado em (.*?)Z/);
    const accessMatch = detailsString.match(/Acesso até (.*?)Z/);
    const reasonMatch = detailsString.match(/Motivo: (.*)/);

    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch {
        return dateStr;
      }
    };

    // Mapeamento de motivos técnicos para nomes amigáveis
    const reasonMap: Record<string, string> = {
      too_expensive: 'Valor muito alto',
      not_using: 'Não estou utilizando o suficiente',
      missing_features: 'Faltam recursos que preciso',
      technical_issues: 'Problemas técnicos',
      other: 'Outro motivo',
    };

    const requestedAt = dateMatch ? formatDate(dateMatch[1]) : '';
    const accessUntil = accessMatch ? formatDate(accessMatch[1]) : '';
    const reason = reasonMatch
      ? reasonMap[reasonMatch[1].trim()] || reasonMatch[1]
      : '';

    return (
      <div className="space-y-1 text-[11px] text-petroleum/70 bg-slate-50 p-2 rounded-md border border-slate-100">
        <p>
          📅 <strong>Solicitado em:</strong> {requestedAt}
        </p>
        <p>
          🔓 <strong>Acesso liberado até:</strong> {accessUntil}
        </p>
        {reason && (
          <p>
            💬 <strong>Motivo informado:</strong> {reason}
          </p>
        )}
      </div>
    );
  };

  const canConfirm =
    !loading &&
    (billingType !== 'CREDIT_CARD' ||
      (!!billingProfile && isCreditCardValid(creditCard)));

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (billingType === 'PIX' || billingType === 'BOLETO') {
        const result = await updateSubscriptionBillingMethod(
          activeSubscriptionId,
          billingType,
        );
        if (result.success) {
          onClose();
          onSuccess();
          showToast(
            `Forma de pagamento alterada para ${billingType}. Suas próximas faturas usarão este método.`,
            'success',
          );
        } else {
          showToast(result.error ?? 'Erro ao alterar.', 'error');
        }
        return;
      }

      if (!billingProfile) {
        showToast(
          'Carregue seus dados fiscais antes de cadastrar o cartão.',
          'error',
        );
        return;
      }

      const digits = (profilePhone ?? '').replace(/\D/g, '');
      const result = await updateSubscriptionBillingMethod(
        activeSubscriptionId,
        'CREDIT_CARD',
        {
          holderName: creditCard.credit_card_holder_name,
          number: creditCard.credit_card_number.replace(/\D/g, ''),
          expiryMonth: creditCard.credit_card_expiry_month
            .replace(/\D/g, '')
            .padStart(2, '0')
            .slice(-2),
          expiryYear: creditCard.credit_card_expiry_year.replace(/\D/g, ''),
          ccv: creditCard.credit_card_ccv.replace(/\D/g, ''),
        },
        {
          name:
            billingProfile.full_name?.trim() || profileFullName || 'Titular',
          email: profileEmail ?? '',
          cpfCnpj: billingProfile.cpf_cnpj.replace(/\D/g, ''),
          postalCode: billingProfile.postal_code.replace(/\D/g, ''),
          addressNumber: billingProfile.address_number,
          addressComplement: billingProfile.complement,
          phone: digits,
          mobilePhone: digits,
        },
      );

      if (result.success) {
        onClose();
        onSuccess();
        showToast(
          'Cartão atualizado. Suas próximas cobranças usarão este cartão.',
          'success',
        );
      } else {
        showToast(result.error ?? 'Erro ao atualizar cartão.', 'error');
      }
    } catch {
      showToast('Erro ao alterar forma de pagamento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet
        isOpen={isOpen}
        onClose={() => {
          if (!loading) onClose();
        }}
        title="Gerenciar Pagamento"
        subtitle="Altere a forma de cobrança das suas próximas faturas"
        icon={<Settings size={18} strokeWidth={2.5} />}
        headerClassName="bg-petroleum"
        maxWidth="md"
        position="right"
        footer={
          <SheetFooter className="bg-petroleum border-t border-petroleum/10">
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="btn-luxury-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando…
                  </span>
                ) : (
                  'Confirmar Alteração'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary-white"
              >
                Cancelar
              </button>
            </div>
          </SheetFooter>
        }
      >
        <SheetSection
          title="Método de Pagamento Atual"
          className="py-2 px-3 space-y-1.5"
        >
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-luxury">
            {currentBillingType === 'CREDIT_CARD' && (
              <CreditCard size={18} className="text-petroleum" />
            )}
            {currentBillingType === 'PIX' && (
              <QrCode size={18} className="text-petroleum" />
            )}
            {currentBillingType === 'BOLETO' && (
              <Banknote size={18} className="text-petroleum" />
            )}
            <span className="text-[12px] font-semibold text-petroleum uppercase tracking-wide">
              {currentBillingType === 'CREDIT_CARD'
                ? 'Cartão de Crédito'
                : currentBillingType}
            </span>
          </div>
        </SheetSection>

        <SheetSection
          title="Nova Forma de Pagamento"
          className="py-2 px-3 space-y-1.5"
        >
          <div className="flex gap-1.5">
            {[
              {
                value: 'CREDIT_CARD' as BillingType,
                label: 'Cartão',
                Icon: CreditCard,
              },
              { value: 'PIX' as BillingType, label: 'PIX', Icon: QrCode },
              {
                value: 'BOLETO' as BillingType,
                label: 'Boleto',
                Icon: Banknote,
              },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setBillingType(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[0.4rem] border transition-all flex-1 min-w-0 ${
                  billingType === value
                    ? 'border-gold bg-gold/10 text-petroleum'
                    : 'border-slate-200 bg-slate-50 text-petroleum/50 hover:border-gold/40'
                }`}
              >
                <Icon size={16} strokeWidth={1.5} className="shrink-0" />
                <span className="text-[9px] font-semibold uppercase tracking-wide truncate">
                  {label}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-petroleum/90 leading-snug pt-1">
            A nova forma de pagamento será usada para todas as faturas futuras.
            Alterar para <strong>PIX</strong> ou <strong>Boleto</strong> remove
            o cartão de crédito da assinatura, cancelando a cobrança automática
            recorrente.
          </p>
        </SheetSection>

        {billingType === 'CREDIT_CARD' && (
          <SheetSection
            title="Dados do cartão"
            className="py-2 px-3 space-y-1.5"
          >
            {!billingProfile && (
              <p className="text-[11px] text-slate-500 mb-3">
                Carregando dados fiscais…
              </p>
            )}
            {billingProfile && (
              <p className="text-[10px] text-emerald-700 font-medium mb-3">
                Dados fiscais carregados. Preencha os dados do cartão abaixo.
              </p>
            )}
            {billingProfile && (
              <>
                <BillingFormBlock
                  billingType={billingType}
                  onChangeBillingType={() => {}}
                  creditCard={creditCard}
                  onChangeCreditCard={setCreditCard}
                  disabled={loading}
                  hideBillingTypeSelector
                />
              </>
            )}
          </SheetSection>
        )}
      </Sheet>
      {ToastElement}
    </>
  );
}
