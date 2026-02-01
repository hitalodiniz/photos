// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getGalerias } from '@/core/services/galeria.service';
import { getProfileData } from '@/core/services/profile.service'; // 🎯 Importando seu serviço
import Dashboard from '.';

export const metadata = {
  title: 'Espaço de Galerias',
};

export default async function DashboardPage() {
  // 1. Busca os dados completos do perfil via serviço (Servidor)
  // O getProfileData já lida com a busca do usuário e do perfil
  const resultProfile = await getProfileData();

  if (!resultProfile.success || !resultProfile.profile) {
    // Se não houver sessão ou perfil, redireciona para login ou onboarding
    redirect(
      resultProfile.error === 'Usuário não autenticado.' ? '/' : '/onboarding',
    );
  }

  const profile = resultProfile.profile;

  // 2. Verifica se o perfil está completo (Regra de Onboarding)
  const isProfileComplete =
    profile.full_name && profile.username && profile.mini_bio;

  if (!isProfileComplete) {
    redirect('/onboarding');
  }

  // 3. Busca galerias via SSR (Ação de Servidor)
  const resultGalerias = await getGalerias();

  // 4. Tratamento de erro crítico de conexão do Google
  if (
    !resultGalerias.success &&
    resultGalerias.error === 'AUTH_RECONNECT_REQUIRED'
  ) {
    throw new Error('AUTH_RECONNECT_REQUIRED');
  }

  const initialGaleriasRaw = resultGalerias.success ? resultGalerias.data : [];

  // Injeta os dados do fotógrafo em cada galeria
  const initialGalerias = initialGaleriasRaw.map((galeria) => ({
    ...galeria,
    photographer: profile,
  }));

  // 5. Renderiza o Client Component injetando o perfil carregado
  return (
    <Dashboard
      initialGalerias={initialGalerias || []}
      initialProfile={profile}
    />
  );
}
