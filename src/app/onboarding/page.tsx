import { getProfileData } from '@/actions/profile';
import { AuthGuard } from '@/components/auth';
import { redirect } from 'next/navigation';
import OnboardingForm from './OnboardingForm';

/**
 * SERVER COMPONENT: OnboardingPage
 * Gerencia a busca de dados inicial e a proteção de rota no servidor.
 */
export default async function OnboardingPage() {
  // 1. Busca os dados do perfil via Server Action
  const data = await getProfileData();

  // 2. Proteção de Segurança: Redireciona se não houver usuário autenticado
  if (!data.success || !data.user_id) {
    console.error("Erro no Onboarding:", data.error);
    redirect('/'); 
  }

  // 3. Define se o perfil já está completo para alternar entre "Novo Perfil" e "Editar"
  const profile = data.profile;
  const isProfileComplete = !!(profile?.full_name && profile?.username && profile?.mini_bio);

  return (
    <AuthGuard>
      {/* Container removido o centramento para o formulário ocupar 100% da largura e altura */}
      <div className="min-h-screen bg-[#F8F9FA]">
        <OnboardingForm
          initialData={profile}
          suggestedUsername={data.suggestedUsername}
          email={data.email || ""}
          isEditMode={isProfileComplete}
        />
      </div>
    </AuthGuard>
  );
}