// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getGalerias } from '@/core/services/galeria.service';
import { getProfileDataFresh } from '@/core/services/profile.service';
import Dashboard from '.';

export const metadata = {
  title: 'Espaço de Galerias',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const resultProfile = await getProfileDataFresh();

  if (!resultProfile.success || !resultProfile.profile) {
    redirect('/');
  }

  const profile = resultProfile.profile;

  const resultGalerias = await getGalerias();
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
    />
  );
}
