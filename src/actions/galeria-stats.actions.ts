'use server';

import { createSupabaseClientForCache } from '@/lib/supabase.server';
import { getDashboardData } from '@/core/services/galeria-stats.service'; // Importe a função, não o objeto

export async function getGaleriaStatsAction(galeriaId: string) {
  const supabase = await createSupabaseClientForCache();
  // Chama a função exportada
  return await getDashboardData(supabase, galeriaId);
}
