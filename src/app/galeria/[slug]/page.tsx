import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getPhotosFromSession } from '@/lib/googleDrive';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

// O Next.js irá tentar gerar esta página no build ou revalidar a cada 1 hora (3600 segundos)
export const revalidate = 3600; 

interface PageProps {
  params: { slug: string };
}

// Componente para exibir um Skeleton enquanto as fotos carregam
function PhotoSkeleton() {
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="relative aspect-[3/4] mb-4 bg-gray-200 rounded-lg animate-pulse break-inside-avoid" />
      ))}
    </div>
  );
}

// Componente principal (Server Component)
export default async function GalleryPage({ params }: PageProps) {
  
  // 1. Busca os metadados da sessão (rápido, no seu banco)
  const session = await prisma.session.findUnique({
    where: { slug: params.slug },
  });

  if (!session) return notFound(); // Exibe erro 404

  // 2. Busca as fotos no Google Drive (pode ser lento, é o que queremos cachear)
  const photos = await getPhotosFromSession(session.driveFolderId);
  
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      
      {/* Cabeçalho */}
      <header className="py-16 text-center px-4 bg-gray-50 border-b border-gray-200">
        <h1 className="text-5xl font-extrabold text-gray-800 mb-2">{session.title}</h1>
        <div className="flex justify-center items-center gap-3 text-gray-600 text-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0l-4.243-4.243m10.121-6.121L13.414 2.9a1.998 1.998 0 00-2.828 0L6.343 6.879m10.121 4.243L13.414 15.0a1.998 1.998 0 01-2.828 0l-4.243-4.243" />
          </svg>
          <span className="font-semibold">{session.location || 'Local Não Informado'}</span>
          <span className="text-gray-400">|</span>
          <time className="font-light">{session.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</time>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        {photos.length === 0 ? (
          <p className="text-center text-xl text-gray-500 py-16">
            Nenhuma foto foi encontrada ou as permissões do Google Drive estão incorretas.
          </p>
        ) : (
          // Usamos 'columns' do Tailwind para o efeito Masonry (Pinterest)
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {photos.map((photo) => {
              // Ajusta o link da miniatura para uma URL de alta resolução (1200px)
              const highResUrl = photo.thumbnailLink?.replace('=s220', '=s1200');

              if (!highResUrl) return null;

              return (
                <div key={photo.id} className="relative break-inside-avoid group overflow-hidden rounded-xl shadow-md transition-shadow duration-300 hover:shadow-xl">
                  {/* O componente Image do Next.js otimiza a imagem */}
                  <Image
                    src={highResUrl}
                    alt={photo.name || session.title}
                    width={1200} 
                    height={800} 
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    priority={false} // Carrega lazy
                  />
                  {/* Overlay sutil para indicar interação ou proteção */}
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