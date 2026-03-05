'use client';

import React, { useState, useMemo } from 'react';
import {
  Crown,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  User,
  Mail,
  Phone,
  ArrowLeft,
} from 'lucide-react';
import { Sheet, SheetSection, SheetFooter } from '@/components/ui/Sheet';
import {
  PlanKey,
  PlanPermissions,
  PERMISSIONS_BY_PLAN,
  PLANS_BY_SEGMENT,
  planOrder,
  findNextPlanKeyWithFeature,
} from '@/core/config/plans';
import { usePlan } from '@/core/context/PlanContext';
import { useSegment } from '@/hooks/useSegment';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UpgradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  featureKey?: keyof PlanPermissions;
  featureName?: string;
}

type Step = 'plan' | 'confirm' | 'done';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function storageLabel(gb: number): string {
  return gb >= 1_000 ? `${gb / 1_000} TB` : `${gb} GB`;
}

function planBenefitsFor(perms: PlanPermissions): string[] {
  return [
    `Até ${perms.maxGalleries} galerias ativas (máx. ${perms.maxGalleriesHardCap})`,
    `${storageLabel(perms.storageGB)} de armazenamento`,
    `Até ${perms.maxPhotosPerGallery} arquivos por galeria`,
    `${perms.maxVideoCount} vídeo${perms.maxVideoCount !== 1 ? 's' : ''} por galeria`,
    perms.teamMembers > 0
      ? `Até ${perms.teamMembers} colaborador${perms.teamMembers !== 1 ? 'es' : ''} na equipe`
      : null,
    perms.canCaptureLeads ? 'Captura e exportação de leads' : null,
    perms.removeBranding ? 'White Label — sem marca do app' : null,
    perms.maxExternalLinks > 0
      ? `${perms.maxExternalLinks} link${perms.maxExternalLinks !== 1 ? 's' : ''} externo${perms.maxExternalLinks !== 1 ? 's' : ''} de download`
      : null,
  ].filter(Boolean) as string[];
}

// ─── Componente de card de plano ──────────────────────────────────────────────

