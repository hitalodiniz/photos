import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getProfileData } from '@/core/services/profile.service';
import { getGaleriaById, getProfileListCount } from '@/core/services/galeria.service';
import GaleriaFormPage from '@/features/galeria/components/admin/GaleriaFormPage';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Busca a galeria para obter o título
  const resultProfile = await getProfileData();
  if (resultProfile.success && resultProfile.profile) {
    const result = await getGaleriaById(id, resultProfile.profile.id);
    if (result.success && result.data) {
      return {
        title: `Editar Galeria - ${result.data.title}`,
        description: `Editar galeria: ${result.data.title}`,
      };
    }
  }

  // Fallback se não conseguir buscar a galeria
  return {
    title: 'Editar Galeria',
    description: 'Editar galeria',
  };
}

export default async function EditGaleriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

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

  // Busca a galeria
  const result = await getGaleriaById(id, profile.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const galeria = result.data;

  // Busca contagem de galerias no perfil
  const profileListCount = await getProfileListCount(profile.id);

  return (
    <GaleriaFormPage
      galeria={galeria}
      isEdit={true}
      initialProfile={profile}
      profileListCount={profileListCount}
    />
  );
}
