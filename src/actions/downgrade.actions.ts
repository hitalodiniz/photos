'use server';

import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { revalidateUserCache } from '@/actions/revalidate.actions';

/**
 * Marca que o usuário já visualizou o alerta de downgrade automático.
 * - Atualiza tb_profiles.metadata.last_downgrade_alert_viewed = true
 * - Revalida o cache do usuário para sumir o alerta imediatamente.
 */
export async function acknowledgeDowngradeAlert() {
  const { success, userId } = await getAuthenticatedUser();
  if (!success || !userId) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  const supabase = await createSupabaseServerClient();

  const { data: profileRow, error: profileError } = await supabase
    .from('tb_profiles')
    .select('metadata')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('[acknowledgeDowngradeAlert] Erro ao buscar metadata:', profileError);
    return { success: false, error: 'Erro ao atualizar alerta de downgrade.' };
  }

  const currentMetadata = (profileRow?.metadata as Record<string, unknown>) || {};

  const { error: updateError } = await supabase
    .from('tb_profiles')
    .update({
      metadata: {
        ...currentMetadata,
        last_downgrade_alert_viewed: true,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    console.error(
      '[acknowledgeDowngradeAlert] Erro ao atualizar metadata:',
      updateError,
    );
    return { success: false, error: 'Erro ao salvar confirmação do alerta.' };
  }

  await revalidateUserCache(userId).catch((err) =>
    console.warn('[acknowledgeDowngradeAlert] revalidateUserCache:', err),
  );

  return { success: true };
}

