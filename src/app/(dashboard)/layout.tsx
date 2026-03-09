import { redirect } from 'next/navigation';
import { getProfileDataFresh } from '@/core/services/profile.service';
import { checkAndApplyExpiredSubscriptions } from '@/core/services/asaas.service';
import OnboardingGuard from '@/components/auth/OnboardingGuard';
import { DashboardExpiredWrapper } from '@/components/dashboard/DashboardExpiredWrapper';

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getProfileDataFresh();

  if (!result.success || !result.user_id) {
    redirect('/');
  }

  const expiredCheck = await checkAndApplyExpiredSubscriptions(result.user_id).catch(
    (err) => {
      console.error('[Layout] checkAndApplyExpiredSubscriptions falhou:', err);
      return {
        applied: false,
        needs_adjustment: false,
        excess_galleries: [] as Array<{ id: string; title: string }>,
      };
    },
  );

  const profile = result.profile ?? null;

  return (
    <OnboardingGuard profile={profile}>
      <DashboardExpiredWrapper expiredCheck={expiredCheck}>
        {children}
      </DashboardExpiredWrapper>
    </OnboardingGuard>
  );
}
