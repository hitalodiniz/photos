'use client';
import { usePlan } from '@/core/context/PlanContext';
export const BrandWatermark = () => {
  const { planKey } = usePlan();

  // 🛡️ Só aparece nos planos FREE e START
  if (!['FREE', 'START'].includes(planKey)) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[100] pointer-events-none select-none animate-in fade-in duration-1000">
      <div className="flex flex-col items-start gap-0.5 opacity-20 hover:opacity-40 transition-opacity">
        <span className="text-[8px] uppercase tracking-luxury-widest text-white font-bold">
          Powered by
        </span>
        <span className="text-gold italic tracking-luxury-tight text-sm font-light">
          Sua Galeria
        </span>
      </div>
    </div>
  );
};
