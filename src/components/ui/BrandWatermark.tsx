'use client';
import { usePlan } from '@/core/context/PlanContext';
import { useSegment } from '@/hooks/useSegment';

export const BrandWatermark = () => {
  const { permissions } = usePlan();
  const { terms } = useSegment();

  // 🛡️ Exibe a marca apenas se a permissão de remover branding for falsa
  if (permissions.removeBranding) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[100] pointer-events-none select-none animate-in fade-in duration-1000">
      <div className="flex flex-col items-start gap-0.5 opacity-20 hover:opacity-40 transition-opacity">
        <span className="text-[8px] uppercase tracking-luxury-widest text-white font-bold">
          Powered by
        </span>
        <span className="text-gold italic tracking-luxury-tight text-sm font-light">
          {terms.site_name}
        </span>
      </div>
    </div>
  );
};
