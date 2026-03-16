// src/core/services/asaas/api/pix.ts
'use server';

import { asaasRequest, asaasError } from './client';

/** Busca QR Code PIX (imagem base64 + payload copia e cola) para um pagamento. */
export async function getPixQrCodeFromPayment(paymentId: string): Promise<{
  success: boolean;
  encodedImage?: string;
  payload?: string;
  error?: string;
}> {
  const { ok, data } = await asaasRequest<{
    encodedImage?: string;
    payload?: string;
    errors?: unknown[];
  }>(`/payments/${paymentId}/pixQrCode`);
  if (!ok)
    return {
      success: false,
      error: asaasError(
        data as Record<string, unknown>,
        'Erro ao buscar QR Code PIX',
      ),
    };
  return {
    success: true,
    encodedImage:
      typeof data.encodedImage === 'string' ? data.encodedImage : undefined,
    payload: typeof data.payload === 'string' ? data.payload : undefined,
  };
}
