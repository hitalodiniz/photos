// src/core/services/asaas/utils/formatters.ts

import type { CreateSubscriptionData } from '../types';

export function normalizeCreditCard(
  details: CreateSubscriptionData['creditCardDetails'],
) {
  if (!details) return undefined;
  const expYear = details.expiryYear.replace(/\D/g, '');
  return {
    holderName: details.holderName,
    number: details.number.replace(/\D/g, ''),
    expiryMonth: details.expiryMonth
      .replace(/\D/g, '')
      .padStart(2, '0')
      .slice(-2),
    expiryYear:
      expYear.length <= 2
        ? `20${expYear.padStart(2, '0').slice(-2)}`
        : expYear.slice(-4),
    ccv: details.ccv.replace(/\D/g, ''),
  };
}

export function normalizeCreditCardHolderInfo(
  info: CreateSubscriptionData['creditCardHolderInfo'],
) {
  if (!info) return undefined;
  return {
    name: info.name,
    email: info.email,
    cpfCnpj: info.cpfCnpj.replace(/\D/g, ''),
    postalCode: info.postalCode.replace(/\D/g, ''),
    addressNumber: info.addressNumber,
    addressComplement: info.addressComplement ?? null,
    phone: info.phone.replace(/\D/g, '') || null,
    mobilePhone: info.mobilePhone.replace(/\D/g, '') || null,
  };
}

export function formatSnapshotAddress(data: {
  address: string;
  address_number: string;
  complement?: string;
  province: string;
  city: string;
  state: string;
  postal_code: string;
}): string {
  return `${data.address}, ${data.address_number}${data.complement ? ` – ${data.complement}` : ''}, ${data.province}, ${data.city}/${data.state} – ${data.postal_code}`;
}

export function buildCancellationNotes(
  baseText: string,
  reason?: string | null,
  comment?: string,
): string {
  if (!reason) return baseText;
  return JSON.stringify({
    type: 'cancellation',
    reason,
    ...(comment ? { comment: comment.slice(0, 400) } : {}),
    detail: baseText,
  });
}
