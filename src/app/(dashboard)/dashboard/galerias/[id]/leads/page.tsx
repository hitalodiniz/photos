import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getProfileData } from '@/core/services/profile.service';
import { getGaleriaById } from '@/core/services/galeria.service';
import LeadReportView from '../../../LeadReportView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const resultProfile = await getProfileData();
  if (resultProfile.success && resultProfile.profile) {
    const result = await getGaleriaById(id, resultProfile.profile.id);
    if (result.success && result.data) {
      return {
        title: `Leads - ${result.data.title}`,
        description: `Relatório de leads: ${result.data.title}`,
      };
    }
  }

  return {
    title: 'Relatório de Leads',
    description: 'Relatório de leads',
  };
}

export default async function LeadsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const resultProfile = await getProfileData();

  if (!resultProfile.success || !resultProfile.profile) {
    redirect(
      resultProfile.error === 'Usuário não autenticado.' ? '/' : '/onboarding',
    );
  }

  const profile = resultProfile.profile;

  // Busca a galeria
  const result = await getGaleriaById(id, profile.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const galeria = result.data;

  return <LeadReportView galeria={galeria} />;
}
