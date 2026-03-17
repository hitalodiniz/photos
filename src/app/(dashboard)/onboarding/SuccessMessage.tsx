'use client';

import React from 'react';
import { PlanBenefitsCarousel } from '@/components/ui/PlanBenefitsCarousel';
import { PlanKey } from '@/core/config/plans';

interface SuccessMessageProps {
  planKey: PlanKey;
  isTrial: boolean;
}

export function SuccessMessage({ planKey, isTrial }: SuccessMessageProps) {
  // Cenário 1: Novo usuário em trial
  if (isTrial) {
    return (
      <div className="space-y-3">
        <p className="text-[13px] md:text-[14px] leading-relaxed text-petroleum/80 font-medium text-left">
          Seu perfil está configurado e pronto para ser acessado pelo seu
          público. Você pode assinar um plano agora ou ir direto ao Espaço de
          Galerias para testar o Plano PRO por 14 dias.
        </p>
        <div className="p-4 bg-slate-50 border border-petroleum/10 rounded-luxury">
          <p className="text-[10px] font-semibold text-petroleum/80 text-left uppercase tracking-luxury">
            Dica: altere sua foto de capa e outras informações a qualquer
            momento nas configurações do perfil.
          </p>
        </div>
      </div>
    );
  }

  // Cenário 2: Usuário no plano FREE (pós-trial)
  if (planKey === 'FREE') {
    return (
      <div className="space-y-3">
        <p className="text-[13px] md:text-[14px] leading-relaxed text-petroleum/80 font-medium text-left">
          Seu perfil foi atualizado com sucesso! Você está no plano gratuito.
          Para desbloquear recursos avançados e aumentar seus limites, considere
          assinar um de nossos planos pagos.
        </p>
        <div className="p-4 bg-slate-50 border border-petroleum/10 rounded-luxury">
          <p className="text-[10px] font-semibold text-petroleum/80 text-left uppercase tracking-luxury">
            Explore os benefícios dos planos PRO e PREMIUM e eleve seu trabalho
            a um novo patamar.
          </p>
        </div>
      </div>
    );
  }

  // Cenário 3: Usuário com plano pago ativo
  return (
    <div className="space-y-3">
      <p className="text-[13px] md:text-[14px] leading-relaxed text-petroleum/80 font-medium text-left">
        Seu perfil foi atualizado com sucesso! Continue aproveitando todos os
        benefícios do seu plano.
      </p>
      <PlanBenefitsCarousel planKey={planKey} />
    </div>
  );
}
