import './globals.css';
import { Metadata } from 'next';
import AuthStatusButton from '../components/AuthStatusButton'; // Importe o componente de status de autenticação

// Definição dos metadados da página para SEO
export const metadata: Metadata = {
  title: 'Sua Galeria de Fotos - O portal das suas lembranças',
  description: 'Seu momento especial, acessível a um clique. Bem-vindo à Sua Galeria de Fotos.',
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
        <div className="min-h-screen bg-[#F8FAFD] p-4 lg:p-8 font-sans">

          {/* Header estilo Google Drive (Mantido para contexto do tema) */}
          <div className="max-w-[1600px] mx-auto mb-8 flex items-center justify-between">
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
      </body>
    </html>
  );
}