'use client';
import { ShieldCheck, Database, Share2, Lock } from 'lucide-react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import { FeatureItem } from '@/components/ui';

export default function PrivacidadePage() {
  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      {/* BACKGROUND FIXO PADRONIZADO */}
      <DynamicHeroBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Privacidade e Transparência"
          subtitle={
            <>
              Compromisso com a{' '}
              <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">
                segurança dos seus dados
              </span>
            </>
          }
        />
        {/* CONTEÚDO COM ESTILO ORIGINAL DE ITENS */}
        <main className="flex-grow flex items-center justify-center">
          <section
            className="w-full max-w-5xl mx-auto bg-white/90 backdrop-blur-xl 
          rounded-[3rem] md:rounded-[4rem] p-6 md:p-12 shadow-2xl border border-white/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-1 gap-y-6 px-2 md:px-6">
              <FeatureItem
                icon={<Share2 size={30} />}
                title="Uso de Dados do Google Drive™"
                desc="Ao conectar sua conta, solicitamos acesso ao escopo auth/drive para automatizar a experiência do fotógrafo. Nossa plataforma utiliza essa permissão estritamente para configurar permissões de visualização e listar imagens via links diretos."
              />

              <FeatureItem
                icon={<Database size={30} />}
                title="Sua Propriedade Intelectual"
                desc="Nossa plataforma não realiza o download, cópia ou armazenamento permanente de suas fotos em servidores próprios. Atuamos como um espelhamento dinâmico: as imagens permanecem hospedadas no seu Google Drive™."
              />

              <FeatureItem
                icon={<Lock size={30} />}
                title="Segurança do Cliente Final"
                desc="Para galerias privadas, implementamos uma camada de autenticação via senha protegida por cookies técnicos que servem apenas para validar o acesso e expiram automaticamente em 24 horas."
              />

              <FeatureItem
                icon={<ShieldCheck size={30} />}
                title="Conformidade com a LGPD"
                desc="Em total conformidade com a Lei Geral de Proteção de Dados (LGPD), garantimos que nenhum dado pessoal ou biométrico contido nas fotos é coletado ou processado por nossa inteligência de dados."
              />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
