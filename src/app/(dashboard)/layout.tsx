import { redirect } from 'next/navigation';
import { getProfileDataFresh } from '@/core/services/profile.service';
import { checkAndApplyExpiredSubscriptions } from '@/core/services/asaas.service';
import OnboardingGuard from '@/components/auth/OnboardingGuard';
import { DashboardExpiredWrapper } from '@/components/dashboard/DashboardExpiredWrapper';
import { createSupabaseServerClientReadOnly } from '@/lib/supabase.server';

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getProfileDataFresh();

  if (!result.success || !result.user_id) {
    redirect('/');
  }

  const expiredCheck = await checkAndApplyExpiredSubscriptions(
    result.user_id,
  ).catch((err) => {
    console.error('[Layout] checkAndApplyExpiredSubscriptions falhou:', err);
    return {
      applied: false,
      needs_adjustment: false,
      excess_galleries: [] as Array<{ id: string; title: string }>,
    };
  });

  const userId = result.user_id;
  const profile = result.profile ?? null;
  const shouldLoadAutoArchived =
    expiredCheck.applied ||
    (profile?.metadata as any)?.last_downgrade_alert_viewed === false;

  let galerias: any[] = [];
  if (shouldLoadAutoArchived) {
    const supabase = await createSupabaseServerClientReadOnly();
    const { data } = await supabase
      .from('tb_galerias')
      .select(
        'id,title,date,auto_archived,is_archived,is_deleted,photo_count,client_name,has_contracting_client,location',
      )
      .eq('user_id', userId)
      .eq('auto_archived', true)
      .eq('is_archived', false)
      .eq('is_deleted', false);
    galerias = data ?? [];
  }

  return (
    <OnboardingGuard profile={profile}>
      <DashboardExpiredWrapper
        expiredCheck={expiredCheck}
        profile={profile}
        galerias={galerias}
      >
        {children}
      </DashboardExpiredWrapper>
    </OnboardingGuard>
  );
}
