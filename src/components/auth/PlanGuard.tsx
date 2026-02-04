'use client';

import { PlanPermissions } from '@/core/config/plans';
import { usePlan } from '@/core/context/PlanContext';
import { Lock } from 'lucide-react';

interface PlanGuardProps {
  feature: keyof PlanPermissions;
  children: React.ReactNode;
  label?: string; // Título amigável para o fallback
  icon?: any; // Ícone para o fallback
  onClickLocked?: (data: {
    label: string;
    feature: keyof PlanPermissions;
  }) => void; // Callback para o Modal de Upgrade
}

export function PlanGuard({
  feature,
  children,
  label,
  icon: Icon,
  onClickLocked,
}: PlanGuardProps) {
  const { permissions } = usePlan();

  const hasAccess = (() => {
    const featureValue = permissions[feature];

    // 1. Caso Numérico: Tem que ser maior que 0
    if (typeof featureValue === 'number') return featureValue > 0;

    // 2. Caso Booleano: Tem que ser true
    if (typeof featureValue === 'boolean') return featureValue === true;

    // 3. Casos Específicos de String (Enums de Nível)
    if (feature === 'customizationLevel') {
      return ['colors', 'full'].includes(featureValue as string);
    }

    if (feature === 'profileLevel') {
      return ['standard', 'advanced', 'seo'].includes(featureValue as string);
    }

    // 4. Fallback Seguro: Se for 'unlimited' permite, se for 'default' ou 'basic' bloqueia
    if (featureValue === 'unlimited') return true;
    if (['default', 'basic', 'minimal'].includes(featureValue as string))
      return false;

    return !!featureValue;
  })();

  if (!hasAccess && label && Icon) {
    return (
      <div
        onClick={() => onClickLocked?.({ label, feature })}
        className="flex items-center gap-2 border-r border-petroleum/10 pr-2.5 shrink-0 h-8 opacity-50 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <label className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum flex items-center gap-1">
          {label}
        </label>
        <Lock size={16} className="text-petroleum/40" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return <>{children}</>;
}
