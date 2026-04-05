import { createSupabaseAdmin } from '@/lib/supabase.server';
import { PERMISSIONS_BY_PLAN, type PlanKey } from '@/core/config/plans';

export type DriveRequestPlanContext =
  | { userId?: string; galleryId?: string }
  | PlanKey
  | number;

/**
 * Resolve plan_key para uso nas funções do Google Drive (limite de fotos e regras de vídeo).
 * Usado quando não há usuário logado: busca o plano por userId (tb_profiles) ou galleryId (galeria → photographer).
 */
export async function getPlanKeyForDriveRequest(context: {
  userId?: string;
  galleryId?: string;
}): Promise<PlanKey> {
  const supabase = createSupabaseAdmin();

  if (context.galleryId) {
    const { data: galeria } = await supabase
      .from('tb_galerias')
      .select('photographer:tb_profiles!user_id(plan_key)')
      .eq('id', context.galleryId)
      .single();

    const photographer = Array.isArray(galeria?.photographer)
      ? (galeria?.photographer as { plan_key?: string }[])[0]
      : (galeria?.photographer as { plan_key?: string } | undefined);
    const raw = photographer?.plan_key;
    if (raw && raw in PERMISSIONS_BY_PLAN) return raw as PlanKey;
  }

  if (context.userId) {
    const { data: profile } = await supabase
      .from('tb_profiles')
      .select('plan_key')
      .eq('id', context.userId)
      .single();

    const raw = profile?.plan_key;
    if (raw && raw in PERMISSIONS_BY_PLAN) return raw as PlanKey;
  }

  return 'FREE';
}
