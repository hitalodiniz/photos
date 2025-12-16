// app/layout.tsx (CÓDIGO REVISADO)

import './globals.css';
import { Metadata } from 'next';
import Script from 'next/script'; 
import AuthStatusButton from '../components/AuthStatusButton';

// Definição de metadados
export const metadata: Metadata = {
    title: 'Sua Galeria de Fotos - O portal das suas lembranças',
    description: 'Seu momento especial, acessível a um clique. Bem-vindo à Sua Galeria de Fotos.',
};

// Declaração global para que o componente useClient (GooglePickerButton) possa escutar
declare global {
    interface Window {
        gapi: any;
        google: any;
        // Esta função deve ser chamada quando AMBAS as libs estiverem disponíveis
        onGoogleLibraryLoad: (() => void) | undefined; 
    }
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <head>
                {/* Metadados */}
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body className="bg-gray-100 text-gray-800 antialiased">
                
                <div className="bg-[#F8FAFD] p-4 lg:p-8 font-sans">
                    {/* Header (Mantido) */}
                    <div className="max-w-[1600px] mx-auto mb-4 flex items-center justify-between">
                        {/* Ícone e Título */}
                        <div className="flex items-center gap-3">
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
                {/* CARREGAMENTO DOS SCRIPTS GOOGLE COM next/script */}
                {/* Estratégia: Carregar o mais rápido possível e garantir que a GAPI exista */}
                {/* ========================================================= */}

                {/* 1. GAPI Client Library (Usado para o Google Drive Files API e Picker) */}
                <Script 
                    src="https://apis.google.com/js/api.js" 
                    strategy="beforeInteractive" // Carrega o script antes do Next.js
                    async // Para não bloquear o carregamento
                    // No GooglePickerButton, você precisa checar window.gapi, mas não injetar o picker aqui
                />

                {/* 2. Google Identity Services (GSI) - Necessário para o Auth moderno */}
                <Script 
                    src="https://accounts.google.com/gsi/client" 
                    strategy="beforeInteractive" 
                    async // Para não bloquear
                    
                />
                
            </body>
        </html>
    );
}