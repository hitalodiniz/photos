'use client';
import { Camera, ArrowLeft, FileText, Globe, UserCheck, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EditorialHeader, DynamicHeroBackground, Footer } from '@/components/layout';
import { FeatureItem } from '@/components/ui';

export default function TermosDeUsoPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      {/* BACKGROUND FIXO PADRONIZADO */}
      <DynamicHeroBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Termos de Uso"
          subtitle={<>Regras e diretrizes para uma <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">experiência profissional</span></>}
        />
        {/* CONTEÚDO NO CONTAINER BRANCO PADRONIZADO */}
        <main className="flex-grow flex items-center justify-center py-10">
          <section className="w-full max-w-5xl mx-auto bg-white/90 backdrop-blur-xl 
          rounded-[3rem] md:rounded-[4rem] p-6 md:p-12 shadow-2xl border border-white/50">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-y-6 px-2 md:px-6">

              <FeatureItem
                icon={<UserCheck size={30} />}
                title="Aceitação dos Termos"
                desc="Ao acessar e utilizar esta plataforma, você concorda integralmente com estas diretrizes. O serviço é destinado a fotógrafos profissionais que buscam otimizar a entrega de arquivos via Google Drive™."
              />

              <FeatureItem
                icon={<Globe size={30} />}
                title="Licença de Uso"
                desc="Concedemos uma licença limitada e revogável para utilizar nossa interface de galeria. Você retém todos os direitos sobre suas imagens, sendo responsável pelo conteúdo hospedado em sua conta Google."
              />

              <FeatureItem
                icon={<ShieldAlert size={30} />}
                title="Responsabilidade do Usuário"
                desc="O usuário é o único responsável pela gestão de suas credenciais de acesso e pela legalidade das fotos publicadas em suas galerias, isentando a plataforma de qualquer uso indevido de terceiros."
              />

              <FeatureItem
                icon={<FileText size={30} />}
                title="Modificações no Serviço"
                desc="Reservamos o direito de atualizar funcionalidades ou ajustar termos para refletir melhorias técnicas ou mudanças legais, sempre visando a estabilidade e segurança da sua galeria profissional."
              />

            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}