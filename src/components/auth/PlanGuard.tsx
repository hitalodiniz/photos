'use client';
import { usePlan } from '@/context/PlanContext';
import { PlanPermissions } from '@/core/config/plans';
import { Lock } from 'lucide-react';

interface PlanGuardProps {
  feature: keyof PlanPermissions;
  children: React.ReactNode;
  label?: string; // Título amigável para o fallback
  icon?: any; // Ícone para o fallback
  onClickLocked?: (featureLabel: string) => void; // Callback para o Modal de Upgrade
}

export function PlanGuard({
  feature,
  children,
  label,
  icon: Icon,
  onClickLocked,
}: PlanGuardProps) {
  const { permissions } = usePlan();

  const hasAccess =
    typeof permissions[feature] === 'number'
      ? (permissions[feature] as number) > 0
      : !!permissions[feature];

  if (!hasAccess && label && Icon) {
    return (
      <div
        onClick={() => onClickLocked?.(label)}
        className="flex items-center gap-2 border-r border-petroleum/10 pr-2.5 shrink-0 h-8 opacity-50 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-1">
          <Icon size={11} className="text-gold" /> {label}
        </label>
        <Lock size={10} className="text-petroleum/40" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return <>{children}</>;
}
