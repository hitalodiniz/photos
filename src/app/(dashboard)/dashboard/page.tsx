// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getGalerias } from '@/core/services/galeria.service';
import { getProfileDataFresh } from '@/core/services/profile.service';
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

  return (
    <Dashboard
      initialGalerias={initialGalerias || []}
      initialProfile={profile}
      impersonateUserId={isAdmin && impersonateUserId ? impersonateUserId : undefined}
    />
  );
}
