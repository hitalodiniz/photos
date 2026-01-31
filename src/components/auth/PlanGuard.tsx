'use client';

import { PlanPermissions } from '@/core/config/plans';
import { usePlan } from '@/hooks/usePlan';
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

    // Lógica específica para 'customizationLevel'
    if (feature === 'customizationLevel') {
      const userCustomizationLevel = featureValue as
        | 'default'
        | 'colors'
        | 'full';
      return (
        userCustomizationLevel === 'colors' || userCustomizationLevel === 'full'
      );
    }

    // Lógica geral para outros tipos de features
    if (typeof featureValue === 'number') {
      return (featureValue as number) > 0;
    }
    if (typeof featureValue === 'boolean') {
      return featureValue === true;
    }
    // Para strings ou 'unlimited', assume true se não for 'default' (ou similar para strings)
    // ou se for 'unlimited'
    return true;
  })();

  if (!hasAccess && label && Icon) {
    return (
      <div
        onClick={() => onClickLocked?.({ label, feature })}
        className="flex items-center gap-2 border-r border-petroleum/10 pr-2.5 shrink-0 h-8 opacity-50 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-1">
          <Icon size={16} className="text-petroleum" /> {label}
        </label>
        <Lock size={10} className="text-petroleum/40" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return <>{children}</>;
}
