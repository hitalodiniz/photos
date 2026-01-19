import { getProfileData } from '@/core/services/profile.service';
import { AuthGuard } from '@/components/auth';
import { redirect } from 'next/navigation';
import OnboardingForm from './OnboardingForm';
import { Metadata } from 'next';

/**
 * SERVER COMPONENT: OnboardingPage
 * Gerencia a busca de dados inicial e a proteção de rota no servidor.
 */
export default async function OnboardingPage() {
  // 1. Busca os dados do perfil via Server Action
  const data = await getProfileData();

  // 2. Proteção de Segurança: Redireciona se não houver usuário autenticado
  if (!data.success || !data.user_id) {
    console.error('Erro no Onboarding:', data.error);
    redirect('/');
  }

  // 3. Define se o perfil já está completo para alternar entre "Novo Perfil" e "Editar"
  const profile = data.profile;

  // Verificação de integridade do Google
  const isGoogleConnected = !!profile?.google_refresh_token;

  const isProfileComplete = !!(
    profile?.full_name &&
    profile?.username &&
    profile?.mini_bio
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-luxury-bg">
        <OnboardingForm
          initialData={profile}
          suggestedUsername={data.suggestedUsername}
          email={data.email || ''}
          isEditMode={isProfileComplete}
          isGoogleConnected={isGoogleConnected}
        />
      </div>
    </AuthGuard>
  );
}
export const metadata: Metadata = {
  title: 'Configuração de Perfil',
};
