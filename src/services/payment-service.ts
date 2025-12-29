import { IS_PAYMENT_SIMULATED, PLANS, PlanKey } from "@/config/plans";

export const PaymentService = {
  async createCheckout(planKey: PlanKey) {
    if (IS_PAYMENT_SIMULATED) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const fakeSubscription = {
            plan: planKey,
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          };
          // Simula persistência no banco via LocalStorage
          localStorage.setItem('user_subscription', JSON.stringify(fakeSubscription));
          resolve({ url: '/settings/billing?success=true' });
        }, 2000);
      });
    }

    // Fluxo Real (Stripe)
    const response = await fetch('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId: PLANS[planKey].priceId }),
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  }
};