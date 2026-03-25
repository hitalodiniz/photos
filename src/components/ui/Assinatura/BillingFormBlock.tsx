'use client';

import React from 'react';
import {
  CreditCard,
  QrCode,
  Banknote,
  User,
  Lock,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

import { PIX_DISCOUNT_PERCENT } from '@/core/config/plans';
import type { BillingType } from '@/core/types/billing';

import {
  validateCreditCard,
  detectBrand,
  brandLabel,
  type CardErrors,
} from '@/core/utils/creditCardValidation';
import { FieldLabel } from '../Upgradesheet/FieldLabel';
import {
  formatCreditCardNumber,
  formatExpiryMonth,
  formatExpiryYear,
  formatCcv,
} from '../Upgradesheet/utils';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface CreditCardFields {
  credit_card_holder_name: string;
  credit_card_number: string;
  credit_card_expiry_month: string;
  credit_card_expiry_year: string;
  credit_card_ccv: string;
}

export interface BillingFormBlockProps {
  billingType: BillingType;
  onChangeBillingType: (type: BillingType) => void;
  creditCard: CreditCardFields;
  onChangeCreditCard: (card: CreditCardFields) => void;
  /** Desabilita todos os inputs (ex.: enquanto salva) */
  disabled?: boolean;
  /** Exibe nota sobre desconto PIX no semestral/anual. Padrão: false */
  showPixDiscountNote?: boolean;
  /** Exibe seleção de parcelas. Padrão: false */
  showInstallments?: boolean;
  installments?: number;
  onChangeInstallments?: (n: number) => void;
  maxInstallments?: number;
  amountFinal?: number;
  /** Oculta a primeira linha com os botões de tipo de pagamento. Padrão: false */
  hideBillingTypeSelector?: boolean;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <AlertCircle size={9} className="text-red-500 shrink-0" />
      <p className="text-[8px] text-red-500 font-medium leading-tight">
        {message}
      </p>
    </div>
  );
}

function BrandBadge({ number }: { number: string }) {
  const brand = detectBrand(number);
  const label = brandLabel(brand);
  if (!label) return null;
  return (
    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-semibold text-petroleum/40 uppercase tracking-wide pointer-events-none">
      {label}
    </span>
  );
}

