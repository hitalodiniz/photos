'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Crown,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowLeft,
  User,
  Mail,
  Phone,
  CreditCard,
  MapPin,
  Home,
  Hash,
  Building2,
  Map,
  QrCode,
  FileText,
} from 'lucide-react';
import { Sheet, SheetSection, SheetFooter } from '@/components/ui/Sheet';
import { TermsOfServiceModal } from '@/app/(public)/termos/TermosContent';
import {
  PlanPermissions,
  PlanKey,
  findNextPlanKeyWithFeature,
  PERMISSIONS_BY_PLAN,
  PLANS_BY_SEGMENT,
  planOrder,
  getPlanBenefits,
} from '@/core/config/plans';
import { usePlan } from '@/core/context/PlanContext';
import { useSegment } from '@/hooks/useSegment';
import { requestUpgrade } from '@/core/services/asaas.service';
import { getBillingProfile } from '@/core/services/billing.service';
import type { BillingType } from '@/core/types/billing';

// =============================================================================
// Tipos
// =============================================================================

interface UpgradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  featureKey?: keyof PlanPermissions;
  featureName?: string;
}

type Step = 'plan' | 'personal' | 'address' | 'confirm' | 'done';

interface PersonalData {
  whatsapp: string;
  cpfCnpj: string;
}

