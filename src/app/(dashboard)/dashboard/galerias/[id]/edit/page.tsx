import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getProfileData } from '@/core/services/profile.service';
import { createSupabaseServerClientReadOnly } from '@/lib/supabase.server';
import { formatGalleryData } from '@/core/logic/galeria-logic';
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

async function getGaleriaById(id: string, userId: string) {
  try {
    const supabase = await createSupabaseServerClientReadOnly();
    const { data, error } = await supabase
      .from('tb_galerias')
      .select(
        `
        *,
        photographer:tb_profiles!user_id (
          id,
          full_name,
          username,
          use_subdomain,
          profile_picture_url,
          phone_contact,
          instagram_link,
          email
        )
      `,
      )
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return formatGalleryData(data as any, data.photographer?.username || '');
  } catch (error) {
    console.error('[getGaleriaById] Erro:', error);
    return null;
  }
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
  const galeria = await getGaleriaById(id, profile.id);

  if (!galeria) {
    notFound();
  }

  return (
    <GaleriaFormPage
      galeria={galeria}
      isEdit={true}
      initialProfile={profile}
    />
  );
}