function PlanCard({
  planKey,
  planName,
  price,
  isCurrentPlan,
  isSelected,
  isSuggested,
  onSelect,
  perms,
}: {
  planKey: PlanKey;
  planName: string;
  price: number;
  isCurrentPlan: boolean;
  isSelected: boolean;
  isSuggested: boolean;
  onSelect: () => void;
  perms: typeof PERMISSIONS_BY_PLAN.FREE;
}) {
  return (
    <button
      type="button"
      disabled={isCurrentPlan}
      onClick={onSelect}
      className={`w-full text-left rounded-luxury border-2 p-3.5 transition-all duration-200 relative ${
        isCurrentPlan
          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
          : isSelected
            ? 'border-gold bg-gold/5 shadow-[0_0_0_3px_rgba(212,175,55,0.15)]'
            : 'border-slate-200 bg-white hover:border-gold/40 hover:bg-gold/[0.02]'
      }`}
    >
      {isSuggested && !isCurrentPlan && (
        <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-gold text-petroleum text-[8px] font-black uppercase tracking-widest rounded-full">
          Recomendado
        </span>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Selector */}
          <div
            className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
              isSelected ? 'border-gold bg-gold' : 'border-slate-300 bg-white'
            }`}
          >
            {isSelected && (
              <div className="w-1.5 h-1.5 rounded-full bg-petroleum" />
            )}
          </div>

          <div>
            <p className="text-[12px] font-bold text-petroleum uppercase tracking-wide">
              {planName}
              {isCurrentPlan && (
                <span className="ml-1.5 text-[9px] text-slate-400 normal-case font-medium">
                  (atual)
                </span>
              )}
            </p>
            <p className="text-[10px] text-petroleum/50 font-medium">
              {storageLabel(perms.storageGB)} · {perms.maxGalleries} galerias ·{' '}
              {perms.maxPhotosPerGallery} arq/galeria
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          {price === 0 ? (
            <span className="text-[11px] font-bold text-slate-400">Grátis</span>
          ) : (
            <>
              <p className="text-[13px] font-black text-petroleum leading-none">
                R${price}
              </p>
              <p className="text-[8px] text-petroleum/40 font-medium">/mês</p>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Sheet principal ──────────────────────────────────────────────────────────

export function UpgradeSheet({
  isOpen,
  onClose,
  featureKey,
  featureName,
}: UpgradeSheetProps) {
  const { planKey, permissions } = usePlan();
  const { terms, segment } = useSegment();

  // Plano sugerido com base na feature bloqueada
  const suggestedPlanKey = useMemo((): PlanKey => {
    if (!featureKey) return 'PRO';
    return findNextPlanKeyWithFeature(planKey as PlanKey, featureKey) ?? 'PRO';
  }, [planKey, featureKey]);

  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(suggestedPlanKey);
  const [whatsapp, setWhatsapp] = useState('');

  // Planos disponíveis para upgrade (acima do atual)
  const currentIndex = planOrder.indexOf(planKey as PlanKey);
  const upgradablePlans = planOrder.filter(
    (p) => planOrder.indexOf(p) > currentIndex,
  );

  const selectedPerms = PERMISSIONS_BY_PLAN[selectedPlan];
  const selectedPlanInfo = PLANS_BY_SEGMENT[segment]?.[selectedPlan];
  const benefits = useMemo(
    () => planBenefitsFor(selectedPerms),
    [selectedPlan],
  );

  // Reset ao fechar
  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep('plan');
      setSelectedPlan(suggestedPlanKey);
      setWhatsapp('');
    }, 300);
  };

  // ── Step: Plan ──────────────────────────────────────────────────────────────
  const stepPlan = (
    <>
      {/* Contexto do bloqueio */}
      {featureName && (
        <SheetSection>
          <div className="flex items-start gap-3 p-3 rounded-luxury bg-amber-50 border border-amber-200">
            <Crown size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Recurso bloqueado
              </p>
              <p className="text-[11px] text-amber-700/80 leading-snug mt-0.5">
                <strong>{featureName}</strong> está disponível a partir do plano{' '}
                <strong>{selectedPlanInfo?.name ?? suggestedPlanKey}</strong>.
              </p>
            </div>
          </div>
        </SheetSection>
      )}

      {/* Seleção de plano */}
      <SheetSection title="Escolha seu novo plano">
        <div className="space-y-2">
          {/* Plano atual — desabilitado */}
          {(() => {
            const info = PLANS_BY_SEGMENT[segment]?.[planKey as PlanKey];
            const perms = PERMISSIONS_BY_PLAN[planKey as PlanKey];
            return (
              <PlanCard
                key={planKey}
                planKey={planKey as PlanKey}
                planName={info?.name ?? planKey}
                price={info?.price ?? 0}
                isCurrentPlan
                isSelected={false}
                isSuggested={false}
                onSelect={() => {}}
                perms={perms}
              />
            );
          })()}

          {/* Planos de upgrade */}
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
              />
            );
          })}
        </div>
      </SheetSection>

      {/* Benefícios do plano selecionado */}
      <SheetSection
        title={`O que muda no ${selectedPlanInfo?.name ?? selectedPlan}`}
      >
        <div className="space-y-1.5">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 size={11} className="text-gold shrink-0 mt-0.5" />
              <span className="text-[11px] text-petroleum/75 leading-snug">
                {b}
              </span>
            </div>
          ))}
        </div>
      </SheetSection>
    </>
  );

  // ── Step: Confirm ───────────────────────────────────────────────────────────
  const stepConfirm = (
    <>
      <SheetSection>
        {/* Resumo do plano escolhido */}
        <div className="p-3.5 rounded-luxury bg-petroleum/5 border border-petroleum/10 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-petroleum/60">
              Plano selecionado
            </p>
            <button
              type="button"
              onClick={() => setStep('plan')}
              className="text-[9px] font-semibold text-gold hover:underline"
            >
              Alterar
            </button>
          </div>
          <p className="text-[15px] font-black text-petroleum uppercase tracking-wide">
            {selectedPlanInfo?.name ?? selectedPlan}
          </p>
          <p className="text-[11px] text-petroleum/50">
            {storageLabel(selectedPerms.storageGB)} ·{' '}
            {selectedPerms.maxGalleries} galerias ·{' '}
            {selectedPerms.maxPhotosPerGallery} arq/galeria
          </p>
        </div>
      </SheetSection>

      {/* Dados confirmados */}
      <SheetSection title="Seus dados">
        <div className="space-y-2">
          {/* Nome — read only */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-luxury">
            <User size={12} className="text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Nome
              </p>
              <p className="text-[12px] font-semibold text-petroleum truncate">
                {/* Preenchido via perfil — placeholder visual */}
                Carregando...
              </p>
            </div>
            <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
          </div>

          {/* Email — read only */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-luxury">
            <Mail size={12} className="text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Email
              </p>
              <p className="text-[12px] font-semibold text-petroleum truncate">
                Carregando...
              </p>
            </div>
            <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
          </div>

          {/* WhatsApp — opcional */}
          <div
            className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-luxury transition-colors ${
              whatsapp
                ? 'border-gold/40 bg-gold/[0.03]'
                : 'border-slate-200 bg-white'
            }`}
          >
            <Phone size={12} className="text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                WhatsApp{' '}
                <span className="text-slate-300 normal-case font-medium">
                  (opcional)
                </span>
              </p>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 9 0000-0000"
                className="w-full text-[12px] font-semibold text-petroleum bg-transparent outline-none placeholder:text-slate-300"
              />
            </div>
            {whatsapp && (
              <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
            )}
          </div>
        </div>

        <p className="text-[9px] text-slate-400 leading-relaxed pt-1 px-0.5">
          Entraremos em contato para concluir a migração. Você não será cobrado
          agora.
        </p>
      </SheetSection>
    </>
  );

  // ── Step: Done ──────────────────────────────────────────────────────────────
  const stepDone = (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center">
        <Sparkles size={28} className="text-gold" />
      </div>
      <div className="space-y-1.5">
        <p className="text-[16px] font-black text-petroleum uppercase tracking-wide">
          Solicitação enviada!
        </p>
        <p className="text-[12px] text-petroleum/60 leading-relaxed max-w-[260px]">
          Recebemos seu interesse no plano{' '}
          <strong className="text-petroleum">
            {selectedPlanInfo?.name ?? selectedPlan}
          </strong>
          . Em breve entraremos em contato para concluir.
        </p>
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="mt-4 text-[10px] font-bold uppercase tracking-wider text-gold hover:text-gold/70 transition-colors"
      >
        Fechar
      </button>
    </div>
  );

  // ── Footer dinâmico ─────────────────────────────────────────────────────────
  const footer =
    step === 'done' ? null : (
      <SheetFooter>
        {step === 'plan' ? (
          <button
            type="button"
            onClick={() => setStep('confirm')}
            className="btn-luxury-primary w-full"
          >
            Continuar com {selectedPlanInfo?.name ?? selectedPlan}
            <ChevronRight size={15} />
          </button>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setStep('done')}
              className="btn-luxury-primary w-full"
            >
              Confirmar solicitação
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => setStep('plan')}
              className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-petroleum/40 hover:text-petroleum/70 transition-colors py-1"
            >
              <ArrowLeft size={11} />
              Voltar
            </button>
          </div>
        )}
      </SheetFooter>
    );

  // ── Título dinâmico ─────────────────────────────────────────────────────────
  const titles: Record<Step, { title: string; subtitle: string }> = {
    plan: { title: 'Upgrade de Plano', subtitle: 'Escolha o plano ideal' },
    confirm: { title: 'Confirmar Dados', subtitle: 'Revisão antes de enviar' },
    done: { title: 'Pronto!', subtitle: 'Solicitação registrada' },
  };

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
        {step === 'plan' && stepPlan}
        {step === 'confirm' && stepConfirm}
        {step === 'done' && stepDone}
      </div>
    </Sheet>
  );
}
