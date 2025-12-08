import { getProfileData } from '@/actions/profile';
import { redirect } from 'next/navigation';
// ...

export default async function AppGatewayPage() {
    
    const { profile, user_id, error } = await getProfileData();
    console.log("AppGatewayPage: profile data fetched", { profile, user_id, error });
    // 1. CHECAGEM DE AUTH (Se falhar, voltamos para o login)
    if (error || !user_id) {
        console.error("Erro no AppGateway: Forçando logoff.");
        // Se a sessão sumiu, voltamos para a raiz (HomePage), que tem a tela de login.
        redirect('/'); 
    }

    // 2. CRITÉRIO DE PERFIL INCOMPLETO
    const isProfileIncomplete = !profile || !profile.full_name || !profile.username;

    if (isProfileIncomplete) {
        // Se incompleto, envia para a página de Onboarding.
        return redirect('/onboarding');
    }

    // 3. Se o perfil estiver COMPLETO
    return redirect('/dashboard');
}