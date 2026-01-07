// app/layout.tsx
import './global.css';
import { Inter, Playfair_Display, Barlow } from 'next/font/google';
import Navbar from '../components/layout/Navbar';
import { Metadata } from 'next';
import Script from 'next/script';
import { CookieBanner } from '@/components/ui';
import { AuthProvider } from '@/contexts/AuthContext';

// 1. Configuração das fontes (Next.js as baixa e serve localmente)
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
});

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-barlow',
});

// app/layout.tsx

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_TITLE_DEFAULT, // Título da Home
    template: '%s | Sua Galeria de Fotos', // O %s recebe o título da página interna
  },
  description:
    'Seu momento especial, acessível a um clique. Bem-vindo à Sua Galeria de Fotos.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23D4AF37' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'/><circle cx='12' cy='13' r='3'/></svg>",
  },
};

declare global {
  interface Window {
    gapi: any;
    google: any;
    onGoogleLibraryLoad: (() => void) | undefined;
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${playfair.variable} ${barlow.variable}`}
    >
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* LightGallery CSS via CDN - Resolve o SyntaxError do Webpack definitivamente */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/lightgallery/2.7.2/css/lightgallery-bundle.min.css"
        />
      </head>
      <body className={`${inter.className} bg-[#F1F3F4] antialiased`}>
        <AuthProvider>
          <Navbar />
          <main id="main-content" className="w-full">
            {children}
          </main>

          {/* SCRIPTS GOOGLE */}
          <Script
            src="https://apis.google.com/js/api.js"
            strategy="beforeInteractive"
          />
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="beforeInteractive"
          />

          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
