import './global.css';
import { Inter, Barlow, Montserrat } from 'next/font/google';
import Navbar from '../components/layout/Navbar';
import { Metadata } from 'next';
import Script from 'next/script';
import { CookieBanner } from '@/components/ui';
import { AuthProvider } from '@/contexts/AuthContext';

// 2. Configuração com mais pesos para suportar títulos e botões
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
});

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-barlow',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL!),
  alternates: {
    canonical: '/',
  },
  title: {
    default: process.env.NEXT_PUBLIC_TITLE_DEFAULT || 'Sua Galeria',
    template: '%s | Sua Galeria',
  },
  description:
    'Seu momento especial, acessível a um clique. Bem-vindo à Sua Galeria.',
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
    <html lang="pt-BR" className={`${montserrat.variable} ${barlow.variable}`}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      {/* 4. A classe inter.className no body garante que todo o texto herde a Inter por padrão */}
      <body className={`${montserrat.className} bg-[#F1F3F4] antialiased`}>
        <AuthProvider>
          <Navbar />
          <main id="main-content" className="w-full">
            {children}
          </main>

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
