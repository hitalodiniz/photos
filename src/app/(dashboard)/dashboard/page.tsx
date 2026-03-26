// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getGalerias } from '@/core/services/galeria.service';
import { getProfileDataFresh } from '@/core/services/profile.service';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import Dashboard from '.';

export const metadata = {
  title: 'Espaço de Galerias',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resultProfile = await getProfileDataFresh();

  if (!resultProfile.success || !resultProfile.profile) {
    redirect('/');
  }

  const profile = resultProfile.profile;
  const params = await searchParams;
  const impersonateRaw = params?.impersonate;
  const impersonateUserId =
    typeof impersonateRaw === 'string' ? impersonateRaw : undefined;
  const isAdmin = profile.roles?.includes('admin') === true;

  const resultGalerias = await getGalerias(undefined, {
    impersonateUserId:
      isAdmin && impersonateUserId ? impersonateUserId : undefined,
  });
  if (
    !resultGalerias.success &&
    resultGalerias.error === 'AUTH_RECONNECT_REQUIRED'
  ) {
    throw new Error('AUTH_RECONNECT_REQUIRED');
  }

  const initialGaleriasRaw = resultGalerias.success ? resultGalerias.data : [];
  const initialGalerias = initialGaleriasRaw.map((galeria) => ({
    ...galeria,
    photographer: profile,
  }));

  const supabase = await createSupabaseServerClient();
  const { data: pendingCandidates } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, payment_url, amount_final, processed_at, created_at, asaas_payment_id, billing_type, status, asaas_subscription_id, asaas_raw_status, overdue_since',
    )
    .eq('profile_id', profile.id)
    .in('status', ['pending', 'processing', 'rejected', 'approved'])
    .order('created_at', { ascending: false })
    .limit(25);

  const resolvePendingPaymentHref = (row: {
    id: string;
    payment_url: string | null;
    asaas_payment_id: string | null;
  }): string | null => {
    const u = (row.payment_url ?? '').trim();
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (row.asaas_payment_id) {
      return `/api/dashboard/payment-invoice-url?requestId=${encodeURIComponent(row.id)}`;
    }
    return null;
  };

  const latestPending = (pendingCandidates ?? []).find((row) => {
    const status = String(row.status ?? '').toLowerCase();
    const raw = String(row.asaas_raw_status ?? '').toUpperCase();
    return (
      status === 'pending' ||
      status === 'processing' ||
      status === 'rejected' ||
      raw === 'OVERDUE' ||
      !!row.overdue_since
    );
  });

  const latestPendingRequest = latestPending
    ? {
        id: latestPending.id as string,
        payment_url:
          resolvePendingPaymentHref({
            id: latestPending.id as string,
            payment_url: latestPending.payment_url as string | null,
            asaas_payment_id: latestPending.asaas_payment_id as string | null,
          }) ?? '/dashboard/assinatura',
        amount_final: Number(latestPending.amount_final ?? 0),
        due_date:
          (latestPending.processed_at as string | null) ??
          (latestPending.created_at as string | null) ??
          null,
        billing_type: (latestPending.billing_type as string | null) ?? null,
        status: (latestPending.status as string | null) ?? null,
        asaas_subscription_id:
          (latestPending.asaas_subscription_id as string | null) ?? null,
        asaas_raw_status: (latestPending.asaas_raw_status as string | null) ?? null,
      }
    : null;

  const { data: scheduledCancellationRow } = await supabase
    .from('tb_upgrade_requests')
    .select('id, scheduled_cancel_at, processed_at')
    .eq('profile_id', profile.id)
    .in('status', ['pending_cancellation', 'pending_downgrade'])
    .not('scheduled_cancel_at', 'is', null)
    .gte('scheduled_cancel_at', new Date().toISOString())
    .order('scheduled_cancel_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const scheduledCancellation = scheduledCancellationRow
    ? {
        request_id: scheduledCancellationRow.id as string,
        access_ends_at:
          (scheduledCancellationRow.scheduled_cancel_at as string | null) ??
          (scheduledCancellationRow.processed_at as string | null) ??
          null,
      }
    : null;

  return (
    <Dashboard
      initialGalerias={initialGalerias || []}
      initialProfile={profile}
      latestPendingRequest={latestPendingRequest}
      scheduledCancellation={scheduledCancellation}
      impersonateUserId={isAdmin && impersonateUserId ? impersonateUserId : undefined}
    />
  );
}
