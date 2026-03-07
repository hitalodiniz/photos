import { redirect } from 'next/navigation';
import { getProfileDataFresh } from '@/core/services/profile.service';
import OnboardingGuard from '@/components/auth/OnboardingGuard';

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getProfileDataFresh();

  if (!result.success || !result.user_id) {
    redirect('/');
  }

  const profile = result.profile ?? null;

  return <OnboardingGuard profile={profile}>{children}</OnboardingGuard>;
}
