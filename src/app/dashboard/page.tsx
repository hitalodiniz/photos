// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getGalerias } from '@/actions/galeria';
import ClientAdminWrapper from './client-wrapper';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard do Fotógrafo | Sua galeria de fotos',
};

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();

  // 1. Usuário autenticado (validado pelo Supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // 2. Busca o perfil via RLS
  const { data: profile, error: profileError } = await supabase
    .from('tb_profiles')
    .select('full_name, username, mini_bio, studio_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Erro ao carregar perfil no SSR:', profileError);
    redirect('/onboarding');
  }

  // 3. Verifica se o perfil está completo
  const isProfileComplete =
    profile?.full_name && profile?.username && profile?.mini_bio;

  if (!isProfileComplete) {
    redirect('/onboarding');
  }

  // 4. Busca galerias via SSR (com RLS)
  const initialGalerias = await getGalerias(user.id);

  // 5. Renderiza o Client Component com dados SSR
  return (
    <ClientAdminWrapper
      profile={profile}
      initialGalerias={initialGalerias}
    />
  );
}
