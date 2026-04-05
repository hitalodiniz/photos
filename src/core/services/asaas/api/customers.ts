// src/core/services/asaas/api/customers.ts
'use server';

import { asaasRequest, asaasError } from './client';
import type { CreateCustomerData } from '../types';

/**
 * Reutiliza o cliente já vinculado ao perfil (existingAsaasCustomerId) quando disponível.
 * Caso contrário, busca por CPF; só reutiliza se o e-mail bater (evita gravar pagamento em conta errada).
 */
export async function createOrUpdateAsaasCustomer(
  data: CreateCustomerData,
  existingAsaasCustomerId?: string | null,
) {
  if (existingAsaasCustomerId?.trim()) {
    return {
      success: true,
      customerId: existingAsaasCustomerId.trim(),
      isNew: false,
    };
  }

  try {
    const cpfDigits = data.cpfCnpj.replace(/\D/g, '');
    const { ok: searchOk, data: searchData } = await asaasRequest<{
      data?: Array<{ id: string; email?: string }>;
    }>(`/customers?cpfCnpj=${cpfDigits}`);

    if (searchOk && searchData.data?.length) {
      const currentEmail = data.email.trim().toLowerCase();
      const byEmail = searchData.data.find(
        (c) => (c.email ?? '').trim().toLowerCase() === currentEmail,
      );
      if (byEmail)
        return { success: true, customerId: byEmail.id, isNew: false };
    }

    const { ok, data: customer } = await asaasRequest<{
      id?: string;
      errors?: unknown[];
    }>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        cpfCnpj: cpfDigits,
        phone: data.phone.replace(/\D/g, ''),
        mobilePhone: data.phone.replace(/\D/g, ''),
        postalCode: data.postalCode.replace(/\D/g, ''),
        address: data.address,
        addressNumber: data.addressNumber,
        complement: data.complement,
        province: data.province,
        city: data.city,
        state: data.state,
        notificationDisabled: false,
      }),
    });

    if (!ok || !customer.id) {
      return {
        success: false,
        error: asaasError(
          customer as Record<string, unknown>,
          'Erro ao criar cliente no Asaas',
        ),
      };
    }
    return { success: true, customerId: customer.id, isNew: true };
  } catch (e) {
    console.error('[Asaas] createOrUpdateAsaasCustomer:', e);
    return {
      success: false,
      error: 'Erro de conexão com o gateway de pagamento',
    };
  }
}
