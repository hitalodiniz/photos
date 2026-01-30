'use client';
import { Sparkles, Clock, ArrowRight } from 'lucide-react';

import { differenceInDays, parseISO } from 'date-fns';
import { usePlan } from '@/hooks/usePlan';

export default function TrialBanner() {
  const { planKey, profile } = usePlan();

  // Só exibe se for plano PRO e for Trial
  if (planKey !== 'PRO' || !profile?.is_trial || !profile?.plan_trial_expires) {
    return null;
  }

  const daysLeft = differenceInDays(
    parseISO(profile.plan_trial_expires),
    new Date(),
  );

  return (
    <div className="w-full bg-gradient-to-r from-petroleum to-slate-900 border border-gold/30 rounded-luxury p-4 mb-4 relative overflow-hidden group shadow-xl">
      {/* Detalhe de brilho decorativo */}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles size={80} className="text-gold" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center shrink-0 border border-gold/40 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
            <Clock className="text-gold" size={24} />
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-white text-[12px] font-bold uppercase tracking-widest leading-tight">
              Seu Período PRO Expira em{' '}
              <span className="text-gold">
                {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
              </span>
            </h3>
            <p className="text-white/60 text-[10px] uppercase tracking-luxury mt-1">
              Aproveite todos os recursos de entrega e cadastro de visitantes
              ilimitados.
            </p>
          </div>
        </div>

        <button
          onClick={() => window.open('/dashboard/planos', '_blank')}
          className="h-10 px-6 bg-gold hover:bg-white text-petroleum font-bold text-[10px] uppercase tracking-luxury rounded-luxury flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-gold/10"
        >
          Garantir Plano Vitalício
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
