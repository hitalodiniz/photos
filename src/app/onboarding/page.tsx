import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase.server'; 
import LandingPageContent from '@/components/LandingPageContent'; 
import AuthUrlCleaner from '@/components/AuthUrlCleaner'; // NOVO COMPONENTE

export default async function HomePage() { 
    // MANTEMOS A CHECAGEM RÁPIDA NO SERVIDOR
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.log("HomePage: Usuário obtido no servidor:", user);
    if (user) {
        redirect('/app');
    }
    
    // Se o servidor falhar (user: null), o componente cliente assume a guarda
    return (
        <>
            {/* O LIMPADOR DE URL DEVE EXECUTAR PRIMEIRO PARA REMOVER TOKENS DA URL */}
        
            <LandingPageContent /> 
        </>
    );
}