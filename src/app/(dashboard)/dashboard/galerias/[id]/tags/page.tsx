// src/app/(dashboard)/dashboard/galerias/[id]/organizar/page.tsx
import { getGaleriaById } from '@/core/services/galeria.service';
import { getFolderPhotos } from '@/core/services/google-drive.service';
import { getProfileData } from '@/core/services/profile.service';
import TagManagerView from '@/features/galeria/components/admin/TagManagerView';
import { notFound, redirect } from 'next/navigation';
import { PlanProvider } from '@/core/context/PlanContext';
import { Metadata } from 'next';

interface OrganizarPageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Busca o perfil do usuário logado
  const resultProfile = await getProfileData();

  if (resultProfile.success && resultProfile.profile) {
    // Busca os dados da galeria específica para o título
    const result = await getGaleriaById(id, resultProfile.profile.id);

    if (result.success && result.data) {
      return {
        title: `Marcação de Fotos - ${result.data.title}`,
        description: `Gestão de marcação de fotos: ${result.data.title}`,
      };
    }
  }

  // Fallback caso a galeria não seja encontrada ou erro de permissão
  return {
    title: 'Marcação de Fotos',
    description: 'Gestão de marcações de fotos.',
  };
}

export default async function OrganizarPage({ params }: OrganizarPageProps) {
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

  // 1. Busca os dados da galeria no banco
  const galeriaResult = await getGaleriaById(id, resultProfile.profile.id);

  if (!galeriaResult.success || !galeriaResult.data) {
    return notFound();
  }

  const galeria = galeriaResult.data;

  // 2. Busca as fotos do Drive (Server Action que criamos)
  // Isso evita o "loading" de fotos ao abrir a página
  let photos: any[] = [];
  if (galeria.drive_folder_id) {
    const photosResult = await getFolderPhotos(galeria.drive_folder_id);
    if (photosResult.success) {
      photos = photosResult.data || [];
    }
  }

  return (
    <PlanProvider profile={profile}>
      <TagManagerView galeria={galeria} photos={photos} />
    </PlanProvider>
  );
}
