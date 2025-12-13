// app/layout.tsx

import './globals.css';
import { Metadata } from 'next';
import Script from 'next/script';
import AuthStatusButton from '../components/AuthStatusButton';
import GoogleApiLoader from '../components/GoogleApiLoader';

// Definição de metadados (Mantida)
export const metadata: Metadata = {
    title: 'Sua Galeria de Fotos - O portal das suas lembranças',
    description: 'Seu momento especial, acessível a um clique. Bem-vindo à Sua Galeria de Fotos.',
};

// Declaração global para que o componente useClient (GooglePickerButton) possa escutar
declare global {
    interface Window {
        gapi: any;
        google: any;
        onGoogleLibraryLoad: () => void;
    }
}

// Variável para garantir que as libs são carregadas apenas uma vez
let gapiLoaded = false;
let gsiLoaded = false;

// Função que só avisa o componente quando AMBAS as libs estiverem prontas
const checkAndNotify = () => {
    if (gapiLoaded && gsiLoaded && window.onGoogleLibraryLoad) {
        window.onGoogleLibraryLoad();
    }
};


export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body className="bg-gray-100 text-gray-800 antialiased">
                
                {/* *** OS SCRIPTS FORAM MOVIDOS PARA DENTRO DO <body> ABAIXO DO CHILDREN *** Motivo: O `next/script` com `strategy="afterInteractive"` funciona melhor 
                  no body ou em um componente client-side, garantindo que o DOM seja 
                  renderizado antes de carregar o JS externo.
                */}
                
                <div className="bg-[#F8FAFD] p-4 lg:p-8 font-sans">

                    {/* Header (Mantido) */}
                    <div className="max-w-[1600px] mx-auto mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Ícone de Fotografia (Câmera) */}
                            <div className="w-10 h-10 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#00A651]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                    <circle cx="12" cy="13" r="4"></circle>
                                </svg>
                            </div>
                            <span className="text-2xl text-[#1F1F1F] font-medium">SUA GALERIA DE FOTOS</span>
                        </div>
                        <AuthStatusButton />
                    </div>
                    
                    {children}
                </div>

                {/* ========================================================= */}
                {/* 1. CARREGAMENTO DO GOOGLE GSI (Auth Client) */}
                {/* === SOLUÇÃO: Carregador Client-Side para APIs Google === */}
                <GoogleApiLoader />
                {/* ========================================================= */}
            </body>
        </html>
    );
}