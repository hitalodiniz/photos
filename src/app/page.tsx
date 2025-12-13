// app/page.tsx (Home Page Principal com Checagem de Autenticação Server-Side)

import { redirect } from 'next/navigation';
import LandingPageContent from '@/components/LandingPageContent'; 

// Importe sua função de criação do cliente Supabase para o servidor
// ATENÇÃO: Verifique o caminho real no seu projeto!
import { createSupabaseServerClient } from "@/lib/supabase.server"; 

// Adicione um componente de Spinner simples
const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFD] font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B57D0]"></div>
    </div>
);

export default async function HomePage() {
  return <LandingPageContent />;
}