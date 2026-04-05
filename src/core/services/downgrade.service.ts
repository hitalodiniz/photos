// src/services/billing/downgrade.service.ts

import {
  createSupabaseAdmin,
  createSupabaseServerClient,
} from '@/lib/supabase.server';
import { revalidateProfileComplete } from '@/actions/revalidate.actions';
import { getNeedsAdjustment } from './asaas'; // Ajuste conforme seu caminho
import { revalidatePath } from 'next/cache';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { createBillingNotesForNewUpgradeRequest } from './asaas/utils/billing-notes-doc';

export async function performDowngradeToFree(
  profileId: string,
  upgradeRequestId: string | null,
  reason: string,
  supabaseClient?: any, // Pode receber o admin da rota
): Promise<{
  success: boolean;
  needs_adjustment: boolean;
  excess_galleries: Array<{ id: string; title: string }>;
  error?: string;
}> {
  // 🎯 IMPORTANTE: Se for cron/admin, usamos o Admin Client (Service Role)
  const supabase = supabaseClient ?? createSupabaseAdmin();

  // 1. Buscar perfil
  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('id, username, plan_key, is_exempt, metadata, is_trial')
    .eq('id', profileId)
    .single();

  if (!profile)
    return {
      success: false,
      needs_adjustment: false,
      excess_galleries: [],
      error: 'Perfil não encontrado.',
    };
  if (profile.is_exempt === true)
    return { success: true, needs_adjustment: false, excess_galleries: [] };

  const oldPlan = (profile.plan_key as string) ?? 'FREE';
  if (oldPlan === 'FREE' && !profile.is_trial)
    return { success: true, needs_adjustment: false, excess_galleries: [] };

  // 2. Update Perfil (Plano e Trial)
  const newMetadata = {
    ...(profile.metadata ?? {}),
    last_downgrade_alert_viewed: false,
    downgrade_reason: reason,
    downgrade_at: utcIsoFrom(nowFn()),
  };

  const { error: planError } = await supabase
    .from('tb_profiles')
    .update({
      plan_key: 'FREE',
      is_trial: false,
      metadata: newMetadata,
      updated_at: utcIsoFrom(nowFn()),
    })
    .eq('id', profileId);

  if (planError) {
    console.error('[Downgrade] Erro ao atualizar plan_key:', planError);
    return {
      success: false,
      needs_adjustment: false,
      excess_galleries: [],
      error: planError.message,
    };
  }

  // 3. Histórico e Cancelamento de Request
  await supabase.from('tb_plan_history').insert({
    profile_id: profileId,
    old_plan: oldPlan,
    new_plan: 'FREE',
    reason,
  });

  if (upgradeRequestId) {
    await supabase
      .from('tb_upgrade_requests')
      .update({
        status: 'cancelled',
        notes: createBillingNotesForNewUpgradeRequest({ logBody: reason }),
        processed_at: utcIsoFrom(nowFn()),
      })
      .eq('id', upgradeRequestId);
  }

  // 4. 🎯 ARQUIVAMENTO (Aqui é onde o Admin Client faz a diferença)
  const adjustment = await getNeedsAdjustment(profileId, 'FREE', supabase);

  if (adjustment.needs_adjustment && adjustment.excess_galleries.length > 0) {
    const excessIds = adjustment.excess_galleries.map((g: any) => g.id);

    console.log(
      `[Downgrade] Arquivando ${excessIds.length} galerias para o perfil ${profileId}`,
    );

    const { error: archiveError } = await supabase
      .from('tb_galerias')
      .update({
        is_archived: true, // Sua regra de negócio: arquivado = inativo
        auto_archived: true, // Marca que foi o sistema
        updated_at: utcIsoFrom(nowFn()),
      })
      .in('id', excessIds);

    if (archiveError) {
      console.error('[Downgrade] Erro ao arquivar galerias:', archiveError);
    }
  }

  // 5. Revalidação de Cache
  if (profile.username) {
    console.log(
      `[Downgrade] Iniciando revalidação para ${profile.username}...`,
    );
    // IMPORTANTE: Use await aqui para a rota não terminar antes de limpar o cache
    const reval = await revalidateProfileComplete(
      supabase,
      profile.username,
      profile.id,
    );

    // 2. 💣 FORÇA BRUTA: Revalida o layout inteiro do dashboard
    // Isso simula o efeito do seu botão de Purge, mas só para as rotas do sistema
    revalidatePath('/dashboard', 'layout');
    revalidatePath(`/${profile.username.toLowerCase()}`, 'layout');
    revalidatePath('/dashboard', 'page');
    revalidatePath('/dashboard', 'layout');

    if (reval.success) {
      console.log(`[Downgrade] Cache revalidado com sucesso.`);
    } else {
      console.error(`[Downgrade] Falha na revalidação de cache.`);
    }
  }
  return { success: true, ...adjustment };
}
