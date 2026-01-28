import { getProfileData } from '@/core/services/profile.service';
import SettingsForm from './SettingsForm';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Preferências | Photos',
};

export default async function SettingsPage() {
  const result = await getProfileData();

  if (!result.success || !result.profile) {
    redirect('/auth/login');
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-2xl font-bold tracking-tight uppercase font-montserrat text-petroleum">
          Preferências do Usuário
        </h2>
      </div>
      
      <SettingsForm profile={result.profile} />
    </div>
  );
}
