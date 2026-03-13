'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { PlanKey } from '@/core/config/plans';
import type { SegmentType } from '@/core/config/plans';
import {
  PERMISSIONS_BY_PLAN,
  PLANS_BY_SEGMENT,
  getPeriodPrice,
  type PlanInfo,
  type BillingPeriod,
} from '@/core/config/plans';
import { requestUpgrade } from '@/core/services/asaas.service';
import { getBillingProfile } from '@/core/services/billing.service';
import type { BillingType } from '@/core/types/billing';
import type { CreditCardPayload } from '@/core/types/billing';
import type { UpgradePriceCalculation } from '@/core/types/billing';
import type { Step } from './types';
import type { PersonalData, AddressData } from './types';
import { formatPhone, validateCpfCnpj } from './utils';

interface UpgradeSheetContextValue {
  // Step
  step: Step;
  setStep: (s: Step) => void;
  // Plan
  selectedPlan: PlanKey;
  setSelectedPlan: (p: PlanKey) => void;
  expandedPlanKey: PlanKey | null;
  setExpandedPlanKey: React.Dispatch<React.SetStateAction<PlanKey | null>>;
  suggestedPlanKey: PlanKey;
  /** Plano atual do usuário (usePlan). */
  planKey: PlanKey;
  selectedPerms: (typeof PERMISSIONS_BY_PLAN)[PlanKey];
  selectedPlanInfo: PlanInfo | undefined;
  // Personal & Address
  personal: PersonalData;
  setPersonal: React.Dispatch<React.SetStateAction<PersonalData>>;
  address: AddressData;
  setAddress: React.Dispatch<React.SetStateAction<AddressData>>;
  // Billing
  billingType: BillingType;
  setBillingType: (t: BillingType) => void;
  billingPeriod: BillingPeriod;
  setBillingPeriod: (p: BillingPeriod) => void;
  planInfoForPrice: PlanInfo;
  /** Dados do cartão (etapa 3, quando forma = Cartão). */
  creditCard: CreditCardPayload;
  setCreditCard: React.Dispatch<React.SetStateAction<CreditCardPayload>>;
  /** Número de parcelas selecionado (1-6 para cartão; sempre 1 para PIX/BOLETO). */
  installments: number;
  setInstallments: React.Dispatch<React.SetStateAction<number>>;
  // UI state
  paymentUrl: string | null;
  /** Quando a solicitação for downgrade agendado: data em que a mudança será efetivada. */
  downgradeEffectiveAt: string | null;
  /** Data de vencimento da cobrança (YYYY-MM-DD) vinda do Asaas; exibida na tela "Boleto gerado". */
  paymentDueDate: string | null;
  /** Dados do QR PIX (preenchido após confirmar com PIX; usado na tela de revisão). */
  pixData: { qrCode: string; copyPaste: string };
  /** ID da solicitação de upgrade (tb_upgrade_requests.id) para polling de confirmação PIX. */
  upgradeRequestId: string | null;
  requestError: string | null;
  /** Aviso quando pagamento anterior já estava RECEIVED/CONFIRMED (ex.: "Pagamento já identificado. O valor será utilizado como crédito para o novo plano."). */
  requestWarning: string | null;
  loading: boolean;
  loadingPrefill: boolean;
  hasSavedBillingData: boolean;
  loadingCep: boolean;
  setLoadingCep: (v: boolean) => void;
  // Refs
  numberInputRef: React.RefObject<HTMLInputElement | null>;
  streetInputRef: React.RefObject<HTMLInputElement | null>;
  // Validation
  canProceedData: boolean;
  // Handlers
  handleCepChange: (formattedCep: string) => void;
  handleCepBlur: () => void;
  fetchCep: (cepDigits: string) => Promise<void>;
  handleConfirm: () => Promise<void>;
  /** Fechar sheet e resetar estado (chamado pelo overlay, X ou botão Fechar do step done). */
  handleClose: () => void;
  // Profile/email from usePlan
  profile: {
    full_name?: string;
    phone_contact?: string;
    email?: string | null;
    is_exempt?: boolean;
    is_trial?: boolean;
  } | null;
  email: string | undefined;
  segment: SegmentType;
  terms: { items: string };
  /** Usuário isento: plano atual vitalício; mensagens e confirmação no UpgradeSheet. */
  isExempt: boolean;
  /** Há solicitação de upgrade pendente (pagamento em processamento); bloquear nova assinatura. */
  hasPendingUpgrade: boolean;
  setHasPendingUpgrade: (v: boolean) => void;
  /** Cálculo do preview (pro-rata, crédito, total) para exibir resumo no confirm. */
  upgradeCalculation: UpgradePriceCalculation | null;
  setUpgradeCalculation: (c: UpgradePriceCalculation | null) => void;
  /** Mensagem quando seleção é downgrade (bloqueado até vencimento). */
  downgradeBlockedMessage: string | null;
  setDowngradeBlockedMessage: (m: string | null) => void;
  isCalculationLoading: boolean;
  setIsCalculationLoading: (v: boolean) => void;
}

