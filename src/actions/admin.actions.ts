'use server';

import { createSupabaseAdmin } from '@/lib/supabase.server';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import {
  revalidateProfile,
  revalidateUserCache,
} from '@/actions/revalidate.actions';
import type { PlanKey } from '@/core/config/plans';

export interface AdminUserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  username: string;
  plan_key: string;
  plan_trial_expires: string | null;
  is_exempt: boolean;
  gallery_count: number;
  subscription_status: string | null;
  cpf_cnpj: string | null;
}

/**
 * Lista usuários para o painel admin. Requer role 'admin'.
 * Filtros opcionais: email (busca parcial), cpfCnpj (dígitos).
 */
export async function listAdminUsers(filters?: {
  email?: string;
  cpfCnpj?: string;
}): Promise<{ success: boolean; data?: AdminUserRow[]; error?: string }> {
  const { success, userId, profile } = await getAuthenticatedUser();
  if (!success || !userId || !profile?.roles?.includes('admin')) {
    return { success: false, error: 'Acesso negado.' };
  }

  const admin = createSupabaseAdmin();

  const { data: profiles, error: profilesError } = await admin
    .from('tb_profiles')
    .select(
      'id, full_name, email, username, plan_key, plan_trial_expires, is_exempt',
    )
    .order('created_at', { ascending: false });

  if (profilesError) {
    console.error('[admin] listAdminUsers profiles:', profilesError);
    return { success: false, error: 'Erro ao listar usuários.' };
  }

  if (!profiles?.length) {
    return { success: true, data: [] };
  }

  const ids = profiles.map((p: { id: string }) => p.id);

  const [billingRes, galleryCountRes, upgradeRes] = await Promise.all([
    admin.from('tb_billing_profiles').select('id, cpf_cnpj').in('id', ids),
    admin
      .from('tb_galerias')
      .select('user_id')
      .eq('is_deleted', false)
      .eq('is_archived', false)
      .in('user_id', ids),
    admin
      .from('tb_upgrade_requests')
      .select('profile_id, status')
      .in('profile_id', ids)
      .order('created_at', { ascending: false }),
  ]);

  const billingByUserId = new Map<string, string | null>();
  (billingRes.data ?? []).forEach((r: { id: string; cpf_cnpj?: string }) => {
    billingByUserId.set(r.id, r.cpf_cnpj ?? null);
  });

  const galleryCountByUserId = new Map<string, number>();
  (galleryCountRes.data ?? []).forEach((r: { user_id: string }) => {
    galleryCountByUserId.set(
      r.user_id,
      (galleryCountByUserId.get(r.user_id) ?? 0) + 1,
    );
  });

  const latestStatusByUserId = new Map<string, string>();
  (upgradeRes.data ?? []).forEach(
    (r: { profile_id: string; status: string }) => {
      if (!latestStatusByUserId.has(r.profile_id)) {
        latestStatusByUserId.set(r.profile_id, r.status);
      }
    },
  );

  let rows: AdminUserRow[] = profiles.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    full_name: (p.full_name as string) ?? null,
    email: (p.email as string) ?? null,
    username: (p.username as string) ?? '',
    plan_key: (p.plan_key as string) ?? 'FREE',
    plan_trial_expires: (p.plan_trial_expires as string) ?? null,
    is_exempt: Boolean(p.is_exempt),
    gallery_count: galleryCountByUserId.get(p.id as string) ?? 0,
    subscription_status: latestStatusByUserId.get(p.id as string) ?? null,
    cpf_cnpj: billingByUserId.get(p.id as string) ?? null,
  }));

  if (filters?.email?.trim()) {
    const emailLower = filters.email.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.email?.toLowerCase().includes(emailLower) ||
        r.full_name?.toLowerCase().includes(emailLower) ||
        r.username?.toLowerCase().includes(emailLower),
    );
  }
  if (filters?.cpfCnpj?.trim()) {
    const digits = filters.cpfCnpj.replace(/\D/g, '');
    if (digits.length >= 6) {
      rows = rows.filter(
        (r) => r.cpf_cnpj && r.cpf_cnpj.replace(/\D/g, '').includes(digits),
      );
    }
  }

  return { success: true, data: rows };
}

/**
 * Atualiza manualmente o plano, a data de expiração e a flag de isenção de um usuário (suporte).
 * Ignora Asaas. Requer role 'admin'. Após sucesso, revalida cache do usuário.
 */
