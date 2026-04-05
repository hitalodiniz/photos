// src/app/(protected)/onboarding/page.tsx (ou onde estiver)

import { getProfileDataFresh } from '@/core/services/profile.service';
import { redirect } from 'next/navigation';
import OnboardingForm from './OnboardingForm';
import { Metadata } from 'next';
import { PlanProvider } from '@/core/context/PlanContext';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  // 1. Busca os dados do perfil SEM cache (evita loop de redirect)
  const data = await getProfileDataFresh();

  // 2. Proteção de Segurança
  if (!data.success || !data.user_id) {
    console.error('Erro no Onboarding:', data.error);
    redirect('/');
  }

  const profile = data.profile;

  // console.log('🔍 [SERVER] Onboarding Page - Profile Data:', {
  //   userId: data.user_id,
  //   email: profile?.email,
  //   username: profile?.username,
  //   plan_key: profile?.plan_key,
  //   plan_trial_expires: profile?.plan_trial_expires,
  //   accepted_terms: profile?.accepted_terms,
  //   created_at: profile?.created_at,
  // });

  // 3. Verificações (não redireciona se já aceitou termos — permite "Editar Perfil" no menu)
  const isGoogleConnected = !!profile?.google_refresh_token;
  const isProfileComplete = !!(
    profile?.full_name &&
    profile?.username &&
    profile?.mini_bio
  );

  // ✅ DEBUG: Log para verificar se o plano está sendo carregado
  // console.log('📊 Profile Data:', {
  //   plan_key: profile?.plan_key,
  //   plan_trial_expires: profile?.plan_trial_expires,
  //   accepted_terms: profile?.accepted_terms,
  //   is_trial: profile?.is_trial,
  // });

  return (
    <PlanProvider profile={profile}>
      <div className="min-h-screen bg-luxury-bg">
        <OnboardingForm
          initialData={profile}
          suggestedUsername={data.suggestedUsername}
          email={data.email || ''}
          isEditMode={isProfileComplete}
          isGoogleConnected={isGoogleConnected}
        />
      </div>
    </PlanProvider>
  );
}

export const metadata: Metadata = {
  title: 'Configuração de Perfil',
};
