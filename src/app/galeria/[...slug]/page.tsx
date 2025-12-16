import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
// Importa suas Server Actions e funções do Google Drive
import { getPhotosFromSession } from '@/lib/google-drive'; 
import Image from 'next/image';
// IMPORTAÇÃO CORRIGIDA: Importa o componente CLIENTE
import { PasswordPrompt } from '../../../components/PasswordPrompt'; 
import { cookies } from 'next/headers'; 
import { authenticateGaleriaAccess } from '@/actions/galeria'; // NOVO: Importa a Server Action de autenticação

// O Next.js irá tentar gerar esta página no build ou revalidar a cada 1 hora (3600 segundos)
export const revalidate = 3600; 

interface GaleriaPageProps {
  params: {
    slug: string[]; 
  };
}

// Chave do cookie de acesso (deve ser a mesma do Server Action de checagem)
const ACCESS_COOKIE_KEY = 'galeria_acesso_'; 

// =========================================================================
// FUNÇÃO AUXILIAR: Componente de Exibição de Fotos
// =========================================================================
function PhotoGrid({ galeria, photos }: { galeria: any, photos: any[] }) {
    const dateObj = new Date(galeria.date);

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            
            {/* Cabeçalho */}
            <header className="py-16 text-center px-4 bg-gray-50 border-b border-gray-200">
                <h1 className="text-5xl font-extrabold text-gray-800 mb-2">{galeria.title}</h1>
                <p className="text-gray-600 font-medium">{galeria.clientName}</p>
                <div className="flex justify-center items-center gap-3 text-gray-600 text-lg mt-2">
                    
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0l-4.243-4.243m10.121-6.121L13.414 2.9a1.998 1.998 0 00-2.828 0L6.343 6.879m10.121 4.243L13.414 15.0a1.998 1.998 0 01-2.828 0l-4.243-4.243" />
                    </svg>
                    <span className="font-semibold text-base">{galeria.location || 'Local Não Informado'}</span>
                    <span className="text-gray-400 text-base">|</span>
                    <time className="font-light text-base">{dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</time>
                </div>
            </header>

            <main className="container mx-auto px-4 py-10">
                {photos.length === 0 ? (
                <p className="text-center text-xl text-gray-500 py-16">
                    Nenhuma foto foi encontrada ou as permissões do Google Drive estão incorretas.
                </p>
                ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                    {photos.map((photo: any) => {
                    const highResUrl = photo.thumbnailLink?.replace('=s220', '=w1200-h800-c');

                    if (!highResUrl) return null;

                    return (
                        <div key={photo.id} className="relative break-inside-avoid group overflow-hidden rounded-xl shadow-md transition-shadow duration-300 hover:shadow-xl">
                            <Image
                            src={highResUrl}
                            alt={photo.name || galeria.title}
                            width={1200} 
                            height={800} 
                            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                            sizes="(max-width: 768px) 100vw, 33vw"
                            priority={false}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-black/0 group-hover:from-black/10 transition-opacity pointer-events-none" />
                        </div>
                    );
                    })}
                </div>
                )}
            </main>

            <footer className="text-center py-8 border-t text-gray-400 text-sm">
                <p>Desenvolvido com Next.js e Google Drive API. © {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
}

// =========================================================================
// COMPONENTE PRINCIPAL (Server Component)
// =========================================================================

export default async function GaleriaPage({ params }: GaleriaPageProps) {
  const fullSlug = params.slug.join('/'); 
  
  const galeria = await prisma.galeria.findUnique({
    where: { slug: fullSlug },
  });

  if (!galeria) return notFound(); 

  const isPrivate = !galeria.isPublic;
  
  // 1. Lógica de Validação de Acesso para Galerias Privadas
  if (isPrivate) {
    const accessCookie = cookies().get(ACCESS_COOKIE_KEY + galeria.id);
    
    // Se o cookie não existir ou o valor no cookie não for a senha armazenada, renderiza o prompt.
    if (!accessCookie || accessCookie.value !== galeria.password) {
        
        // Server Action que será chamada pelo componente cliente
        const setAccessCookie = async (password: string) => {
             "use server";
             // Chama a Server Action centralizada. O authenticateGaleriaAccess
             // fará o redirecionamento se for bem-sucedido.
             return authenticateGaleriaAccess(galeria.id, fullSlug, password);
        };

        return (
            <main className="min-h-screen bg-gray-100 flex items-center justify-center">
                <PasswordPrompt 
                    galeriaTitle={galeria.title} 
                    galeriaId={galeria.id} 
                    fullSlug={fullSlug} 
                />
            </main>
        );
    }
  }


  // 2. Busca e Renderiza as Fotos (Acesso Público ou Cookie Válido)
  const photos = await getPhotosFromSession(galeria.driveFolderId);
  
  // Renderiza o grid de fotos
  return <PhotoGrid galeria={galeria} photos={photos} />;
}