export async function updateUserPlanAdmin(payload: {
  userId: string;
  plan_key: PlanKey;
  plan_trial_expires: string | null;
  is_exempt?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { success, profile } = await getAuthenticatedUser();
  if (!success || !profile?.roles?.includes('admin')) {
    return { success: false, error: 'Acesso negado.' };
  }

  const supabase = createSupabaseAdmin();

  const { data: target } = await supabase
    .from('tb_profiles')
    .select('username')
    .eq('id', payload.userId)
    .maybeSingle();

  if (!target) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  const updates: Record<string, unknown> = {
    plan_key: payload.plan_key,
    plan_trial_expires: payload.plan_trial_expires || null,
    updated_at: new Date().toISOString(),
  };
  if (typeof payload.is_exempt === 'boolean') {
    updates.is_exempt = payload.is_exempt;
  }

  const { error } = await supabase
    .from('tb_profiles')
    .update(updates)
    .eq('id', payload.userId);

  if (error) {
    console.error('[admin] updateUserPlanAdmin:', error);
    return { success: false, error: error.message };
  }

  await revalidateUserCache(payload.userId);
  return { success: true };
}

/**
 * Revalida o cache de um usuário (tags de perfil e galerias).
 * Requer role 'admin'. Use após alterações manuais ou para forçar atualização.
 */
export async function adminRevalidateUserCache(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const { success, profile } = await getAuthenticatedUser();
  if (!success || !profile?.roles?.includes('admin')) {
    return { success: false, error: 'Acesso negado.' };
  }
  return revalidateUserCache(userId);
}

// ---------------------------------------------------------------------------
// Galerias do usuário (admin) e ações de visibilidade
// ---------------------------------------------------------------------------

export interface AdminGaleriaRow {
  id: string;
  title: string;
  slug: string;
  date: string;
  is_public: boolean;
  auto_archived: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
}

/**
 * Lista todas as galerias de um usuário para o painel admin (inclui auto_archived).
 */
export async function getGaleriasForAdmin(
  targetUserId: string,
): Promise<{ success: boolean; data?: AdminGaleriaRow[]; error?: string }> {
  const { success, profile } = await getAuthenticatedUser();
  if (!success || !profile?.roles?.includes('admin')) {
    return { success: false, error: 'Acesso negado.' };
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('tb_galerias')
    .select(
      'id, title, slug, date, is_public, auto_archived, is_archived, is_deleted, created_at',
    )
    .eq('user_id', targetUserId)
    .order('date', { ascending: false });

  if (error) {
    console.error('[admin] getGaleriasForAdmin:', error);
    return { success: false, error: error.message };
  }

  const rows: AdminGaleriaRow[] = (data ?? []).map(
    (r: Record<string, unknown>) => ({
      id: r.id as string,
      title: (r.title as string) ?? '',
      slug: (r.slug as string) ?? '',
      date: (r.date as string) ?? '',
      is_public: Boolean(r.is_public),
      auto_archived: Boolean(r.auto_archived),
      is_archived: Boolean(r.is_archived),
      is_deleted: Boolean(r.is_deleted),
      created_at: (r.created_at as string) ?? '',
    }),
  );

  return { success: true, data: rows };
}

/**
 * Forçar reativação: is_public=true, auto_archived=false.
 * Ocultar manualmente: is_public=false, auto_archived=true.
 * Requer admin. Após sucesso chama revalidateUserCache(userId).
 */
export async function adminGallerySetVisibility(
  galeriaId: string,
  userId: string,
  action: 'reactivate' | 'hide',
): Promise<{ success: boolean; error?: string }> {
  const { success, profile } = await getAuthenticatedUser();
  if (!success || !profile?.roles?.includes('admin')) {
    return { success: false, error: 'Acesso negado.' };
  }

  const supabase = await createSupabaseServerClient();

  const { data: galeria } = await supabase
    .from('tb_galerias')
    .select('id, user_id')
    .eq('id', galeriaId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!galeria) {
    return { success: false, error: 'Galeria não encontrada.' };
  }

  const updates =
    action === 'reactivate'
      ? { is_public: true, auto_archived: false }
      : { is_public: false, auto_archived: true };

  const { error } = await supabase
    .from('tb_galerias')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', galeriaId)
    .eq('user_id', userId);

  if (error) {
    console.error('[admin] adminGallerySetVisibility:', error);
    return { success: false, error: error.message };
  }

  await revalidateUserCache(userId);
  return { success: true };
}
