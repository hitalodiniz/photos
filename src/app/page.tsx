// app/page.tsx (Última tentativa de Server Component)

import { redirect } from 'next/navigation';
import LandingPageContent from '@/components/LandingPageContent'; 

// Adicione um componente de Spinner simples
const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFD] font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B57D0]"></div>
    </div>
);

export default async function HomePage() { 
    return <LandingPageContent />; 
}