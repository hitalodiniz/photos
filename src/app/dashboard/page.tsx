import { getGalerias } from '@/actions/galeria';
import ClientAdminWrapper from './client-wrapper';
import { Metadata } from 'next'; // Adicionado para Metadados

export const metadata: Metadata = {
  title: 'Dashboard do Fotógrafo | Sua galeria de fotos', // Nome sugerido
};

export default async function AdminPage() {

    // Buscando os dados iniciais no lado do servidor (MUITO MAIS RÁPIDO)
    const initialGalerias= await getGalerias();
    
    // Passa os dados para o componente cliente que gerencia a interatividade
    return (
        // 2. O ProfileGuard verifica e só renderiza o ClientWrapper se o perfil for válido
            <ClientAdminWrapper initialGalerias={initialGalerias} />

    );
}
