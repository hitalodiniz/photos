import type { SupabaseClient } from '@supabase/supabase-js';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';

const DEFAULT_THEME = 'PHOTOGRAPHER';

/** Planos que permitem temas “Elite” (customizados além do padrão). */
export function planSupportsEliteThemes(planKey: string): boolean {
  const k = (planKey ?? '').trim().toUpperCase();
  return k === 'PLUS' || k === 'PRO' || k === 'PREMIUM';
}

function isDefaultProfileTheme(themeKey: string | null | undefined): boolean {
  const t = (themeKey ?? '').trim().toUpperCase();
  return !t || t === DEFAULT_THEME;
}

/**
 * Antes de gravar um plano inferior a PRO: guarda theme_key atual em
 * last_paid_theme_key (se não for o padrão) e força PHOTOGRAPHER no perfil +
 * RPC em lote em tb_galerias.
 */
export async function applyThemeRollbackForLowerPlan(
  supabase: SupabaseClient,
  profileId: string,
  targetPlanKey: string,
): Promise<void> {
  try {
    if (planSupportsEliteThemes(targetPlanKey)) return;

    const { data: row, error: selErr } = await supabase
      .from('tb_profiles')
      .select('theme_key, last_paid_theme_key')
      .eq('id', profileId)
      .maybeSingle();

    if (selErr) {
      console.warn('[theme-rollback] profile select:', selErr.message);
      return;
    }
    if (!row) return;

    const current = (row.theme_key ?? '').trim();
    const nextLastPaid = !isDefaultProfileTheme(current)
      ? current
      : (row.last_paid_theme_key ?? null);

    const { error: upErr } = await supabase
      .from('tb_profiles')
      .update({
        last_paid_theme_key: nextLastPaid,
        theme_key: DEFAULT_THEME,
        updated_at: utcIsoFrom(nowFn()),
      })
      .eq('id', profileId);

    if (upErr) {
      console.warn('[theme-rollback] profile update:', upErr.message);
      return;
    }

    const { error: rpcErr } = await supabase.rpc(
      'apply_theme_rollback_for_user',
      { p_user_id: profileId },
    );
    if (rpcErr) {
      console.warn(
        '[theme-rollback] apply_theme_rollback_for_user:',
        rpcErr.message,
      );
    }
  } catch (e) {
    console.warn('[theme-rollback]', e);
  }
}

export async function restoreGalleryThemesFromLastPaid(
  supabase: SupabaseClient,
  profileId: string,
): Promise<void> {
  const { error } = await supabase.rpc(
    'restore_gallery_themes_from_last_paid',
    {
      p_user_id: profileId,
    },
  );
  if (error) {
    console.warn(
      '[theme-restore] restore_gallery_themes_from_last_paid:',
      error.message,
    );
  }
}
