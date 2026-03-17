'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  PlanKey,
  getPlanBenefits,
  PERMISSIONS_BY_PLAN,
} from '@/core/config/plans';
import { useSegment } from '@/hooks/useSegment';
import { PlanBenefit } from '@/core/types/plan-benefits';
import { CheckCircle2 } from 'lucide-react';

interface PlanBenefitsCarouselProps {
  planKey: PlanKey | null | undefined;
}

export function PlanBenefitsCarousel({ planKey }: PlanBenefitsCarouselProps) {
  const { terms } = useSegment();
  const planBenefits: PlanBenefit[] = useMemo(() => {
    if (!planKey) return [];
    const permissions = PERMISSIONS_BY_PLAN[planKey];
    if (!permissions) return [];
    return getPlanBenefits(permissions, terms);
  }, [planKey, terms]);

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (planBenefits.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((i) => (i + 1) % planBenefits.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [planBenefits.length]);

  if (planBenefits.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-luxury-wide text-petroleum/80">
          Benefícios do plano {planKey}
        </p>
        <p className="text-[9px] text-petroleum/80 font-medium">
          {activeSlide + 1} / {planBenefits.length}
        </p>
      </div>

      <div className="relative mt-2">
        <div className="relative overflow-hidden rounded-luxury border border-petroleum/10 bg-petroleum/[0.03] min-h-[96px] flex items-center px-10 py-4 gap-4">
          <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-gold" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-luxury text-petroleum leading-tight">
              {planBenefits[activeSlide]?.label}
            </p>
            <p className="text-[13px] text-petroleum/70 mt-1 leading-snug">
              {planBenefits[activeSlide]?.description}
            </p>
          </div>
          {planBenefits.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setActiveSlide((i) =>
                    i === 0 ? planBenefits.length - 1 : i - 1,
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 border border-petroleum/10 flex items-center justify-center text-petroleum/40 hover:text-petroleum/70 hover:border-petroleum/20 transition-all shadow-sm"
              >
                <ChevronLeft size={13} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveSlide((i) => (i + 1) % planBenefits.length)
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 border border-petroleum/10 flex items-center justify-center text-petroleum/40 hover:text-petroleum/70 hover:border-petroleum/20 transition-all shadow-sm"
              >
                <ChevronRight size={13} strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-3">
          {planBenefits.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveSlide(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeSlide
                  ? 'w-4 h-1.5 bg-gold'
                  : 'w-1.5 h-1.5 bg-petroleum/15 hover:bg-petroleum/30'
              }`}
            />
          ))}
        </div>

        <div className="mt-2 h-px bg-petroleum/5 rounded-full overflow-hidden">
          <div
            key={activeSlide}
            className="h-full bg-gold/40 rounded-full"
            style={{ animation: 'progress-bar 3.5s linear forwards' }}
          />
        </div>
      </div>

      {planBenefits.length > 1 && (
        <p className="text-center text-[9px] text-petroleum/80 font-medium mt-3">
          Use as setas ou toque nos pontos para navegar
        </p>
      )}
    </div>
  );
}
