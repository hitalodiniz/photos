// packages/@photos/billing-asaas/src/client.ts

export class AsaasClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(apiKey: string, mode: 'sandbox' | 'production' = 'sandbox') {
    this.apiKey = apiKey;
    this.baseUrl =
      mode === 'sandbox'
        ? 'https://sandbox.asaas.com/api/v3'
        : 'https://api.asaas.com/v3';
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/merchants/myAccount`, {
        headers: { access_token: this.apiKey },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
