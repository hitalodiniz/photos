// packages/@photos/billing-asaas/src/index.ts

export type BillingConfig = {
  apiKey: string;
  domain: 'sua-galeria' | 'na-selfie' | 'em-campanha';
  isSandbox: boolean;
};

export type CreateSubscriptionParams = {
  customer: {
    name: string;
    email: string;
    cpfCnpj: string;
  };
  value: number;
  nextDueDate: string;
  remoteUserId: string; // ID do usuário no seu banco
};

export class BillingAsaas {
  private baseUrl: string;

  constructor(private config: BillingConfig) {
    this.baseUrl = config.isSandbox
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3';
  }

  private async request(endpoint: string, options: RequestInit) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        access_token: this.config.apiKey,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok)
      throw new Error(`Asaas API Error: ${response.statusText}`);
    return response.json();
  }

  async createSubscription(params: CreateSubscriptionParams) {
    // 1. Criar/Recuperar Cliente
    const customer = await this.request('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: params.customer.name,
        email: params.customer.email,
        cpfCnpj: params.customer.cpfCnpj,
        externalReference: params.remoteUserId,
      }),
    });

    // 2. Criar Assinatura com Metadata para Roteamento
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: customer.id,
        billingType: 'UNDEFINED',
        value: params.value,
        nextDueDate: params.nextDueDate,
        cycle: 'MONTHLY',
        metadata: {
          origin_app: this.config.domain,
          user_id: params.remoteUserId,
        },
      }),
    });
  }
}
