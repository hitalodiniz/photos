// app/page.tsx (Última tentativa de Server Component)

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase.server'; 
import LandingPageContent from '@/components/LandingPageContent'; 

// Adicione um componente de Spinner simples
const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFD] font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B57D0]"></div>
    </div>
);

export default async function HomePage() { 
    const supabase = createSupabaseServerClient();
    
    // Tenta obter o usuário
    const { data: { user }, error } = await supabase.auth.getUser();

    // Se o user for NULL na primeira execução (problema de sincronização), 
    // precisamos retornar um spinner para dar tempo ao cliente de sincronizar.
    if (!user && !error) {
        return <LoadingSpinner />;
    }
    
    // Se a checagem do servidor for BEM-SUCEDIDA, redireciona.
    if (user) {
        redirect('/app');
    }
    
    // Se não estiver logado, renderiza o conteúdo da Landing Page
    return <LandingPageContent />; 
}