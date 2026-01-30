'use client';
import { usePlan } from '@/context/PlanContext';
import { PlanPermissions } from '@/core/config/plans';

interface PlanSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  feature: keyof PlanPermissions;
  options: number[];
}

export function PlanSelect({ feature, options, ...props }: PlanSelectProps) {
  const { permissions } = usePlan();
  const limit = (permissions[feature] as number) || 0;

  return (
    <div className="relative flex items-center">
      <select
        {...props}
        className={`appearance-none bg-transparent pl-0.5 pr-3 text-[9px] font-bold text-petroleum outline-none cursor-pointer disabled:cursor-not-allowed ${props.className}`}
      >
        {options.map((v) => {
          const isBlocked = v > limit;
          return (
            <option key={v} value={v} disabled={isBlocked}>
              {v} {isBlocked ? '🔒' : ''}
            </option>
          );
        })}
      </select>

      {/* O seu ícone original mantido exatamente como solicitado */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-petroleum/60">
        <svg width="4" height="4" viewBox="0 0 10 10" fill="none">
          <path
            d="M1 3L5 7L9 3"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
