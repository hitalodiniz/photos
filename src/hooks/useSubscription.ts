'use client';
import { PLANS, PlanKey } from '@/config/plans';

// Simulação de dados do usuário vindos do seu AuthContext
export function useSubscription(userPlan: PlanKey = 'START', activeCount: number = 0) {
  const planDetails = PLANS[userPlan];
  
  const isPremium = userPlan === 'PREMIUM';
  const isPro = userPlan === 'PRO' || isPremium;
  const canCreateGallery = activeCount < planDetails.maxGalleries;
  const hasVipSupport = userPlan === 'PRO' || userPlan === 'PREMIUM';

  return {
    planName: planDetails.name,
    isPremium,
    isPro,
    canCreateGallery,
    hasVipSupport,
    limit: planDetails.maxGalleries
  };
}