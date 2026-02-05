import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfileData } from '@/core/services/profile.service';
import { getProfileListCount } from '@/core/services/galeria.service';
import { PlanProvider } from '@/core/context/PlanContext';
import GaleriaFormPage from '@/features/galeria/components/admin/GaleriaFormPage';

export const metadata: Metadata = {
  title: 'Nova Galeria',
  description: 'Criar uma nova galeria',
};

export default async function NewGaleriaPage() {
  // Verifica autenticação
  const resultProfile = await getProfileData();

  if (!resultProfile.success || !resultProfile.profile) {
    redirect(
      resultProfile.error === 'Usuário não autenticado.' ? '/' : '/onboarding',
    );
  }

  const profile = resultProfile.profile;

  // Verifica se o perfil está completo
  const isProfileComplete =
    profile.full_name && profile.username && profile.mini_bio;

  if (!isProfileComplete) {
    redirect('/onboarding');
  }

  // Busca contagem de galerias no perfil
  const profileListCount = await getProfileListCount(profile.id);

  return (
    <PlanProvider profile={profile}>
      <GaleriaFormPage
        galeria={null}
        isEdit={false}
        initialProfile={profile}
        profileListCount={profileListCount}
      />
    </PlanProvider>
  );
}
