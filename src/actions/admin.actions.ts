'use server';

import { createSupabaseAdmin } from '@/lib/supabase.server';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { revalidateUserCache } from '@/actions/revalidate.actions';
import type { PlanKey } from '@/core/config/plans';
import { revalidateTag } from 'next/cache';

export interface AdminUserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  username: string | null;
  plan_key: string;
  plan_trial_expires: string | null;
  is_exempt: boolean;
  gallery_count: number;
  subscription_status: string | null;
  cpf_cnpj: string | null;
  last_amount_final: number | null;
  last_billing_period: string | null;
  last_billing_type: string | null;
  subscription_expires_at: string | null;
  asaas_subscription_id: string | null;
}

const BILLING_PERIOD_MONTHS: Record<string, number> = {
  monthly: 1,
  semiannual: 6,
  annual: 12,
};

function parseExpiryFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(
    /nova data de vencimento:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}(?:[tT][^,\n\r]*)?)/i,
  );
  if (!m?.[1]) return null;
  return m[1];
}

function calculateSubscriptionExpiresAtFromRequest(req: {
  notes?: string | null;
  processed_at?: string | null;
  created_at?: string | null;
  billing_period?: string | null;
}): string | null {
  const fromNotes = parseExpiryFromNotes(req.notes);
  if (fromNotes) return fromNotes;

  const baseRaw = req.processed_at ?? req.created_at ?? null;
  if (!baseRaw) return null;
  const baseDate = new Date(baseRaw);
  if (isNaN(baseDate.getTime())) return null;

  const months =
    BILLING_PERIOD_MONTHS[(req.billing_period ?? '').toLowerCase()];
  if (!months) return null;

  const expires = new Date(baseDate);
  expires.setMonth(expires.getMonth() + months);
  return expires.toISOString();
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
    .order('full_name', { ascending: false });

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
      .eq('auto_archived', false)
      .in('user_id', ids),
    admin
      .from('tb_upgrade_requests')
      .select(
        'profile_id, status, amount_final, billing_period, billing_type, processed_at, created_at, notes, asaas_subscription_id',
      )
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
  const latestApprovedByUserId = new Map<
    string,
    {
      amount_final: number | null;
      billing_period: string | null;
      billing_type: string | null;
      processed_at: string | null;
      created_at: string | null;
      notes: string | null;
      asaas_subscription_id: string | null;
    }
  >();
  (upgradeRes.data ?? []).forEach(
    (r: {
      profile_id: string;
      status: string;
      amount_final?: number | null;
      billing_period?: string | null;
      billing_type?: string | null;
      processed_at?: string | null;
      created_at?: string | null;
      notes?: string | null;
      asaas_subscription_id?: string | null;
    }) => {
      if (!latestStatusByUserId.has(r.profile_id)) {
        latestStatusByUserId.set(r.profile_id, r.status);
      }
      if (
        r.status === 'approved' &&
        !latestApprovedByUserId.has(r.profile_id)
      ) {
        latestApprovedByUserId.set(r.profile_id, {
          amount_final:
            typeof r.amount_final === 'number' ? r.amount_final : null,
          billing_period: r.billing_period ?? null,
          billing_type: r.billing_type ?? null,
          processed_at: r.processed_at ?? null,
          created_at: r.created_at ?? null,
          notes: r.notes ?? null,
          asaas_subscription_id: r.asaas_subscription_id ?? null,
        });
      }
    },
  );

  let rows: AdminUserRow[] = profiles.map((p: Record<string, unknown>) => {
    const profileId = p.id as string;
    const latestApproved = latestApprovedByUserId.get(profileId);
    return {
      id: profileId,
      full_name: (p.full_name as string) ?? null,
      email: (p.email as string) ?? null,
      username: (p.username as string) ?? null,
      plan_key: (p.plan_key as string) ?? 'FREE',
      plan_trial_expires: (p.plan_trial_expires as string) ?? null,
      is_exempt: Boolean(p.is_exempt),
      gallery_count: galleryCountByUserId.get(profileId) ?? 0,
      subscription_status: latestStatusByUserId.get(profileId) ?? null,
      cpf_cnpj: billingByUserId.get(profileId) ?? null,
      last_amount_final: latestApproved?.amount_final ?? null,
      last_billing_period: latestApproved?.billing_period ?? null,
      last_billing_type: latestApproved?.billing_type ?? null,
      subscription_expires_at: latestApproved
        ? calculateSubscriptionExpiresAtFromRequest(latestApproved)
        : null,
      asaas_subscription_id: latestApproved?.asaas_subscription_id ?? null,
    };
  });

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
  const admin = createSupabaseAdmin();
  const { data: target, error } = await admin
    .from('tb_profiles')
    .select('id, username')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }
  if (!target) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  if (target.username) {
    revalidateTag(`profile-${target.username}`);
    revalidateTag(`profile-data-${target.username}`);
    revalidateTag(`profile-galerias-${target.username}`);
  }
  revalidateTag(`profile-private-${target.id}`);
  revalidateTag(`user-galerias-${target.id}`);
  revalidateTag(`profile-categories-${target.id}`);

  // Mantém a revalidação consolidada existente para cobrir outras tags internas.
  await revalidateUserCache(userId);
  return { success: true };
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
