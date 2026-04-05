import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfileData } from '@/core/services/profile.service';
import {
  getProfileListCount,
  getPhotographerPoolStats,
} from '@/core/services/galeria.service';
import { PlanProvider } from '@/core/context/PlanContext';
import GaleriaFormPage from '@/features/galeria/components/admin/GaleriaFormPage';
import { PERMISSIONS_BY_PLAN, type PlanKey } from '@/core/config/plans';

export const metadata: Metadata = {
  title: 'Nova Galeria',
  description: 'Criar uma nova galeria',
};

export default async function NewGaleriaPage() {
  // Verifica autenticação
  const resultProfile = await getProfileData();

  if (!resultProfile.success || !resultProfile.profile) {
    redirect('/');
  }

  const profile = resultProfile.profile;

  // Busca contagem de galerias e uso do pool (cota de fotos)
  const [profileListCount, poolStats] = await Promise.all([
    getProfileListCount(profile.id),
    getPhotographerPoolStats(profile.id),
  ]);

  const planKey = (PERMISSIONS_BY_PLAN[profile.plan_key as PlanKey]
    ? profile.plan_key
    : 'FREE') as PlanKey;
  const permissions = PERMISSIONS_BY_PLAN[planKey];
  const remainingPhotoCredits = Math.max(
    0,
    permissions.photoCredits - poolStats.totalPhotosUsed,
  );
  const canCreateByPhotos = remainingPhotoCredits > 0;
  const canCreateByGalleries = poolStats.activeGalleryCount < permissions.maxGalleries;

  if (!canCreateByPhotos || !canCreateByGalleries) {
    redirect('/dashboard');
  }

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
