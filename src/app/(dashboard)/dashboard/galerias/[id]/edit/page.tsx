import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getProfileData } from '@/core/services/profile.service';
import { getGaleriaById } from '@/core/services/galeria.service';
import GaleriaFormPage from '../../GaleriaFormPage';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Editar Galeria - ${resolvedParams.id}`,
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
      resultProfile.error === 'Usuário não autenticado.' ? '/auth/login' : '/onboarding',
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

  return (
    <GaleriaFormPage
      galeria={galeria}
      isEdit={true}
      initialProfile={profile}
    />
  );
}
