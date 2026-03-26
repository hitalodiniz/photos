import { PHOTO_CREDITS_BY_PLAN, type PlanKey } from '@/core/config/plans';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';

async function resolvePlanKeyForQuota(
  supabase: any,
  profileId: string,
  fallbackPlan: PlanKey,
): Promise<PlanKey> {
  const { data: profileRow } = await supabase
    .from('tb_profiles')
    .select('plan_key')
    .eq('id', profileId)
    .maybeSingle();

  const normalized = String(profileRow?.plan_key ?? fallbackPlan).toUpperCase();
  return normalized in PHOTO_CREDITS_BY_PLAN
    ? (normalized as PlanKey)
    : fallbackPlan;
}

export async function enforcePhotoQuotaByArchivingOldest(
  supabase: any,
  profileId: string,
  fallbackPlan: PlanKey = 'FREE',
): Promise<{ archivedCount: number; remainingTotal: number; quota: number }> {
  const planKey = await resolvePlanKeyForQuota(supabase, profileId, fallbackPlan);
  const quota = PHOTO_CREDITS_BY_PLAN[planKey] ?? PHOTO_CREDITS_BY_PLAN.FREE;

  const { data, error } = await supabase
    .from('tb_galerias')
    .select('id, photo_count, created_at')
    .eq('user_id', profileId)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .eq('auto_archived', false)
    .order('created_at', { ascending: false });

  const galleries = (data ?? []) as Array<{
    id: string;
    photo_count: number | null;
  }>;

  if (error || galleries.length === 0) {
    return { archivedCount: 0, remainingTotal: 0, quota };
  }

  let total = 0;
  const toArchive: string[] = [];

  for (const gallery of galleries) {
    const count = Math.max(0, Number(gallery.photo_count ?? 0));
    if (total + count <= quota) {
      total += count;
      continue;
    }
    toArchive.push(gallery.id);
  }

  if (toArchive.length === 0) {
    return { archivedCount: 0, remainingTotal: total, quota };
  }

  const { error: archiveError } = await supabase
    .from('tb_galerias')
    .update({
      is_archived: true,
      is_public: false,
      auto_archived: true,
      updated_at: utcIsoFrom(nowFn()),
    })
    .in('id', toArchive);

  if (archiveError) {
    return { archivedCount: 0, remainingTotal: total, quota };
  }

  return { archivedCount: toArchive.length, remainingTotal: total, quota };
}
