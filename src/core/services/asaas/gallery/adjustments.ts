// src/core/services/asaas/gallery/adjustments.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase.server';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import {
  MAX_GALLERIES_HARD_CAP_BY_PLAN,
  PHOTO_CREDITS_BY_PLAN,
  MAX_PHOTOS_PER_GALLERY_BY_PLAN,
  type PlanKey,
} from '@/core/config/plans';

async function getNeedsAdjustment(
  profileId: string,
  planKey: PlanKey,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{
  needs_adjustment: boolean;
  excess_galleries: Array<{ id: string; title: string }>;
}> {
  const galleryLimit = MAX_GALLERIES_HARD_CAP_BY_PLAN[planKey] || 3;
  const photoLimit = PHOTO_CREDITS_BY_PLAN[planKey] || 450;
  const maxPhotosPerGallery = MAX_PHOTOS_PER_GALLERY_BY_PLAN[planKey] || 150;

  const { data: galleries } = await supabase
    .from('tb_galerias')
    .select('id, title, photo_count')
    .eq('user_id', profileId)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .eq('auto_archived', false)
    .order('created_at', { ascending: false });

  if (!galleries || galleries.length === 0) {
    return { needs_adjustment: false, excess_galleries: [] };
  }

  let currentGalleryCount = 0;
  let currentPhotoSum = 0;
  const excessGalleries: Array<{ id: string; title: string }> = [];

  for (const g of galleries) {
    const photoCount = g.photo_count || 0;

    const respectsSingleGalleryLimit = photoCount <= maxPhotosPerGallery;
    const fitsInGlobalGalleryLimit = currentGalleryCount < galleryLimit;
    const fitsInGlobalPhotoLimit = currentPhotoSum + photoCount <= photoLimit;

    if (
      respectsSingleGalleryLimit &&
      fitsInGlobalGalleryLimit &&
      fitsInGlobalPhotoLimit
    ) {
      currentGalleryCount++;
      currentPhotoSum += photoCount;
    } else {
      excessGalleries.push({ id: g.id, title: g.title });
    }
  }

  return {
    needs_adjustment: excessGalleries.length > 0,
    excess_galleries: excessGalleries,
  };
}

export async function reactivateAutoArchivedGalleries(
  profileId: string,
  newPlanKey: PlanKey,
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{ reactivated: number; error?: string }> {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());
  const maxGalleries = MAX_GALLERIES_HARD_CAP_BY_PLAN[newPlanKey] ?? 3;

  const { count: publicCount, error: countError } = await supabase
    .from('tb_galerias')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profileId)
    .eq('is_deleted', false)
    .eq('auto_archived', true);

  if (countError) return { reactivated: 0, error: countError.message };

  const slotsAvailable = Math.max(0, maxGalleries - (publicCount ?? 0));
  if (slotsAvailable === 0) return { reactivated: 0 };

  const { data: autoArchived } = await supabase
    .from('tb_galerias')
    .select('id')
    .eq('user_id', profileId)
    .eq('is_deleted', false)
    .eq('auto_archived', true)
    .order('created_at', { ascending: true })
    .limit(slotsAvailable);

  if (!autoArchived?.length) return { reactivated: 0 };

  const ids = autoArchived.map((g) => g.id);
  const { error: updateError } = await supabase
    .from('tb_galerias')
    .update({
      auto_archived: false,
      is_public: true,
      updated_at: utcIsoFrom(nowFn()),
    })
    .in('id', ids);

  return updateError
    ? { reactivated: 0, error: updateError.message }
    : { reactivated: ids.length };
}

// Exporta internamente para uso em downgrade
export { getNeedsAdjustment };