interface AddressData {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

// =============================================================================
// Helpers
// =============================================================================

function storageLabel(gb: number): string {
  return gb >= 1_000 ? `${gb / 1_000} TB` : `${gb} GB`;
}

function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

// =============================================================================
// Sub-componentes
// =============================================================================

// ── Campo de formulário — padrão exato do SettingsForm ───────────────────────
function FieldLabel({
  icon: Icon,
  label,
  required,
}: {
  icon: React.ElementType;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum/60 flex items-center gap-1.5">
      <Icon size={12} strokeWidth={2} className="text-gold" />
      {label}
      {required && <span className="text-red-400">*</span>}
    </label>
  );
}

// ── PlanCard — acordeão único ─────────────────────────────────────────────────
function PlanCard({
  planKey,
  planName,
  price,
  isCurrentPlan,
  isSelected,
  isSuggested,
  onSelect,
  perms,
  isExpanded,
  onToggleExpand,
  benefits,
}: {
  planKey: PlanKey;
  planName: string;
  price: number;
  isCurrentPlan: boolean;
  isSelected: boolean;
  isSuggested: boolean;
  onSelect: () => void;
  perms: typeof PERMISSIONS_BY_PLAN.FREE;
  isExpanded: boolean;
  onToggleExpand: () => void;
  benefits: { label: string; description: string }[];
}) {
  const borderColor = isCurrentPlan
    ? 'border-slate-100'
    : isSelected
      ? 'border-gold'
      : 'border-slate-200';

  return (
    <div
      className={`rounded-luxury border-2 overflow-hidden transition-all duration-200 ${borderColor} ${
        isSelected ? 'shadow-[0_0_0_3px_rgba(212,175,55,0.15)]' : ''
      } ${isCurrentPlan ? 'opacity-80' : ''}`}
    >
      {/* ── Cabeçalho: seleciona + expande ao mesmo tempo ── */}
      <button
        type="button"
        disabled={isCurrentPlan}
        onClick={() => {
          if (!isCurrentPlan) onSelect();
          onToggleExpand();
        }}
        className={`w-full text-left p-3.5 transition-colors duration-200 relative ${
          isCurrentPlan
            ? 'bg-slate-50 cursor-not-allowed'
            : isSelected
              ? 'bg-gold/5'
              : 'bg-white hover:bg-gold/[0.02]'
        }`}
      >
        {isSuggested && !isCurrentPlan && (
          <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-gold text-petroleum text-[8px] font-bold uppercase tracking-widest rounded-full">
            Recomendado
          </span>
        )}

        <div className="flex items-center justify-between gap-3">
          {/* Radio + nome + dica */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                isSelected ? 'border-gold bg-gold' : 'border-slate-300 bg-white'
              }`}
            >
              {isSelected && (
                <div className="w-1.5 h-1.5 rounded-full bg-petroleum" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[12px] font-bold text-petroleum uppercase tracking-wide">
                {planName}
                {isCurrentPlan && (
                  <span className="ml-1.5 text-[9px] text-slate-400 normal-case font-medium">
                    (atual)
                  </span>
                )}
              </p>
              {/* Resumo colapsado */}
              {!isExpanded && (
                <p className="text-[10px] text-petroleum/50 font-medium">
                  {storageLabel(perms.storageGB)} · {perms.maxGalleries}{' '}
                  galerias · {perms.maxPhotosPerGallery} arq/gal
                </p>
              )}
              {/* Dica visível só quando colapsado e disponível */}
              {!isExpanded && !isCurrentPlan && (
                <p className="text-[8px] text-gold/70 font-semibold mt-0.5">
                  Toque para selecionar e ver benefícios ↓
                </p>
              )}
            </div>
          </div>

          {/* Preço + chevron */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              {price === 0 ? (
                <span className="text-[11px] font-semibold text-slate-400">
                  Grátis
                </span>
              ) : (
                <>
                  <p className="text-[13px] font-semibold text-petroleum leading-none">
                    R${price}
                  </p>
                  <p className="text-[8px] text-petroleum/40 font-medium">
                    /mês
                  </p>
                </>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-petroleum/30 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </button>

      {/* ── Painel expandido: métricas + benefícios ── */}
      {isExpanded && (
        <div className={`border-t-2 ${borderColor}`}>
          {/* Grid de métricas */}
          <div
            className={`px-3.5 py-2.5 grid grid-cols-3 gap-2 ${
              isSelected ? 'bg-gold/[0.04]' : 'bg-slate-50/60'
            }`}
          >
            {[
              { label: 'Armazenamento', value: storageLabel(perms.storageGB) },
              { label: 'Galerias', value: `${perms.maxGalleries} ativas` },
              { label: 'Arq/galeria', value: `${perms.maxPhotosPerGallery}` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-[11px] font-bold text-petroleum">{value}</p>
                <p className="text-[8px] text-petroleum/40 uppercase tracking-luxury-widest">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Lista de benefícios */}
          <ul
            className={`px-3.5 py-3 space-y-2 ${
              isSelected ? 'bg-gold/[0.02]' : 'bg-white'
            }`}
          >
            <li className="mb-1">
              <p className="text-[8px] font-bold uppercase tracking-luxury-widest text-petroleum/40">
                O que está incluído
              </p>
            </li>
            {benefits.map((b, i) => (
              <li key={i} className="flex gap-2 items-start">
                <CheckCircle2 size={10} className="text-gold shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-luxury text-petroleum/80 block leading-tight">
                    {b.label}
                  </span>
                  <span className="text-[10px] text-petroleum/60 leading-tight">
                    {b.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Indicador de progresso ────────────────────────────────────────────────────
const STEP_ORDER: Step[] = ['plan', 'personal', 'address', 'confirm', 'done'];
const STEP_LABELS: Record<Step, string> = {
  plan: 'Plano',
  personal: 'Dados',
  address: 'Endereço',
  confirm: 'Confirmar',
  done: 'Pronto',
};

function StepIndicator({ current }: { current: Step }) {
  const stepsToShow: Step[] = ['plan', 'personal', 'address', 'confirm'];
  const currentIdx = STEP_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-0 px-4 py-2 border-b border-slate-100">
      {stepsToShow.map((s, i) => {
        const stepIdx = STEP_ORDER.indexOf(s);
        const isDone = stepIdx < currentIdx;
        const isActive = s === current;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${
                  isDone
                    ? 'bg-gold text-petroleum'
                    : isActive
                      ? 'bg-petroleum text-gold border-2 border-gold/30'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                className={`text-[7px] font-bold uppercase tracking-widest ${
                  isActive
                    ? 'text-petroleum'
                    : isDone
                      ? 'text-gold'
                      : 'text-slate-300'
                }`}
              >
                {STEP_LABELS[s]}
              </span>
            </div>
            {i < stepsToShow.length - 1 && (
              <div
                className={`flex-1 h-px mx-1 mb-3 transition-colors ${
                  stepIdx < currentIdx ? 'bg-gold' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// =============================================================================
// Sheet principal
// =============================================================================

export function UpgradeSheet({
  isOpen,
  onClose,
  featureKey,
  featureName,
}: UpgradeSheetProps) {
  const { planKey, profile, email } = usePlan();
  const { terms, segment } = useSegment();

  const suggestedPlanKey = useMemo((): PlanKey => {
    if (!featureKey) return 'PRO';
    return findNextPlanKeyWithFeature(planKey as PlanKey, featureKey) ?? 'PRO';
  }, [planKey, featureKey]);

  // ── State ───────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(suggestedPlanKey);
  const [expandedPlanKey, setExpandedPlanKey] = useState<PlanKey | null>(null);

  const [personal, setPersonal] = useState<PersonalData>({
    whatsapp: '',
    cpfCnpj: '',
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [billingType, setBillingType] = useState<BillingType>('PIX');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [hasSavedBillingData, setHasSavedBillingData] = useState(false);

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

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedPerms = PERMISSIONS_BY_PLAN[selectedPlan];
  const selectedPlanInfo = PLANS_BY_SEGMENT[segment]?.[selectedPlan];
  const currentIndex = planOrder.indexOf(planKey as PlanKey);
  const upgradablePlans = planOrder.filter(
    (p) => planOrder.indexOf(p) > currentIndex,
  );

  // ── Validações ──────────────────────────────────────────────────────────────
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

  // ── Busca CEP ───────────────────────────────────────────────────────────────
  const handleCepBlur = async () => {
    const clean = address.cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch {
      // silencioso
    } finally {
      setLoadingCep(false);
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep('plan');
      setSelectedPlan(suggestedPlanKey);
      setExpandedPlanKey(null);
      setPersonal({ whatsapp: '', cpfCnpj: '' });
      setAddress({
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
      });
      setAcceptedTerms(false);
      setPaymentUrl(null);
      setRequestError(null);
      setBillingType('PIX');
      setHasSavedBillingData(false);
    }, 300);
  };

  const handleConfirm = async () => {
    if (!acceptedTerms) return;
    setLoading(true);
    setRequestError(null);
    const result = await requestUpgrade({
      plan_key_requested: selectedPlan,
      billing_type: billingType,
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
    });
    setLoading(false);
    if (result.success) {
      setPaymentUrl(result.payment_url ?? null);
      setStep('done');
    } else {
      setRequestError(result.error ?? 'Erro ao processar solicitação.');
    }
  };

  // ── Navegação ───────────────────────────────────────────────────────────────
  const goBack: Partial<Record<Step, Step>> = {
    personal: 'plan',
    address: 'personal',
    confirm: 'address',
  };

  // =============================================================================
  // Steps
  // =============================================================================

  // ── Step 1: Plano ────────────────────────────────────────────────────────────
  const stepPlan = (
    <SheetSection title="Escolha seu novo plano">
      <div className="space-y-3">
        {/* Plano atual */}
        {(() => {
          const info = PLANS_BY_SEGMENT[segment]?.[planKey as PlanKey];
          const perms = PERMISSIONS_BY_PLAN[planKey as PlanKey];
          const pk = planKey as PlanKey;
          return (
            <PlanCard
              planKey={pk}
              planName={info?.name ?? pk}
              price={info?.price ?? 0}
              isCurrentPlan
              isSelected={false}
              isSuggested={false}
              onSelect={() => {}}
              perms={perms}
              isExpanded={expandedPlanKey === pk}
              onToggleExpand={() =>
                setExpandedPlanKey((prev) => (prev === pk ? null : pk))
              }
              benefits={getPlanBenefits(perms, terms)}
            />
          );
        })()}

        {/* Planos disponíveis */}
        {upgradablePlans.map((p) => {
          const info = PLANS_BY_SEGMENT[segment]?.[p];
          const perms = PERMISSIONS_BY_PLAN[p];
          return (
            <PlanCard
              key={p}
              planKey={p}
              planName={info?.name ?? p}
              price={info?.price ?? 0}
              isCurrentPlan={false}
              isSelected={selectedPlan === p}
              isSuggested={p === suggestedPlanKey}
              onSelect={() => setSelectedPlan(p)}
              perms={perms}
              isExpanded={expandedPlanKey === p}
              onToggleExpand={() =>
                setExpandedPlanKey((prev) => (prev === p ? null : p))
              }
              benefits={getPlanBenefits(perms, terms)}
            />
          );
        })}
      </div>
    </SheetSection>
  );

  // ── Step 2: Dados Pessoais ────────────────────────────────────────────────────
  const stepPersonal = (
    <SheetSection title="Dados Pessoais">
      <div className="space-y-3">
        {/* Nome — read-only do perfil */}
        <div className="space-y-1">
          <FieldLabel icon={User} label="Nome Completo" />
          <div className="w-full px-3 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none flex items-center justify-between">
            <span>{profile?.full_name ?? '—'}</span>
            <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
          </div>
        </div>

        {/* Email — read-only do perfil */}
        <div className="space-y-1">
          <FieldLabel icon={Mail} label="E-mail" />
          <div className="w-full px-3 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none flex items-center justify-between">
            <span>{email ?? '—'}</span>
            <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
          </div>
        </div>

        {/* WhatsApp */}
        <div className="space-y-1">
          <FieldLabel icon={Phone} label="WhatsApp" required />
          <input
            type="tel"
            value={personal.whatsapp}
            onChange={(e) =>
              setPersonal((p) => ({
                ...p,
                whatsapp: formatPhone(e.target.value),
              }))
            }
            placeholder="(11) 9 0000-0000"
            className="w-full px-3 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
          />
        </div>

        {/* CPF / CNPJ */}
        <div className="space-y-1">
          <FieldLabel icon={CreditCard} label="CPF ou CNPJ" required />
          {loadingPrefill ? (
            <div className="w-full h-9 bg-slate-200 rounded-[0.4rem] animate-pulse" />
          ) : (
            <input
              type="text"
              inputMode="numeric"
              value={personal.cpfCnpj}
              onChange={(e) =>
                setPersonal((p) => ({
                  ...p,
                  cpfCnpj: formatCpfCnpj(e.target.value),
                }))
              }
              placeholder="000.000.000-00"
              className="w-full px-3 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
          )}
        </div>

        <p className="text-[9px] text-petroleum/50 italic px-1">
          * CPF/CNPJ necessário para emissão da Nota Fiscal Eletrônica.
        </p>
      </div>
    </SheetSection>
  );

  // ── Step 3: Endereço ──────────────────────────────────────────────────────────
  const stepAddress = (
    <SheetSection title="Endereço de Cobrança">
      <div className="space-y-3">
        {hasSavedBillingData && (
          <div className="flex items-center gap-1.5 px-1 pb-1">
            <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
            <p className="text-[9px] text-emerald-600 font-medium">
              Dados salvos do último cadastro. Você pode editá-los.
            </p>
          </div>
        )}

        {/* CEP */}
        <div className="space-y-1">
          <FieldLabel icon={MapPin} label="CEP" required />
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              value={address.cep}
              onChange={(e) =>
                setAddress((a) => ({ ...a, cep: formatCep(e.target.value) }))
              }
              onBlur={handleCepBlur}
              placeholder="00000-000"
              maxLength={9}
              className="w-full px-3 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
            {loadingCep && (
              <div className="absolute right-3 w-3 h-3 border-2 border-petroleum/20 border-t-petroleum rounded-full animate-spin" />
            )}
          </div>
        </div>

        {/* Logradouro */}
        <div className="space-y-1">
          <FieldLabel icon={Home} label="Logradouro" required />
          <input
            type="text"
            value={address.street}
            onChange={(e) =>
              setAddress((a) => ({ ...a, street: e.target.value }))
            }
            placeholder="Rua, Avenida, Travessa..."
            className="w-full px-3 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
          />
        </div>

        {/* Número + Complemento */}
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-2 space-y-1">
            <FieldLabel icon={Hash} label="Número" required />
            <input
              type="text"
              value={address.number}
              onChange={(e) =>
                setAddress((a) => ({ ...a, number: e.target.value }))
              }
              placeholder="123"
              className="w-full px-3 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
          </div>
          <div className="col-span-3 space-y-1">
            <FieldLabel icon={Building2} label="Complemento" />
            <input
              type="text"
              value={address.complement}
              onChange={(e) =>
                setAddress((a) => ({ ...a, complement: e.target.value }))
              }
              placeholder="Apto, Sala, Bloco..."
              className="w-full px-3 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
          </div>
        </div>

        {/* Bairro */}
        <div className="space-y-1">
          <FieldLabel icon={Map} label="Bairro" required />
          <input
            type="text"
            value={address.neighborhood}
            onChange={(e) =>
              setAddress((a) => ({ ...a, neighborhood: e.target.value }))
            }
            placeholder="Centro, Vila Mariana..."
            className="w-full px-3 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
          />
        </div>

        {/* Cidade + UF */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1">
            <FieldLabel icon={Building2} label="Cidade" required />
            <input
              type="text"
              value={address.city}
              onChange={(e) =>
                setAddress((a) => ({ ...a, city: e.target.value }))
              }
              placeholder="São Paulo"
              className="w-full px-3 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
          </div>
          <div className="col-span-1 space-y-1">
            <FieldLabel icon={Map} label="UF" required />
            <input
              type="text"
              value={address.state}
              onChange={(e) =>
                setAddress((a) => ({
                  ...a,
                  state: e.target.value.toUpperCase().slice(0, 2),
                }))
              }
              placeholder="SP"
              maxLength={2}
              className="w-full px-3 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none uppercase"
            />
          </div>
        </div>

        <p className="text-[9px] text-petroleum/50 italic px-1">
          * Endereço utilizado para emissão da NF-e conforme legislação vigente.
        </p>
      </div>
    </SheetSection>
  );

  // ── Step 4: Confirmação ───────────────────────────────────────────────────────
  const stepConfirm = (
    <>
      {/* Resumo do plano */}
      <SheetSection>
        <div className="p-3.5 rounded-luxury bg-petroleum/5 border border-petroleum/10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-luxury-widest text-petroleum/50 mb-1">
                Plano selecionado
              </p>
              <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide leading-none">
                {selectedPlanInfo?.name ?? selectedPlan}
              </p>
              <p className="text-[11px] text-petroleum/50 mt-1">
                R$ {selectedPlanInfo?.price}/mês ·{' '}
                {storageLabel(selectedPerms.storageGB)} ·{' '}
                {selectedPerms.maxGalleries} galerias
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep('plan')}
              className="text-[9px] font-semibold text-gold hover:underline shrink-0"
            >
              Alterar
            </button>
          </div>
        </div>
      </SheetSection>

      {/* Resumo dos dados */}
      <SheetSection title="Dados confirmados">
        <div className="space-y-0 divide-y divide-slate-100">
          {[
            {
              label: 'WhatsApp',
              value: personal.whatsapp,
              onEdit: () => setStep('personal'),
            },
            {
              label: 'CPF/CNPJ',
              value: personal.cpfCnpj,
              onEdit: () => setStep('personal'),
            },
            {
              label: 'Endereço',
              value: `${address.street}, ${address.number}${address.complement ? ` – ${address.complement}` : ''}, ${address.neighborhood}, ${address.city}/${address.state} – ${address.cep}`,
              onEdit: () => setStep('address'),
            },
          ].map(({ label, value, onEdit }) => (
            <div
              key={label}
              className="flex items-start justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-luxury-widest text-petroleum/40">
                  {label}
                </p>
                <p className="text-[11px] font-semibold text-petroleum leading-snug mt-0.5">
                  {value}
                </p>
              </div>
              <button
                type="button"
                onClick={onEdit}
                className="text-[9px] font-semibold text-gold hover:underline shrink-0 mt-1"
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      </SheetSection>

      {/* Forma de pagamento */}
      <SheetSection title="Forma de pagamento">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'PIX' as BillingType, label: 'PIX', Icon: QrCode },
              {
                value: 'BOLETO' as BillingType,
                label: 'Boleto',
                Icon: FileText,
              },
              {
                value: 'CREDIT_CARD' as BillingType,
                label: 'Cartão',
                Icon: CreditCard,
              },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setBillingType(value)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-luxury border-2 transition-all ${
                billingType === value
                  ? 'border-gold bg-gold/10 text-petroleum'
                  : 'border-slate-200 bg-slate-50 text-petroleum/60 hover:border-gold/40'
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                {label}
              </span>
            </button>
          ))}
        </div>
      </SheetSection>

      {/* Aceite de termos */}
      <SheetSection>
        <div
          className={`p-3 rounded-luxury border transition-all ${
            acceptedTerms
              ? 'bg-emerald-50/40 border-emerald-200/60'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              id="terms-upgrade"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gold focus:ring-gold cursor-pointer shrink-0"
            />
            <span className="text-[10px] leading-relaxed text-petroleum/60 font-medium">
              Li e concordo com os{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-gold font-bold hover:underline"
              >
                Termos de Uso
              </button>{' '}
              e estou ciente de que os arquivos são armazenados no meu Google
              Drive™ e que o plano possui limites de processamento.
            </span>
          </label>
        </div>
        <p className="text-[9px] text-slate-400 italic px-0.5 pt-2">
          A cobrança aparece como <strong>SUAGALERIA</strong> na sua fatura.
          Direito de arrependimento de 7 dias (CDC).
        </p>
      </SheetSection>

      {requestError && (
        <div className="rounded-luxury bg-red-50 border border-red-200/60 px-3 py-2">
          <p className="text-[10px] font-medium text-red-700">{requestError}</p>
        </div>
      )}
    </>
  );

  // ── Step 5: Concluído ─────────────────────────────────────────────────────────
  const stepDone = (
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

  // =============================================================================
  // Footer dinâmico
  // =============================================================================
  const footer =
    step === 'done' ? null : (
      <SheetFooter>
        <div className="space-y-2">
          {step === 'plan' && (
            <button
              type="button"
              onClick={() => setStep('personal')}
              className="btn-luxury-primary w-full"
            >
              Continuar com {selectedPlanInfo?.name ?? selectedPlan}
              <ChevronRight size={15} />
            </button>
          )}
          {step === 'personal' && (
            <button
              type="button"
              disabled={!canProceedPersonal}
              onClick={() => setStep('address')}
              className="btn-luxury-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próximo: Endereço
              <ChevronRight size={15} />
            </button>
          )}
          {step === 'address' && (
            <button
              type="button"
              disabled={!canProceedAddress}
              onClick={() => setStep('confirm')}
              className="btn-luxury-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Revisar e Confirmar
              <ChevronRight size={15} />
            </button>
          )}
          {step === 'confirm' && (
            <button
              type="button"
              disabled={!acceptedTerms || loading}
              onClick={handleConfirm}
              className="btn-luxury-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando…' : 'Confirmar Solicitação'}
              <ArrowRight size={15} />
            </button>
          )}

          {goBack[step] && (
            <button
              type="button"
              onClick={() => setStep(goBack[step]!)}
              className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-petroleum/40 hover:text-petroleum/70 transition-colors py-1"
            >
              <ArrowLeft size={11} />
              Voltar
            </button>
          )}
        </div>
      </SheetFooter>
    );

  // =============================================================================
  // Títulos
  // =============================================================================
  const titles: Record<Step, { title: string; subtitle: string }> = {
    plan: { title: 'Upgrade de Plano', subtitle: 'Escolha o plano ideal' },
    personal: { title: 'Dados Pessoais', subtitle: 'Contato e documento' },
    address: { title: 'Endereço', subtitle: 'Para emissão da NF-e' },
    confirm: { title: 'Revisar Dados', subtitle: 'Confirme antes de enviar' },
    done: { title: 'Pronto!', subtitle: 'Solicitação registrada' },
  };

  // =============================================================================
  // Render
  // =============================================================================
  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      title={titles[step].title}
      subtitle={titles[step].subtitle}
      icon={<Crown size={16} />}
      headerClassName="bg-petroleum"
      footer={footer}
      maxWidth="md"
      position="right"
    >
      <div className="flex flex-col h-full">
        {step !== 'done' && <StepIndicator current={step} />}

        {step === 'plan' && stepPlan}
        {step === 'personal' && stepPersonal}
        {step === 'address' && stepAddress}
        {step === 'confirm' && stepConfirm}
        {step === 'done' && stepDone}
      </div>

      <TermsOfServiceModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </Sheet>
  );
}
