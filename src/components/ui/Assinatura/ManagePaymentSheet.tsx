'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Settings,
  CreditCard,
  QrCode,
  Banknote,
  RefreshCw,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Sheet, SheetSection, SheetFooter } from '@/components/ui/Sheet';
import { useToast } from '@/hooks/useToast';
import { getBillingProfile } from '@/core/services/billing.service';
import {
  deletePendingInvoiceBeforeBillingChange,
  updateSubscriptionBillingMethod,
} from '@/core/services/asaas.service';
import type { BillingType } from '@/core/types/billing';
import { StepDoneWrapper } from '@/components/ui/Billing/StepDoneWrapper';
import {
  BillingFormBlock,
  emptyCardFields,
  isCreditCardValid,
  type CreditCardFields,
} from './BillingFormBlock';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Fatura pendente já existente no Asaas (PIX ou Boleto).
 * Quando presente, a Sheet abre direto na visualização da fatura.
 */
export interface ExistingInvoice {
  billingType?: BillingType | null;
  paymentUrl?: string | null;
  pixQrCode?: string | null; // base64 da imagem do QR Code
  pixCopyPaste?: string | null; // string copia-e-cola
  dueDate?: string | null;
  amount?: number;
}

interface ManagePaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubscriptionId: string;
  activeRequestId?: string;
  profileFullName?: string;
  profileEmail?: string;
  profilePhone?: string;
  /** Tipo atual da assinatura — define seleção inicial no seletor */
  currentBillingType?: BillingType;
  hasRejectedInvoice?: boolean;
  activeRequestStatus?: 'pending' | 'approved' | 'rejected' | 'overdue';
  amount?: number;
  dueDate?: string | null;
  planName?: string;
  planPeriod?: string;
  overdueSince?: string | null;
  /** Fatura pendente já gerada — exibida direto sem precisar confirmar */
  existingInvoice?: ExistingInvoice | null;
  onSuccess: (newPaymentId?: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Três estados de navegação dentro da Sheet
type UIMode =
  | 'show_existing' // fatura pendente já existente → exibe QR/boleto
  | 'select_method' // seletor de método (troca ou 1ª vez sem fatura)
  | 'show_new'; // nova fatura recém-gerada após confirmação

// ─── Componente principal ─────────────────────────────────────────────────────

export function ManagePaymentSheet({
  isOpen,
  onClose,
  activeSubscriptionId,
  activeRequestId,
  profileFullName,
  profileEmail,
  profilePhone,
  currentBillingType = 'CREDIT_CARD',
  hasRejectedInvoice = false,
  activeRequestStatus = 'pending',
  amount,
  dueDate,
  planName = 'PRO',
  planPeriod = 'monthly',
  overdueSince,
  existingInvoice = null,
  onSuccess,
}: ManagePaymentSheetProps) {
  const mustUseImmediateMethod =
    activeRequestStatus === 'overdue' || hasRejectedInvoice || !!overdueSince;

  // ── Estado de UI ────────────────────────────────────────────────────────────

  const hasExistingInvoiceData = !!(
    existingInvoice &&
    (existingInvoice.paymentUrl ||
      existingInvoice.pixQrCode ||
      existingInvoice.pixCopyPaste)
  );
  const existingInvoiceBillingType = existingInvoice?.billingType
    ? String(existingInvoice.billingType).toUpperCase()
    : existingInvoice?.pixQrCode || existingInvoice?.pixCopyPaste
      ? 'PIX'
      : currentBillingType === 'BOLETO' && existingInvoice?.paymentUrl
        ? 'BOLETO'
        : null;
  const hasExistingInvoice =
    hasExistingInvoiceData &&
    existingInvoiceBillingType === String(currentBillingType).toUpperCase();

  const initialMode: UIMode = hasExistingInvoice
    ? 'show_existing'
    : 'select_method';
  const [mode, setMode] = useState<UIMode>(initialMode);

  // billingType começa com o tipo atual da assinatura, não hardcoded CREDIT_CARD
  const [billingType, setBillingType] =
    useState<BillingType>(currentBillingType);

  // Nova fatura gerada após confirmação
  const [newInvoice, setNewInvoice] = useState<{
    billingType: BillingType;
    status: 'pending' | 'approved' | 'rejected' | 'overdue';
    /** Request usado pelo StepDone para polling (pode mudar após cobrança substituta) */
    requestId?: string;
    paymentUrl?: string | null;
    pixQrCode?: string | null;
    pixCopyPaste?: string | null;
    dueDate?: string | null;
    amount?: number;
  } | null>(null);

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
  /** Retentativa automática ao abrir (cartão salvo no Asaas) */
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { showToast, ToastElement } = useToast();
  const autoCaptureAttemptedRef = useRef(false);

  const setCreditCardAndClearError = useCallback((next: CreditCardFields) => {
    setInlineError(null);
    setCreditCard(next);
  }, []);

  // ── Reidrata estado ao abrir/fechar ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setMode(hasExistingInvoice ? 'show_existing' : 'select_method');
      setBillingType(currentBillingType);
      setInlineError(null);
      // Em rejeição de cartão, sempre inicia limpo para nova tentativa.
      if (hasRejectedInvoice && currentBillingType === 'CREDIT_CARD') {
        setCreditCard(emptyCardFields());
      }
      return;
    }
    if (!isOpen) {
      setMode(hasExistingInvoice ? 'show_existing' : 'select_method');
      setBillingType(currentBillingType);
      setCreditCard(emptyCardFields());
      setNewInvoice(null);
      setInlineError(null);
    }
  }, [isOpen, currentBillingType, hasExistingInvoice, hasRejectedInvoice]);

  // Sincroniza se currentBillingType mudar externamente
  useEffect(() => {
    setBillingType(currentBillingType);
  }, [currentBillingType]);

  // Retentativa automática de captura ao abrir (cartão no Asaas + fatura pendente/rejeitada)
  useEffect(() => {
    if (!isOpen) {
      autoCaptureAttemptedRef.current = false;
      setVerifyingPayment(false);
      return;
    }
    if (autoCaptureAttemptedRef.current) return;
    if (currentBillingType !== 'CREDIT_CARD') return;
    if (!hasRejectedInvoice && activeRequestStatus !== 'overdue') return;
    if (!activeSubscriptionId?.trim() || !activeRequestId?.trim()) return;
    if (hasExistingInvoice) return;

    autoCaptureAttemptedRef.current = true;
    let cancelled = false;

    (async () => {
      setVerifyingPayment(true);
      setInlineError(null);
      setMode('select_method');
      setBillingType('CREDIT_CARD');
      try {
        const result = await updateSubscriptionBillingMethod(
          activeSubscriptionId,
          'CREDIT_CARD',
          null,
          null,
          {
            targetRequestId: activeRequestId,
            retrySavedCardOnly: true,
          },
        );
        if (cancelled) return;
        if (!result.success) {
          setInlineError(
            result.error ??
              'Não foi possível confirmar o pagamento. Use outro cartão ou altere o método.',
          );
          return;
        }
        showToast('Cobrança reprocessada. Aguardando confirmação.', 'success');
        setNewInvoice({
          billingType: 'CREDIT_CARD',
          status: result.paymentStatus ?? 'pending',
          requestId: result.requestId ?? activeRequestId ?? undefined,
          paymentUrl: result.paymentUrl ?? null,
          pixQrCode: result.pixData?.qrCode ?? null,
          pixCopyPaste: result.pixData?.copyPaste ?? null,
          dueDate: result.paymentDueDate ?? dueDate ?? null,
          amount,
        });
        setMode('show_new');
      } catch {
        if (!cancelled) {
          setInlineError('Erro ao verificar pagamento. Tente novamente.');
        }
      } finally {
        if (!cancelled) setVerifyingPayment(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    currentBillingType,
    hasRejectedInvoice,
    activeRequestStatus,
    activeSubscriptionId,
    activeRequestId,
    hasExistingInvoice,
    dueDate,
    amount,
    showToast,
  ]);

  // Carrega perfil fiscal ao selecionar cartão
  useEffect(() => {
    if (!isOpen || billingType !== 'CREDIT_CARD' || billingProfile) return;
    getBillingProfile().then((b) => {
      if (b) setBillingProfile(b);
    });
  }, [isOpen, billingType, billingProfile]);

  // ── Validação ───────────────────────────────────────────────────────────────
  const normalizeBilling = (value: unknown) =>
    String(value ?? '')
      .trim()
      .toUpperCase();
  const currentBillingUpper = normalizeBilling(currentBillingType);
  const selectedBillingUpper = normalizeBilling(billingType);
  /** PIX/Boleto já é o método da assinatura — não há troca; evita chamada redundante ao backend */
  const isRedundantPixOrBoletoConfirm =
    (selectedBillingUpper === 'PIX' && currentBillingUpper === 'PIX') ||
    (selectedBillingUpper === 'BOLETO' && currentBillingUpper === 'BOLETO');

  const canConfirm =
    !verifyingPayment &&
    !loading &&
    !isRedundantPixOrBoletoConfirm &&
    (billingType !== 'CREDIT_CARD' ||
      (!!billingProfile && isCreditCardValid(creditCard)));

  const confirmButtonLabel = loading
    ? ''
    : selectedBillingUpper === 'CREDIT_CARD' &&
        currentBillingUpper === 'CREDIT_CARD'
      ? 'Atualizar cartão'
      : selectedBillingUpper === 'CREDIT_CARD'
        ? 'Confirmar alteração para cartão de crédito'
        : selectedBillingUpper === 'PIX'
          ? 'Confirmar alteração para PIX'
          : selectedBillingUpper === 'BOLETO'
            ? 'Confirmar alteração para boleto'
            : 'Confirmar alteração';

  // ── Ação confirmar ──────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (isRedundantPixOrBoletoConfirm) return;
    if (
      hasExistingInvoice &&
      normalizeBilling(billingType) === normalizeBilling(currentBillingType)
    ) {
      setMode('show_existing');
      return;
    }
    setLoading(true);
    setInlineError(null);
    try {
      let creditCardData: Parameters<
        typeof updateSubscriptionBillingMethod
      >[2] = null;
      let holderInfo: Parameters<typeof updateSubscriptionBillingMethod>[3] =
        null;

      if (billingType === 'CREDIT_CARD') {
        if (!billingProfile) {
          showToast(
            'Carregue seus dados fiscais antes de cadastrar o cartão.',
            'error',
          );
          return;
        }
        const digits = (profilePhone ?? '').replace(/\D/g, '');
        creditCardData = {
          holderName: creditCard.credit_card_holder_name,
          number: creditCard.credit_card_number.replace(/\D/g, ''),
          expiryMonth: creditCard.credit_card_expiry_month
            .replace(/\D/g, '')
            .padStart(2, '0')
            .slice(-2),
          expiryYear: creditCard.credit_card_expiry_year.replace(/\D/g, ''),
          ccv: creditCard.credit_card_ccv.replace(/\D/g, ''),
        };
        holderInfo = {
          name:
            billingProfile.full_name?.trim() || profileFullName || 'Titular',
          email: profileEmail ?? '',
          cpfCnpj: billingProfile.cpf_cnpj.replace(/\D/g, ''),
          postalCode: billingProfile.postal_code.replace(/\D/g, ''),
          addressNumber: billingProfile.address_number,
          addressComplement: billingProfile.complement,
          phone: digits,
          mobilePhone: digits,
        };
      }

      const isCreditCardUpdateOnly =
        normalizeBilling(billingType) === 'CREDIT_CARD' &&
        normalizeBilling(currentBillingType) === 'CREDIT_CARD';
      const hasActivePendingInvoice =
        !!activeRequestId?.trim() || hasExistingInvoiceData;
      const isBillingMethodChange =
        normalizeBilling(billingType) !== normalizeBilling(currentBillingType);
      const isSwitchingToCreditCard =
        isBillingMethodChange && billingType === 'CREDIT_CARD';
      const shouldDeleteOldInvoiceBeforeUpdate =
        isBillingMethodChange &&
        hasActivePendingInvoice &&
        !isSwitchingToCreditCard;

      if (shouldDeleteOldInvoiceBeforeUpdate) {
        const deleteResult = await deletePendingInvoiceBeforeBillingChange(
          activeSubscriptionId,
          { targetRequestId: activeRequestId ?? null },
        );
        if (!deleteResult.success) {
          const friendlyError =
            deleteResult.error ??
            'Não foi possível remover a cobrança pendente antiga. Tente novamente.';
          setInlineError(friendlyError);
          showToast(friendlyError, 'error');
          return;
        }
      }

      const result = await updateSubscriptionBillingMethod(
        activeSubscriptionId,
        billingType,
        creditCardData,
        holderInfo,
        {
          targetRequestId: activeRequestId ?? null,
          cardUpdateOnly: isCreditCardUpdateOnly,
          ensureNewPendingPayment: shouldDeleteOldInvoiceBeforeUpdate,
        },
      );

      if (!result.success) {
        setInlineError(result.error ?? 'Erro ao alterar forma de pagamento.');
        showToast(result.error ?? 'Erro ao alterar.', 'error');
        return;
      }

      const isCreditCardRejectedOrOverdue =
        billingType === 'CREDIT_CARD' &&
        (result.paymentStatus === 'rejected' ||
          result.paymentStatus === 'overdue');

      if (isCreditCardRejectedOrOverdue) {
        const rejectedCardMessage =
          result.error ??
          'Cartão não aprovado. Revise os dados e tente novamente.';
        setInlineError(rejectedCardMessage);
        showToast(rejectedCardMessage, 'error');
        setMode('select_method');
        return;
      }

      const label = isCreditCardUpdateOnly
        ? 'Cartão de crédito'
        : billingType === 'PIX'
          ? 'PIX'
          : billingType === 'BOLETO'
            ? 'Boleto'
            : 'Cartão de crédito';
      showToast(
        isCreditCardUpdateOnly
          ? 'Cartão atualizado com sucesso.'
          : `Forma de pagamento alterada para ${label}.`,
        'success',
      );

      const resolvedStatus: 'pending' | 'approved' | 'rejected' | 'overdue' =
        billingType === 'CREDIT_CARD'
          ? (result.paymentStatus ?? 'pending')
          : (result.paymentStatus ?? activeRequestStatus);

      // Exibe StepDone (cartão: aguarda operadora / polling; PIX/boleto: cobrança gerada)
      setNewInvoice({
        billingType,
        status: resolvedStatus,
        requestId: result.requestId ?? activeRequestId ?? undefined,
        paymentUrl: result.paymentUrl ?? null,
        pixQrCode: result.pixData?.qrCode ?? null,
        pixCopyPaste: result.pixData?.copyPaste ?? null,
        dueDate: result.paymentDueDate ?? dueDate ?? null,
        amount,
      });
      setMode('show_new');
    } catch {
      setInlineError('Erro inesperado. Tente novamente.');
      showToast('Erro inesperado. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Títulos dinâmicos ───────────────────────────────────────────────────────
  const sheetSubtitle =
    mode === 'show_existing'
      ? 'Fatura pendente da sua assinatura'
      : mode === 'show_new'
        ? 'Acompanhe seu pagamento'
        : 'Altere a forma de cobrança das suas próximas faturas';

  /** Fecha só quando o usuário manda; após StepDone (fatura existente ou nova, qualquer método), refresh no pai. */
  const dismissSheet = useCallback(() => {
    if (loading || verifyingPayment) return;
    if (mode === 'show_new' || mode === 'show_existing') {
      onSuccess();
    }
    onClose();
  }, [loading, verifyingPayment, mode, onSuccess, onClose]);

  // ── Footer adaptativo ───────────────────────────────────────────────────────
  const renderFooter = () => {
    if (mode === 'show_existing') {
      return (
        <SheetFooter className="bg-petroleum border-t border-petroleum/10">
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={dismissSheet}
              disabled={loading || verifyingPayment}
              className="btn-secondary-white basis-1/4 grow-0 shrink-0"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => setMode('select_method')}
              disabled={loading || verifyingPayment}
              className="btn-luxury-primary basis-3/4 grow-0 shrink-0 flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} />
              Trocar método de pagamento
            </button>
          </div>
        </SheetFooter>
      );
    }

    if (mode === 'show_new') {
      return (
        <SheetFooter className="bg-petroleum border-t border-petroleum/10">
          <button
            type="button"
            onClick={dismissSheet}
            disabled={loading || verifyingPayment}
            className="btn-secondary-white w-full"
          >
            Fechar
          </button>
        </SheetFooter>
      );
    }

    // select_method
    return (
      <SheetFooter className="bg-petroleum border-t border-petroleum/10">
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={() =>
              hasExistingInvoice ? setMode('show_existing') : dismissSheet()
            }
            disabled={loading || verifyingPayment}
            className="btn-secondary-white flex items-center gap-1"
          >
            {hasExistingInvoice ? (
              <>
                <ArrowLeft size={13} />
                Voltar
              </>
            ) : (
              'Cancelar'
            )}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || verifyingPayment}
            className="btn-luxury-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={16} />
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
                Salvando…
              </span>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span className="inline-flex items-center gap-1.5">
                  {' '}
                  {confirmButtonLabel}
                </span>
              </>
            )}
          </button>
        </div>
      </SheetFooter>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <Sheet
        isOpen={isOpen}
        onClose={dismissSheet}
        title="Gerenciar Pagamento"
        subtitle={sheetSubtitle}
        icon={<Settings size={18} strokeWidth={2.5} />}
        headerClassName="bg-petroleum"
        maxWidth="md"
        position="right"
        footer={renderFooter()}
      >
        <div className="relative min-h-[180px]">
          {verifyingPayment && (
            <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center gap-3 bg-white/90 px-6 text-center">
              <span className="w-8 h-8 border-2 border-petroleum/20 border-t-petroleum rounded-full animate-spin" />
              <p className="text-[13px] font-semibold text-petroleum">
                Verificando pagamento…
              </p>
              <p className="text-[11px] text-petroleum/70 max-w-[280px]">
                Tentando confirmar a cobrança com o cartão cadastrado no
                gateway.
              </p>
            </div>
          )}
          {/* ── Fatura existente ── */}
          {mode === 'show_existing' && existingInvoice && (
            <StepDoneWrapper
              billingType={currentBillingType}
              status={activeRequestStatus}
              paymentData={{
                pixData: {
                  qrCode: existingInvoice.pixQrCode ?? undefined,
                  copyPaste: existingInvoice.pixCopyPaste ?? undefined,
                },
                paymentUrl: existingInvoice.paymentUrl ?? null,
                paymentDueDate: existingInvoice.dueDate ?? dueDate ?? null,
                amount: existingInvoice.amount ?? amount ?? null,
              }}
              planInfo={{
                name: planName,
                period: planPeriod,
                nextBillingDate: null,
              }}
              upgradeRequestId={activeRequestId ?? ''}
            />
          )}

          {/* ── Nova fatura gerada ── */}
          {mode === 'show_new' && newInvoice && (
            <StepDoneWrapper
              billingType={newInvoice.billingType}
              status={newInvoice.status}
              paymentData={{
                pixData: {
                  qrCode: newInvoice.pixQrCode ?? undefined,
                  copyPaste: newInvoice.pixCopyPaste ?? undefined,
                },
                paymentUrl: newInvoice.paymentUrl ?? null,
                paymentDueDate: newInvoice.dueDate ?? null,
                amount: newInvoice.amount ?? amount ?? null,
                errorMessage: inlineError,
              }}
              planInfo={{
                name: planName,
                period: planPeriod,
                nextBillingDate: null,
              }}
              upgradeRequestId={newInvoice.requestId ?? activeRequestId ?? ''}
            />
          )}

          {/* ── Seletor de método ── */}
          {mode === 'select_method' && (
            <>
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
                  <span className="text-[10px] font-semibold text-petroleum uppercase tracking-wide">
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
                {mustUseImmediateMethod && (
                  <div className="rounded-md border border-amber-300/70 bg-amber-50 px-2.5 py-2">
                    <p className="text-[11px] text-amber-900 leading-snug font-medium">
                      Atenção: Para evitar a perda imediata de recursos do
                      plano, utilize PIX ou Cartão (compensação imediata).
                    </p>
                  </div>
                )}
                {hasRejectedInvoice && (
                  <div className="rounded-md border border-red-400/40 bg-red-50 px-2.5 py-2">
                    <p className="text-[11px] text-red-700 leading-snug font-medium">
                      A tentativa de cobrança no seu cartão atual falhou. Você
                      pode cadastrar um novo cartão abaixo ou alterar para PIX
                      para liberação imediata.
                    </p>
                  </div>
                )}

                <div className="flex gap-1.5">
                  {(
                    [
                      {
                        value: 'CREDIT_CARD' as BillingType,
                        label: 'Cartão',
                        Icon: CreditCard,
                      },
                      {
                        value: 'PIX' as BillingType,
                        label: 'PIX',
                        Icon: QrCode,
                      },
                      {
                        value: 'BOLETO' as BillingType,
                        label: 'Boleto',
                        Icon: Banknote,
                      },
                    ] as const
                  ).map(({ value, label, Icon }) => {
                    const isSelected = billingType === value;
                    const isLockedCurrentMethodChip =
                      currentBillingUpper === normalizeBilling(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={
                          isLockedCurrentMethodChip ||
                          loading ||
                          verifyingPayment
                        }
                        title={
                          isLockedCurrentMethodChip
                            ? 'Este já é o método da assinatura. Escolha outro para alterar.'
                            : undefined
                        }
                        onClick={() => {
                          if (isLockedCurrentMethodChip) return;
                          setBillingType(value);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[0.4rem] border transition-all flex-1 min-w-0 ${
                          isLockedCurrentMethodChip
                            ? 'border-slate-200 bg-slate-100 text-petroleum/35 cursor-not-allowed opacity-60'
                            : isSelected
                              ? 'border-gold bg-gold/10 text-petroleum'
                              : 'border-slate-200 bg-slate-50 text-petroleum/90 hover:border-gold'
                        }`}
                      >
                        <Icon
                          size={16}
                          strokeWidth={1.5}
                          className="shrink-0"
                        />
                        <span className="text-[9px] font-semibold uppercase tracking-wide truncate">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-petroleum/90 leading-snug pt-1">
                  A nova forma de pagamento será usada para todas as faturas
                  futuras. Alterar para <strong>PIX</strong> ou{' '}
                  <strong>Boleto</strong> remove o cartão de crédito da
                  assinatura, cancelando a cobrança automática recorrente.
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
                      Dados fiscais carregados. Preencha os dados do cartão
                      abaixo.
                    </p>
                  )}
                  {billingProfile && (
                    <BillingFormBlock
                      billingType={billingType}
                      onChangeBillingType={() => {}}
                      creditCard={creditCard}
                      onChangeCreditCard={setCreditCardAndClearError}
                      disabled={loading || verifyingPayment}
                      hideBillingTypeSelector
                    />
                  )}
                </SheetSection>
              )}
            </>
          )}

          {/* Erro inline — nunca sobre a tela de nova fatura */}
          {inlineError && mode !== 'show_new' && (
            <div className="mx-3 mb-2 rounded-md border border-red-300 bg-red-50 px-2.5 py-2">
              <p className="text-[11px] text-red-700">{inlineError}</p>
            </div>
          )}
        </div>
      </Sheet>

      {ToastElement}
    </>
  );
}
