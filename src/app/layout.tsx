import './global.css';
import { Barlow, Montserrat } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import { Metadata } from 'next';
import { CookieBanner } from '@/components/ui';
import { AuthProvider } from '@photos/core-auth';
import { Analytics } from "@vercel/analytics/next"
import GoogleApiLoader from '@/components/google-drive/GoogleApiLoader';
import { NavigationProvider } from '@/components/providers/NavigationProvider';

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
    // O Next.js gerencia viewport automaticamente, mas se quiser fixar:
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  robots: 'index, follow',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23F3E5AB' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'/><circle cx='12' cy='13' r='3'/></svg>",
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
      {/* 4. A classe inter.className no body garante que todo o texto herde a Inter por padrão */}
      <body className={`${montserrat.className} bg-luxury-bg antialiased`}>
        <AuthProvider>
          <NavigationProvider>
            <Navbar />
            <main id="main-content" className="w-full">
              {children}
            </main>

            <GoogleApiLoader />

            <CookieBanner />
          </NavigationProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
