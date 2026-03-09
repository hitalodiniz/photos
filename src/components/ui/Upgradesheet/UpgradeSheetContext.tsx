'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PlanKey } from '@/core/config/plans';
import type { SegmentType } from '@/core/config/plans';
import { PERMISSIONS_BY_PLAN, PLANS_BY_SEGMENT, getPeriodPrice, type PlanInfo, type BillingPeriod } from '@/core/config/plans';
import { requestUpgrade } from '@/core/services/asaas.service';
import { getBillingProfile } from '@/core/services/billing.service';
import type { BillingType } from '@/core/types/billing';
import type { CreditCardPayload } from '@/core/types/billing';
import type { Step } from './types';
import type { PersonalData, AddressData } from './types';
import { formatPhone } from './utils';

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
  acceptedTerms: boolean;
  setAcceptedTerms: (v: boolean) => void;
  paymentUrl: string | null;
  /** Dados do QR PIX (preenchido após confirmar com PIX; usado na tela de revisão). */
  pixData: { qrCode: string; copyPaste: string };
  requestError: string | null;
  loading: boolean;
  loadingPrefill: boolean;
  hasSavedBillingData: boolean;
  loadingCep: boolean;
  setLoadingCep: (v: boolean) => void;
  showTermsModal: boolean;
  setShowTermsModal: (v: boolean) => void;
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
  profile: { full_name?: string; phone_contact?: string; email?: string | null } | null;
  email: string | undefined;
  segment: SegmentType;
  terms: { items: string };
}

const UpgradeSheetContext = createContext<UpgradeSheetContextValue | null>(null);

export function useUpgradeSheetContext() {
  const ctx = useContext(UpgradeSheetContext);
  if (!ctx) throw new Error('useUpgradeSheetContext must be used within UpgradeSheetProvider');
  return ctx;
}

interface UpgradeSheetProviderProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  suggestedPlanKey: PlanKey;
  planKey: PlanKey;
  profile: { full_name?: string; phone_contact?: string; email?: string | null } | null;
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
  const [personal, setPersonal] = useState<PersonalData>({ whatsapp: '', cpfCnpj: '' });
  const [address, setAddress] = useState<AddressData>({
    cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
  });
  const [loadingCep, setLoadingCep] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [billingType, setBillingType] = useState<BillingType>('CREDIT_CARD');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [installments, setInstallments] = useState<number>(1);
  const [creditCard, setCreditCard] = useState<CreditCardPayload>(initialCreditCard);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string }>({ qrCode: '', copyPaste: '' });
  const [requestError, setRequestError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [hasSavedBillingData, setHasSavedBillingData] = useState(false);
  const numberInputRef = React.useRef<HTMLInputElement>(null);
  const streetInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPlan(suggestedPlanKey);
    setStep('plan');
    setHasSavedBillingData(false);
    if (profile?.phone_contact) {
      setPersonal((prev) => ({
        ...prev,
        whatsapp: formatPhone(profile.phone_contact!),
      }));
    }
    setLoadingPrefill(true);
    getBillingProfile()
      .then((billing) => {
        if (!billing) return;
        setHasSavedBillingData(true);
        setPersonal((prev) => ({
          ...prev,
          cpfCnpj: billing.cpf_cnpj,
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
  }, [isOpen, suggestedPlanKey, profile?.phone_contact]);

  const selectedPerms = PERMISSIONS_BY_PLAN[selectedPlan];
  const selectedPlanInfo = PLANS_BY_SEGMENT[segment]?.[selectedPlan];
  const planInfoForPrice: PlanInfo = selectedPlanInfo ?? PLANS_BY_SEGMENT[segment]?.FREE!;

  const cpfCnpjDigits = personal.cpfCnpj.replace(/\D/g, '');
  const canProceedPersonal =
    personal.whatsapp.replace(/\D/g, '').length >= 10 &&
    (cpfCnpjDigits.length === 11 || cpfCnpjDigits.length === 14);
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

  const handleCepChange = useCallback((formattedCep: string) => {
    setAddress((a) => ({ ...a, cep: formattedCep }));
    const clean = formattedCep.replace(/\D/g, '');
    if (clean.length === 8) fetchCep(clean);
  }, [fetchCep]);

  const handleConfirm = useCallback(async () => {
    if (!acceptedTerms) return;
    setLoading(true);
    setRequestError(null);
    const effectiveInstallments =
      billingType === 'CREDIT_CARD' ? installments : 1;

    const result = await requestUpgrade({
      plan_key_requested: selectedPlan,
      billing_type: billingType,
      billing_period: billingPeriod,
      installments: effectiveInstallments,
      segment,
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
    setLoading(false);
    if (result.success) {
      setPaymentUrl(result.payment_url ?? null);
      if (result.billing_type === 'PIX' && result.pix_qr_code_base64 && result.payment_url) {
        setPixData({
          qrCode: result.pix_qr_code_base64,
          copyPaste: result.payment_url,
        });
      }
      setStep('done');
    } else {
      setRequestError(result.error ?? 'Erro ao processar solicitação.');
    }
  }, [acceptedTerms, selectedPlan, billingType, billingPeriod, installments, segment, personal, address, creditCard]);

  const resetState = useCallback(() => {
    setStep('plan');
    setSelectedPlan(suggestedPlanKey);
    setExpandedPlanKey(null);
    setPersonal({ whatsapp: '', cpfCnpj: '' });
    setAddress({
      cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
    });
    setAcceptedTerms(false);
    setPaymentUrl(null);
    setPixData({ qrCode: '', copyPaste: '' });
    setRequestError(null);
    setBillingType('CREDIT_CARD');
    setBillingPeriod('monthly');
    setInstallments(1);
    setCreditCard(initialCreditCard);
    setHasSavedBillingData(false);
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
      acceptedTerms,
      setAcceptedTerms,
      paymentUrl,
      pixData,
      requestError,
      loading,
      loadingPrefill,
      hasSavedBillingData,
      loadingCep,
      setLoadingCep,
      showTermsModal,
      setShowTermsModal,
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
      acceptedTerms,
      paymentUrl,
      pixData,
      requestError,
      loading,
      loadingPrefill,
      hasSavedBillingData,
      loadingCep,
      showTermsModal,
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
    ]
  );

  return (
    <UpgradeSheetContext.Provider value={value}>
      {children}
    </UpgradeSheetContext.Provider>
  );
}
