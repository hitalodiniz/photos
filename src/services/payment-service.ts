export const PaymentService = {
  async createCheckout(priceId: string) {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  },

  async getPortalUrl() {
    const response = await fetch('/api/billing-portal', { method: 'POST' });
    const { url } = await response.json();
    window.location.href = url;
  }
};