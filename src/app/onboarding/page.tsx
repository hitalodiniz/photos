// app/onboarding/page.tsx
import { getProfileData } from '@/actions/profile';
import { redirect } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';

// Componente Cliente (o formulário de preenchimento de dados)
import OnboardingForm from './OnboardingForm';

// =========================================================================
// SERVER COMPONENT (Busca de Dados e Guarda de Segurança)
// =========================================================================

export default async function OnboardingPage() {
    // 1. Busca os dados de autenticação e perfil
    // NOTE: Esta função deve ter sido atualizada para usar a nova abordagem de autenticação
    // por Header JWT ou deve usar a leitura de cookies do Server Component, conforme a arquitetura que você escolheu.
    const { user_id, profile, email, suggestedUsername, error } = await getProfileData();

    if (error || !user_id) {
        // Se houver erro ou o usuário não estiver logado (token inválido no servidor),
        // redireciona para a raiz para o Cliente tratar o login.
        console.error("Erro ao carregar dados do perfil ou usuário deslogado:", error);
        //   redirect('/'); 
    }

    // 2. Verifica se o perfil JÁ está completo.
    // Embora o Client Guard deva evitar que chegue aqui, esta é uma guarda de segurança do Server Side.
    const isProfileComplete = profile && profile.full_name && profile.username && profile.mini_bio;

    if (isProfileComplete) {
        // Se, por algum motivo, o usuário chegar aqui com o perfil completo, redireciona para o dashboard.
        redirect('/dashboard');
    }

    // 3. Renderiza o Client Component com os dados iniciais
    return (
        <AuthGuard>
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFD]">
                <OnboardingForm
                    initialData={profile} // Dados existentes (podem ser parciais)
                    suggestedUsername={suggestedUsername}
                    email={email || "email@exemplo.com"}
                    // isEditMode será true se já existir um perfil no banco, mesmo que incompleto
                    isEditMode={isProfileComplete}
                />
            </div>
        </AuthGuard>
    );
}