// packages/@photos/billing-asaas/src/types.ts
export interface BillingConfig {
  apiKey: string;
  domain: 'sua-galeria' | 'na-selfie' | 'em-campanha';
  isSandbox: boolean;
}

// packages/@photos/billing-asaas/src/core.ts
export const createAsaasSubscription = async (
  config: BillingConfig,
  params: any,
) => {
  const url = config.isSandbox
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3';

  const body = {
    ...params,
    externalReference: params.userId, // ID do usuário no banco local do App
    metadata: {
      origin: config.domain, // Identificador para o Webhook rotear o banco correto
    },
  };

  // Implementação do fetch...
};
