import './global.css';
import { Barlow, Montserrat } from 'next/font/google';
import { Metadata } from 'next';
import { GoogleApiLoader } from '@/components/google-drive';
import { Navbar } from '@/components/layout';
import { NavigationProvider } from '@/components/providers/NavigationProvider';
import { SidebarProvider } from '@/components/providers/SidebarProvider';
import { CookieBanner } from '@/components/ui';
import { AuthProvider } from '@photos/core-auth';
import { ThemeSwitcher } from '@/components/debug/ThemeSwitcher';
import { getThemeFavicon } from '@/core/utils/get-theme-favicon';
import { SEGMENT_DICTIONARY, SegmentType } from '@/core/config/segments';
import Script from 'next/script';

// 🎯 Lógica de Servidor para Metadados
const segment =
  (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER';
const terms = SEGMENT_DICTIONARY[segment];
const faviconUrl = getThemeFavicon(segment);

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL!),
  alternates: { canonical: '/' },
  title: {
    // 1. O nome puro para a Home
    default: terms.site_name,
    // 2. O template para as subpáginas
    template: `%s - ${terms.site_name}`,
  },
  description: terms.site_description,
  icons: {
    icon: [{ url: faviconUrl, type: 'image/svg+xml' }],
    shortcut: faviconUrl,
    apple: faviconUrl,
  },
};

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} ${barlow.variable}`}
      suppressHydrationWarning // 🎯 Necessário para o script de injeção
    >
      <head>
        {/* 🎯 Injeção do LocalStorage para evitar o "Flash" de tema */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var seg = localStorage.getItem('debug-segment') || '${segment}';
                  document.documentElement.setAttribute('data-segment', seg);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased font-sans bg-luxury-bg text-petroleum">
        <AuthProvider>
          <NavigationProvider>
            <SidebarProvider>
              <Navbar />
              <main id="main-content" className="w-full">
                {children}
              </main>
              <GoogleApiLoader />
              <CookieBanner />
              {/* <ThemeSwitcher /> */}
            </SidebarProvider>
          </NavigationProvider>
        </AuthProvider>

        {/* Script do Tawk.to - Carregamento assíncrono para não afetar o SEO/Performance
        <Script id="tawk-to" strategy="afterInteractive">
          {`
    var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
    (function(){
      var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
      s1.async=true;
      s1.src='https://embed.tawk.to/69a0a64b639b701c37e9e362/1jidoj5um';
      s1.charset='UTF-8';
      s1.setAttribute('crossorigin','*');
      s0.parentNode.insertBefore(s1,s0);
    })();
  `}
        </Script> */}
      </body>
    </html>
  );
}
