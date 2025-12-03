import './globals.css';
import { Metadata } from 'next';

// Definição dos metadados da página para SEO
export const metadata: Metadata = {
  title: 'Sua Galeria - O portal das suas lembranças',
  description: 'Seu momento especial, acessível a um clique. Bem-vindo à Sua Galeria.',
  // Adicione mais metadados (og:image, keywords) conforme necessário
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Removida a classe de fonte do next/font. A fonte (Barlow) é aplicada via globals.css
    <html lang="pt-BR">
      <body className="bg-gray-100 text-gray-800 antialiased min-h-screen">
        {/* Adiciona classes básicas de fundo e texto ao body */}
        {children}
      </body>
    </html>
  );
}