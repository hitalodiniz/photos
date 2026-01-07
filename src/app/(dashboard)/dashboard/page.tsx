// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClientReadOnly } from '@/lib/supabase.server';
import { getGalerias } from '@/core/services/galeria.service';
import ClientAdminWrapper from './ClientAdminWrapper';

export const metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  // 1. Cria a instância Supabase READ-ONLY para o servidor
  // É uma boa prática não usar 'await' na chamada da função se ela já for assíncrona
  const supabase = await createSupabaseServerClientReadOnly();

  // 2. Chama getUser() na instância correta
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Se a sessão expirou ou não existe, redireciona para login
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

  // 4. Busca galerias via SSR
  const result = await getGalerias(); // A action já busca o ID internamente no servidor

  // Se o erro for de autenticação do Google,
  // deixe o erro subir para ser capturado pelo error.tsx
  if (!result.success && result.error === 'AUTH_RECONNECT_REQUIRED') {
    throw new Error('AUTH_RECONNECT_REQUIRED');
  }

  // Extrai apenas os dados se a operação for um sucesso
  const initialGalerias = result.success ? result.data : [];

  // 5. Renderiza o Client Component com o array puro
  return <ClientAdminWrapper initialGalerias={initialGalerias || []} />;
}
