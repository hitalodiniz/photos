import { redirect } from 'next/navigation';
import { getProfileDataFresh } from '@/core/services/profile.service';

/**
 * Layout do grupo (admin): só permite acesso se profile.roles incluir 'admin'.
 * Caso contrário, redireciona para o dashboard comum.
 */
export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getProfileDataFresh();

  if (!result.success || !result.profile) {
    redirect('/');
  }

  const isAdmin = result.profile.roles?.includes('admin') === true;
  if (!isAdmin) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
