'use client';
import { useEffect, useState } from 'react';
import { PLANS, PlanKey, IS_PAYMENT_SIMULATED } from '@/config/plans';

export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    // Em produção, você buscaria isso do seu backend/auth
    const saved = localStorage.getItem('user_subscription');
    if (saved) setSubscription(JSON.parse(saved));
  }, []);

  const planKey: PlanKey = subscription?.plan || 'START';
  const planDetails = PLANS[planKey];

  return {
    planName: planDetails.name,
    isPremium: planKey === 'PREMIUM',
    isPro: planKey === 'PRO' || planKey === 'PREMIUM',
    limit: planDetails.maxGalleries,
    status: subscription?.status || 'none',
    expiryDate: subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : '-'
  };
}