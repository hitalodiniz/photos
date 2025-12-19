// app/layout.tsx (CÓDIGO REVISADO)

import './globals.css';
import Navbar from '../components/Navbar';
import { Metadata } from 'next';
import Script from 'next/script';
import CookieBanner from '@/components/CookieBanner' // Certifique-se de que o caminho está correto

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
                <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23D4AF37' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'/><circle cx='12' cy='13' r='3'/></svg>"/>
                
            </head>
            <body className="bg-[#F1F3F4] antialiased">
                {/* A Navbar agora controla sua própria visibilidade e estilo */}
                <Navbar />
                <main className="w-full">{children}</main>
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
                {/* O Banner fica aqui para ser global */}
                <CookieBanner />
            </body>
        </html >
    );
}