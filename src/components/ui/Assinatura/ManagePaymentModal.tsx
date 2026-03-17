'use client';

import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
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

interface ManagePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubscriptionId: string;
  profileFullName?: string;
  profileEmail?: string;
  profilePhone?: string;
  onSuccess: () => void;
}

/**
 * Modal de troca de forma de pagamento da assinatura vigente.
 * Reutiliza BillingFormBlock — sem seleção de período, sem pro-rata.
 */
export function ManagePaymentModal({
  isOpen,
  onClose,
  activeSubscriptionId,
  profileFullName,
  profileEmail,
  profilePhone,
  onSuccess,
}: ManagePaymentModalProps) {
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

  // Carrega dados fiscais ao abrir com cartão selecionado
  useEffect(() => {
    if (!isOpen || billingType !== 'CREDIT_CARD' || billingProfile) return;
    getBillingProfile().then((b) => {
      if (b) setBillingProfile(b);
    });
  }, [isOpen, billingType, billingProfile]);

  // Reset ao fechar
  useEffect(() => {
    if (!isOpen) {
      setBillingType('CREDIT_CARD');
      setCreditCard(emptyCardFields());
    }
  }, [isOpen]);

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

      // Cartão de crédito
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

  const footer = (
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
          'Confirmar'
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
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={() => {
          if (!loading) onClose();
        }}
        title="Gerenciar pagamento"
        subtitle="Escolha a forma de cobrança das próximas faturas"
        maxWidth="md"
        footer={footer}
      >
        <div className="py-2">
          {billingType === 'CREDIT_CARD' && !billingProfile && (
            <p className="text-[11px] text-slate-500 mb-3">
              Carregando dados fiscais…
            </p>
          )}
          {billingType === 'CREDIT_CARD' && billingProfile && (
            <p className="text-[10px] text-emerald-700 font-medium mb-3">
              Dados fiscais carregados. Preencha os dados do cartão abaixo.
            </p>
          )}
          <BillingFormBlock
            billingType={billingType}
            onChangeBillingType={setBillingType}
            creditCard={creditCard}
            onChangeCreditCard={setCreditCard}
            disabled={loading}
          />
        </div>
      </BaseModal>
      {ToastElement}
    </>
  );
}
