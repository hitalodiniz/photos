'use client';
import { Crown, Calendar } from 'lucide-react';
import { PLANS, PlanKey } from '@/config/plans';

export const SubscriptionStatus = ({
  plan,
  expiryDate,
}: {
  plan: PlanKey;
  expiryDate: string;
}) => {
  const currentPlan = PLANS[plan];

  return (
    <div className="bg-white/5 border border-[#F3E5AB]/20 rounded-3xl p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-champagne-dark/10 rounded-2xl text-[#F3E5AB]">
            <Crown size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              Plano Atual
            </p>
            <h3 className="text-xl font-serif italic text-white">
              {currentPlan.name}
            </h3>
          </div>
        </div>
        <span className="px-4 py-1 bg-champagne-dark text-black text-[10px] font-black rounded-full uppercase">
          Ativo
        </span>
      </div>
      <div className="flex items-center gap-2 text-white/60 text-xs">
        <Calendar size={14} />
        <span>Próxima renovação: {expiryDate}</span>
      </div>
    </div>
  );
};
