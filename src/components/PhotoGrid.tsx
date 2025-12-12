// components/PhotoGrid.tsx

import Image from 'next/image';
import { mockPhotos } from '@/mocks/data'; // Importa os dados mockados

// Tipagens mockadas
interface GaleriaData {
    title: string;
    clientName: string;
    location: string | null;
    date: Date | string;
}

interface PhotoItem {
    id: string;
    name: string;
    optimizedUrl: string; 
    width: number;
    height: number;
}

interface PhotoGridProps {
    galeria: GaleriaData;
    photos: PhotoItem[];
}

/**
 * Componente Server MOCKADO para exibir o grid de fotos.
 */
export function PhotoGrid({ galeria, photos }: PhotoGridProps) {
    
    // Simulação da formatação de data
    const dateObj = new Date(galeria.date);
    const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // Use os dados mockados se a lista de fotos estiver vazia (em um cenário real, isso seria desnecessário)
    const displayPhotos = photos.length > 0 ? photos : mockPhotos;

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            
            {/* Cabeçalho */}
            <header className="py-12 md:py-16 text-center px-4 bg-gray-50 border-b border-gray-200">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 mb-1">{galeria.title}</h1>
                <p className="text-xl text-gray-600 font-medium mb-4">{galeria.clientName}</p>
                
                {/* Metadados */}
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-gray-600 text-sm md:text-lg mt-2">
                    
                    {galeria.location && (
                        <span className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0l-4.243-4.243m10.121-6.121L13.414 2.9a1.998 1.998 0 00-2.828 0L6.343 6.879m10.121 4.243L13.414 15.0a1.998 1.998 0 01-2.828 0l-4.243-4.243" />
                            </svg>
                            <span className="font-semibold text-base">{galeria.location}</span>
                        </span>
                    )}
                    
                    {galeria.location && <span className="text-gray-400 text-base hidden md:inline">|</span>}
                    
                    <time className="font-light text-base">{formattedDate}</time>
                </div>
                
                {/* CTA */}
                <div className="mt-8">
                    <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300">
                        <span className="mr-2">⭐</span> Marcar Favoritas
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-10">
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                    {displayPhotos.map((photo) => (
                        <div 
                            key={photo.id} 
                            className="relative break-inside-avoid group overflow-hidden rounded-xl shadow-md transition-shadow duration-300 hover:shadow-xl cursor-pointer"
                        >
                            <Image
                                src={photo.optimizedUrl}
                                alt={photo.name || galeria.title}
                                width={photo.width} 
                                height={photo.height} 
                                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                sizes="(max-width: 768px) 100vw, 33vw"
                                priority={false} 
                            />
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-black/0 group-hover:from-black/10 transition-opacity pointer-events-none" />

                            <button className="absolute top-3 right-3 p-2 bg-white/70 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="text-center py-8 border-t text-gray-400 text-sm bg-gray-50">
                <p>Desenvolvido por Seu App. © {new Date().getFullYear()}</p>
                <p>Powered by Google Drive API</p>
            </footer>
        </div>
    );
}