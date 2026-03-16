// src/core/services/asaas/billing/billing-profile.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase.server';
import type { BillingProfile } from '@/core/types/billing';

export async function upsertBillingProfile(
  profileId: string,
  data: Omit<
    BillingProfile,
    'id' | 'cpf_cnpj_type' | 'created_at' | 'updated_at'
  >,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('tb_billing_profiles').upsert(
    {
      id: profileId,
      full_name: data.full_name ?? null,
      cpf_cnpj: data.cpf_cnpj,
      postal_code: data.postal_code,
      address: data.address,
      address_number: data.address_number,
      complement: data.complement ?? null,
      province: data.province,
      city: data.city,
      state: data.state,
      ...(data.asaas_customer_id != null && {
        asaas_customer_id: data.asaas_customer_id,
      }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: false },
  );
  if (error) {
    console.error('[DB] Erro ao salvar billing profile:', error);
    return { success: false, error: 'Erro ao salvar dados fiscais' };
  }
  return { success: true };
}