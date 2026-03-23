import { redirect } from 'next/navigation';
import { getProfileDataFresh } from '@/core/services/profile.service';
import AdminCouponsClient from './page.client';

export default async function AdminCouponsPage() {
  const result = await getProfileDataFresh();
  if (!result.success || !result.profile?.roles?.includes('admin')) {
    redirect('/');
  }

  return <AdminCouponsClient />;
}