function formatBRLDecimal(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Bloco reutilizável de seleção de forma de pagamento + dados do cartão.
 * Sem seleção de período, sem pro-rata, sem contexto do UpgradeSheet.
 * Usado tanto no StepBilling quanto no ManagePaymentModal.
 */
export function BillingFormBlock({
  billingType,
  onChangeBillingType,
  creditCard,
  onChangeCreditCard,
  disabled = false,
  showPixDiscountNote = false,
  showInstallments = false,
  installments = 1,
  onChangeInstallments,
  maxInstallments = 1,
  amountFinal = 0,
  hideBillingTypeSelector = false,
}: BillingFormBlockProps) {
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [errors, setErrors] = React.useState<CardErrors>({});

  const brand = detectBrand(creditCard.credit_card_number);

  // Valida cartão sempre que campos mudam
  React.useEffect(() => {
    if (billingType !== 'CREDIT_CARD') {
      setErrors({});
      return;
    }
    setErrors(validateCreditCard(creditCard));
  }, [creditCard, billingType]);

  // Limpa touched ao trocar de método
  React.useEffect(() => {
    setTouched({});
  }, [billingType]);

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  const err = (field: keyof CardErrors) =>
    touched[field] ? errors[field] : null;

  const methods = [
    { value: 'CREDIT_CARD' as BillingType, label: 'Cartão', Icon: CreditCard },
    { value: 'PIX' as BillingType, label: 'PIX', Icon: QrCode },
    { value: 'BOLETO' as BillingType, label: 'Boleto', Icon: Banknote },
  ] as const;

  return (
    <div className="space-y-3">
      {/* Seleção de método */}
      {!hideBillingTypeSelector && (
        <div className="flex gap-1.5">
          {methods.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => onChangeBillingType(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[0.4rem] border transition-all flex-1 min-w-0 ${
                disabled
                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
                  : billingType === value
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
      )}

      {/* Nota PIX */}
      {showPixDiscountNote && (
        <p className="text-[11px] text-petroleum/90 leading-snug">
          Pagamento via <strong className="text-petroleum">PIX</strong> tem{' '}
          <strong>{PIX_DISCOUNT_PERCENT}% de desconto</strong> no semestral e no
          anual. Parcelamento só no cartão.
        </p>
      )}

      {/* Dados do cartão */}
      {billingType === 'CREDIT_CARD' && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Nome no cartão */}
            <div className="space-y-0.5">
              <FieldLabel icon={User} label="Nome no cartão" required />
              <input
                type="text"
                disabled={disabled}
                value={creditCard.credit_card_holder_name}
                onChange={(e) =>
                  onChangeCreditCard({
                    ...creditCard,
                    credit_card_holder_name: e.target.value,
                  })
                }
                onBlur={() => touch('credit_card_holder_name')}
                placeholder="Como está no cartão"
                className={`w-full px-2 py-1.5 h-8 bg-slate-50 border rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none transition-colors focus:border-gold/60 disabled:opacity-50 ${
                  err('credit_card_holder_name')
                    ? 'border-red-300'
                    : 'border-slate-200'
                }`}
              />
              <FieldError message={err('credit_card_holder_name')} />
            </div>

            {/* Número */}
            <div className="space-y-0.5">
              <FieldLabel icon={CreditCard} label="Número do cartão" required />
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={disabled}
                  value={creditCard.credit_card_number}
                  onChange={(e) =>
                    onChangeCreditCard({
                      ...creditCard,
                      credit_card_number: formatCreditCardNumber(
                        e.target.value,
                      ),
                    })
                  }
                  onBlur={() => touch('credit_card_number')}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className={`w-full px-2 py-1.5 h-8 bg-slate-50 border rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none transition-colors focus:border-gold/60 pr-14 disabled:opacity-50 ${
                    err('credit_card_number')
                      ? 'border-red-300'
                      : 'border-slate-200'
                  }`}
                />
                <BrandBadge number={creditCard.credit_card_number} />
              </div>
              <FieldError message={err('credit_card_number')} />
            </div>
          </div>

          {/* Validade + CVV + Parcelas */}
          <div className="grid grid-cols-3 gap-2">
            {/* Validade */}
            <div className="space-y-0.5">
              <FieldLabel icon={Lock} label="Validade" required />
              <div className="flex gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={disabled}
                  value={creditCard.credit_card_expiry_month}
                  onChange={(e) =>
                    onChangeCreditCard({
                      ...creditCard,
                      credit_card_expiry_month: formatExpiryMonth(
                        e.target.value,
                      ),
                    })
                  }
                  onBlur={() => touch('expiry_month')}
                  placeholder="MM"
                  className="w-full px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum outline-none disabled:opacity-50"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={disabled}
                  value={creditCard.credit_card_expiry_year}
                  onChange={(e) =>
                    onChangeCreditCard({
                      ...creditCard,
                      credit_card_expiry_year: formatExpiryYear(e.target.value),
                    })
                  }
                  onBlur={() => touch('expiry_year')}
                  placeholder="AA"
                  maxLength={2}
                  className="w-full px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum outline-none disabled:opacity-50"
                />
              </div>
              {touched['expiry_month'] &&
                touched['expiry_year'] &&
                errors.expiry && <FieldError message={errors.expiry} />}
            </div>

            {/* CVV */}
            <div className="space-y-0.5">
              <FieldLabel icon={Lock} label="CVV" required />
              <input
                type="text"
                inputMode="numeric"
                disabled={disabled}
                value={creditCard.credit_card_ccv}
                onChange={(e) =>
                  onChangeCreditCard({
                    ...creditCard,
                    credit_card_ccv: formatCcv(e.target.value),
                  })
                }
                onBlur={() => touch('credit_card_ccv')}
                placeholder={brand === 'amex' ? '1234' : '123'}
                maxLength={brand === 'amex' ? 4 : 3}
                className={`w-full px-2 py-1.5 h-8 bg-slate-50 border rounded-[0.4rem] text-[10px] text-petroleum outline-none disabled:opacity-50 ${
                  err('credit_card_ccv') ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              <FieldError message={err('credit_card_ccv')} />
            </div>

            {/* Parcelas */}
            {showInstallments && (
              <div className="space-y-0.5">
                <FieldLabel icon={ChevronDown} label="Parcelas" />
                <div className="relative">
                  <select
                    value={installments}
                    disabled={disabled}
                    onChange={(e) =>
                      onChangeInstallments?.(Number(e.target.value))
                    }
                    className="w-full appearance-none px-2 py-1.5 h-10 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none cursor-pointer pr-6 focus:border-gold/60 disabled:opacity-50"
                  >
                    {Array.from({ length: maxInstallments }, (_, i) => {
                      const n = i + 1;
                      const v = Math.round((amountFinal / n) * 100) / 100;
                      return (
                        <option key={n} value={n}>
                          {n}x de R$ {formatBRLDecimal(v)}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    size={10}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-petroleum/40 pointer-events-none"
                  />
                </div>
              </div>
            )}
          </div>

          <p className="flex items-center gap-1 text-[10px] text-petroleum/80">
            <Lock size={8} /> Dados protegidos e não armazenados.
          </p>
        </div>
      )}

      {/* Confirmação PIX/Boleto */}
      {(billingType === 'PIX' || billingType === 'BOLETO') && (
        <p className="text-[13px] text-petroleum/90 leading-relaxed">
          Suas próximas faturas serão geradas via <strong>{billingType}</strong>
          .
        </p>
      )}
    </div>
  );
}

// ─── Hook utilitário ──────────────────────────────────────────────────────────

/** Estado inicial vazio para CreditCardFields */
export function emptyCardFields(): CreditCardFields {
  return {
    credit_card_holder_name: '',
    credit_card_number: '',
    credit_card_expiry_month: '',
    credit_card_expiry_year: '',
    credit_card_ccv: '',
  };
}

/** Retorna true se o cartão está válido para submissão */
export function isCreditCardValid(card: CreditCardFields): boolean {
  const errors = validateCreditCard(card);
  return !Object.values(errors).some(Boolean);
}
