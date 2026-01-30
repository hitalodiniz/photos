import { getProfileData } from '@/core/services/profile.service';
import MessageSettingsForm from './MessageSettingsForm';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Configurar Mensagens | Photos',
};

export default async function MessageSettingsPage() {
  const result = await getProfileData();

  if (!result.success || !result.profile) {
    redirect('/auth/login');
  }

  return <MessageSettingsForm profile={result.profile} />;
}
