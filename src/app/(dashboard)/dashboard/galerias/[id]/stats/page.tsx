import { redirect, notFound } from 'next/navigation';

import { getGaleriaById } from '@/core/services/galeria.service'; // Ajuste o path se necessário
import { PlanProvider } from '@/core/context/PlanContext';
import { getProfileData } from '@/core/services/profile.service';
import EventReportView from '../../../EventReportView';
import { Metadata } from 'next';

interface StatsPageProps {
  params: Promise<{ id: string }>;
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
        title: `Estatísticas da galeria - ${result.data.title}`,
        description: `Estatísticas da galeria: ${result.data.title}`,
      };
    }
  }

  // Fallback caso a galeria não seja encontrada ou erro de permissão
  return {
    title: 'Estatísticas da galeria',
    description: 'Estatísticas da galeria.',
  };
}
/**
 * 🏗️ PÁGINA DE BI & PERFORMANCE
 * Segue o padrão de Server Components do projeto para busca de dados
 */
export default async function GaleriaStatsPage({ params }: StatsPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // 1. Verifica autenticação e obtém Perfil
  const resultProfile = await getProfileData();

  if (!resultProfile.success || !resultProfile.profile) {
    redirect(
      resultProfile.error === 'Usuário não autenticado.' ? '/' : '/onboarding',
    );
  }

  const profile = resultProfile.profile;

  // 2. Busca os dados da galeria no banco (Usando sua Action existente)
  // O segundo parâmetro garante que a galeria pertence ao usuário logado
  const galeriaResult = await getGaleriaById(id, profile.id);

  if (!galeriaResult.success || !galeriaResult.data) {
    return notFound();
  }

  const galeria = galeriaResult.data;

  /**
   * 💡 Diferente da página de organizar, aqui não precisamos buscar fotos do Drive,
   * pois o foco são os eventos de acesso, downloads e dispositivos gravados
   * na tb_galeria_stats.
   */

  return (
    <PlanProvider profile={profile}>
      <div className="min-h-screen bg-slate-50">
        {/* O EventReportView recebe o objeto galeria completo (com leads_enabled) 
            e faz a busca dos eventos no lado do cliente */}
        <EventReportView galeria={galeria} />
      </div>
    </PlanProvider>
  );
}