const UpgradeSheetContext = createContext<UpgradeSheetContextValue | null>(
  null,
);

export function useUpgradeSheetContext() {
  const ctx = useContext(UpgradeSheetContext);
  if (!ctx)
    throw new Error(
      'useUpgradeSheetContext must be used within UpgradeSheetProvider',
    );
  return ctx;
}

interface UpgradeSheetProviderProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  suggestedPlanKey: PlanKey;
  planKey: PlanKey;
  profile: {
    full_name?: string;
    phone_contact?: string;
    email?: string | null;
    is_exempt?: boolean;
    is_trial?: boolean;
  } | null;
  email: string | undefined;
  segment: SegmentType;
  terms: { items: string };
}

const initialCreditCard: CreditCardPayload = {
  credit_card_holder_name: '',
  credit_card_number: '',
  credit_card_expiry_month: '',
  credit_card_expiry_year: '',
  credit_card_ccv: '',
};

export function UpgradeSheetProvider({
  children,
  isOpen,
  onClose,
  suggestedPlanKey,
  planKey,
  profile,
  email,
  segment,
  terms,
}: UpgradeSheetProviderProps) {
  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(suggestedPlanKey);
  const [expandedPlanKey, setExpandedPlanKey] = useState<PlanKey | null>(null);
  const [personal, setPersonal] = useState<PersonalData>({
    whatsapp: '',
    cpfCnpj: '',
    fullName: '',
  });
  const [address, setAddress] = useState<AddressData>({
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [loadingCep, setLoadingCep] = useState(false);
  const [billingType, setBillingType] = useState<BillingType>('CREDIT_CARD');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [installments, setInstallments] = useState<number>(1);
  const [creditCard, setCreditCard] =
    useState<CreditCardPayload>(initialCreditCard);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [downgradeEffectiveAt, setDowngradeEffectiveAt] = useState<
    string | null
  >(null);
  const [paymentDueDate, setPaymentDueDate] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string }>(
    { qrCode: '', copyPaste: '' },
  );
  const [upgradeRequestId, setUpgradeRequestId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestWarning, setRequestWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [hasSavedBillingData, setHasSavedBillingData] = useState(false);
  const [hasPendingUpgrade, setHasPendingUpgrade] = useState(false);
  const [upgradeCalculation, setUpgradeCalculation] =
    useState<UpgradePriceCalculation | null>(null);
  const [downgradeBlockedMessage, setDowngradeBlockedMessage] = useState<
    string | null
  >(null);
  const [isCalculationLoading, setIsCalculationLoading] = useState(false);
  const numberInputRef = React.useRef<HTMLInputElement>(null);
  const streetInputRef = React.useRef<HTMLInputElement>(null);
  const wasOpenRef = React.useRef(false);

  // Reset step e estado apenas quando o sheet ABRE (isOpen: false → true).
  // Evita voltar para StepPlan após sucesso (ex.: upgrade gratuito) quando
  // profile/suggestedPlanKey mudam por revalidação — o usuário fecha quando quiser.
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (!justOpened) return;

    setSelectedPlan(suggestedPlanKey);
    setStep('plan');
    setHasSavedBillingData(false);
    setHasPendingUpgrade(false);
    setDowngradeBlockedMessage(null);
    setUpgradeCalculation(null);
    setIsCalculationLoading(false);
    setPersonal((prev) => ({
      ...prev,
      fullName: profile?.full_name ?? prev.fullName ?? '',
      ...(profile?.phone_contact
        ? { whatsapp: formatPhone(profile.phone_contact) }
        : {}),
    }));
    setLoadingPrefill(true);
    getBillingProfile()
      .then((billing) => {
        if (!billing) return;
        setHasSavedBillingData(true);
        setPersonal((prev) => ({
          ...prev,
          cpfCnpj: billing.cpf_cnpj,
          fullName:
            billing.full_name ?? prev.fullName ?? profile?.full_name ?? '',
        }));
        setAddress({
          cep: billing.postal_code,
          street: billing.address,
          number: billing.address_number,
          complement: billing.complement ?? '',
          neighborhood: billing.province,
          city: billing.city,
          state: billing.state,
        });
      })
      .finally(() => setLoadingPrefill(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const selectedPerms = PERMISSIONS_BY_PLAN[selectedPlan];
  const selectedPlanInfo = PLANS_BY_SEGMENT[segment]?.[selectedPlan];
  const planInfoForPrice: PlanInfo =
    selectedPlanInfo ?? PLANS_BY_SEGMENT[segment]?.FREE!;

  const cpfCnpjDigits = personal.cpfCnpj.replace(/\D/g, '');
  const cpfCnpjValid = validateCpfCnpj(personal.cpfCnpj) === null;
  const canProceedPersonal =
    personal.fullName.trim().length >= 2 &&
    personal.whatsapp.replace(/\D/g, '').length >= 10 &&
    (cpfCnpjDigits.length === 11 || cpfCnpjDigits.length === 14) &&
    cpfCnpjValid;
  const canProceedAddress =
    address.cep.replace(/\D/g, '').length === 8 &&
    address.street.trim() !== '' &&
    address.number.trim() !== '' &&
    address.neighborhood.trim() !== '' &&
    address.city.trim() !== '' &&
    address.state.length === 2;
  const canProceedData = canProceedPersonal && canProceedAddress;

  const fetchCep = useCallback(async (cepDigits: string) => {
    if (cepDigits.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const logradouro = data.logradouro?.trim() || '';
        setAddress((prev) => ({
          ...prev,
          street: logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
        setTimeout(() => {
          numberInputRef.current?.focus();
          if (!logradouro) streetInputRef.current?.focus();
        }, 100);
      }
    } catch {
      // silencioso
    } finally {
      setLoadingCep(false);
    }
  }, []);

  const handleCepBlur = useCallback(() => {
    const clean = address.cep.replace(/\D/g, '');
    if (clean.length === 8) fetchCep(clean);
  }, [address.cep, fetchCep]);

  const handleCepChange = useCallback(
    (formattedCep: string) => {
      setAddress((a) => ({ ...a, cep: formattedCep }));
      const clean = formattedCep.replace(/\D/g, '');
      if (clean.length === 8) fetchCep(clean);
    },
    [fetchCep],
  );

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    setRequestError(null);
    setRequestWarning(null);
    const effectiveInstallments =
      billingType === 'CREDIT_CARD' ? installments : 1;

    try {
      const result = await requestUpgrade({
        plan_key_requested: selectedPlan,
        billing_type: billingType,
        billing_period: billingPeriod,
        installments: effectiveInstallments,
        segment,
        full_name: personal.fullName.trim(),
        whatsapp: personal.whatsapp,
        cpf_cnpj: personal.cpfCnpj,
        postal_code: address.cep,
        address: address.street,
        address_number: address.number,
        complement: address.complement || undefined,
        province: address.neighborhood,
        city: address.city,
        state: address.state,
        ...(billingType === 'CREDIT_CARD' && { credit_card: creditCard }),
      });

      if (result?.success) {
        setDowngradeEffectiveAt(result.downgrade_effective_at ?? null);
        setPaymentUrl(result.payment_url ?? null);
        setPaymentDueDate(result.payment_due_date ?? null);
        if (result.request_id) setUpgradeRequestId(result.request_id);
        if (result.warning) setRequestWarning(result.warning);
        if (
          result.billing_type === 'PIX' &&
          (result.pix_qr_code_base64 || result.pix_copy_paste || result.payment_url)
        ) {
          setPixData({
            qrCode: result.pix_qr_code_base64 ?? '',
            copyPaste: result.pix_copy_paste ?? result.payment_url ?? '',
          });
        }
        setStep('done');
      } else {
        const raw = result?.error ?? 'Erro ao processar solicitação.';
        const isPixUnavailable =
          raw.includes('Pix não está disponível') ||
          raw.includes('conta precisa estar aprovada');
        setRequestError(
          isPixUnavailable
            ? 'PIX não está disponível no momento para esta conta. Use Boleto ou Cartão de Crédito para assinar.'
            : raw,
        );
      }
    } catch (err) {
      console.error('[UpgradeSheet] handleConfirm error:', err);
      const raw =
        err instanceof Error
          ? err.message
          : 'Erro ao processar. Tente novamente.';
      const isPixUnavailable =
        raw.includes('Pix não está disponível') ||
        raw.includes('conta precisa estar aprovada');
      setRequestError(
        isPixUnavailable
          ? 'PIX não está disponível no momento para esta conta. Use Boleto ou Cartão de Crédito para assinar.'
          : raw,
      );
    } finally {
      setLoading(false);
    }
  }, [
    selectedPlan,
    billingType,
    billingPeriod,
    installments,
    segment,
    personal,
    address,
    creditCard,
  ]);

  const resetState = useCallback(() => {
    setStep('plan');
    setSelectedPlan(suggestedPlanKey);
    setExpandedPlanKey(null);
    setPersonal({ whatsapp: '', cpfCnpj: '', fullName: '' });
    setAddress({
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
    });

    setPaymentUrl(null);
    setDowngradeEffectiveAt(null);
    setPaymentDueDate(null);
    setPixData({ qrCode: '', copyPaste: '' });
    setUpgradeRequestId(null);
    setRequestError(null);
    setRequestWarning(null);
    setBillingType('CREDIT_CARD');
    setBillingPeriod('monthly');
    setInstallments(1);
    setCreditCard(initialCreditCard);
    setHasSavedBillingData(false);
    setIsCalculationLoading(false);
  }, [suggestedPlanKey]);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(resetState, 300);
  }, [onClose, resetState]);

  const value = useMemo<UpgradeSheetContextValue>(
    () => ({
      step,
      setStep,
      selectedPlan,
      setSelectedPlan,
      expandedPlanKey,
      setExpandedPlanKey,
      suggestedPlanKey,
      planKey,
      selectedPerms,
      selectedPlanInfo,
      personal,
      setPersonal,
      address,
      setAddress,
      billingType,
      setBillingType,
      billingPeriod,
      setBillingPeriod,
      installments,
      setInstallments,
      planInfoForPrice,
      creditCard,
      setCreditCard,
      paymentUrl,
      downgradeEffectiveAt,
      paymentDueDate,
      pixData,
      requestError,
      requestWarning,
      upgradeRequestId,
      loading,
      loadingPrefill,
      hasSavedBillingData,
      loadingCep,
      setLoadingCep,
      numberInputRef,
      streetInputRef,
      canProceedData,
      handleCepChange,
      handleCepBlur,
      fetchCep,
      handleConfirm,
      handleClose,
      profile,
      email,
      segment,
      terms,
      isExempt: profile?.is_exempt ?? false,
      hasPendingUpgrade,
      setHasPendingUpgrade,
      upgradeCalculation,
      setUpgradeCalculation,
      downgradeBlockedMessage,
      setDowngradeBlockedMessage,
      isCalculationLoading,
      setIsCalculationLoading,
    }),
    [
      step,
      selectedPlan,
      expandedPlanKey,
      suggestedPlanKey,
      selectedPerms,
      selectedPlanInfo,
      personal,
      address,
      billingType,
      billingPeriod,
      installments,
      planInfoForPrice,
      creditCard,
      paymentUrl,
      downgradeEffectiveAt,
      paymentDueDate,
      pixData,
      requestError,
      requestWarning,
      upgradeRequestId,
      loading,
      loadingPrefill,
      hasSavedBillingData,
      loadingCep,
      canProceedData,
      handleCepChange,
      handleCepBlur,
      fetchCep,
      handleConfirm,
      handleClose,
      profile,
      email,
      segment,
      terms,
      planKey,
      hasPendingUpgrade,
      upgradeCalculation,
      downgradeBlockedMessage,
      isCalculationLoading,
    ],
  );

  return (
    <UpgradeSheetContext.Provider value={value}>
      {children}
    </UpgradeSheetContext.Provider>
  );
}
