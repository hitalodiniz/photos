'use client';

import {
  FileText,
  Globe,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import { usePageTitle } from '@/hooks/usePageTitle';
import EditorialCard from '@/components/ui/EditorialCard';

export default function TermosDeUsoPage() {
  usePageTitle('Termos de Uso');

  const termosItems = [
    {
      icon: <UserCheck />,
      title: 'Aceitação',
      summary:
        'Ao utilizar o app, você concorda com nossas diretrizes profissionais.',
      desc: 'Este serviço é um visualizador de mídia otimizado. Ao prosseguir, você declara estar ciente de que a plataforma atua como uma interface para seus arquivos hospedados no Google Drive™.',
    },
    {
      icon: <Globe />,
      title: 'Propriedade',
      summary: 'Você mantém 100% dos direitos intelectuais sobre suas imagens.',
      desc: 'Nossa tecnologia atua como um espelhamento dinâmico. A disponibilidade das fotos depende exclusivamente da manutenção das permissões em sua conta pessoal do Google.',
    },
    {
      icon: <ShieldCheck />,
      title: 'Segurança LGPD',
      badge: 'Importante',
      isHighlight: true,
      summary: 'Segurança e conformidade com a proteção de dados.',
      desc: 'Não armazenamos suas fotos em servidores próprios. O tráfego é criptografado e as credenciais de acesso seguem os protocolos rigorosos da Lei Geral de Proteção de Dados.',
    },
    {
      icon: <ShieldAlert />,
      title: 'Uso de Planos',
      summary:
        'Recursos avançados são vinculados ao nível de assinatura contratado.',
      desc: 'O acesso a funcionalidades extras como Customizações e Downloads em Alta Resolução é determinado pelo plano ativo. O uso indevido resultará em suspensão imediata.',
    },
    {
      icon: <UserCheck />,
      title: 'Responsabilidade',
      summary: 'O profissional é o único gestor de seus conteúdos e acessos.',
      desc: 'Cabe ao usuário garantir que a divulgação das mídias respeite os direitos de imagem e os acordos firmados com seus clientes finais.',
    },
    {
      icon: <FileText />,
      title: 'Modificações',
      summary:
        'Termos atualizados periodicamente para refletir melhorias técnicas.',
      desc: 'Reservamos o direito de ajustar estes termos para garantir estabilidade. Recomendamos a consulta regular desta página para manter-se informado.',
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black font-montserrat">
      <DynamicHeroBackground />

      {/* Overlay de Proteção para Contraste Editorial */}
      <div className="fixed inset-0 z-0 from-petroleum/40 via-petroleum/95 to-petroleum z-[1]" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Termos de Uso"
          subtitle={
            <>
              Diretrizes para uma{' '}
              <span className="font-semibold border-b border-gold/50 text-white italic">
                experiência editorial segura
              </span>
            </>
          }
        />

        <main className="flex-grow py-12 px-6 max-w-[1600px] mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
            {termosItems.map((item, index) => (
              <EditorialCard
                key={index}
                title={item.title}
                icon={item.icon}
                badge={item.badge}
                isHighlighted={item.isHighlight}
              >
                {/* Estrutura interna específica para Termos */}
                <p className="text-[13px] leading-relaxed text-petroleum/80 font-medium italic mb-4">
                  {item.summary}
                </p>

                <p className="text-[13px] leading-relaxed text-petroleum/70 font-medium">
                  {item.desc}
                </p>

                <div className="mt-auto pt-4 flex justify-center">
                  <div className="w-8 h-0.5 bg-gold/20" />
                </div>
              </EditorialCard>
            ))}
          </div>

          {/* Rodapé informativo do protocolo */}
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-4 bg-white/10 border border-white/10 px-8 py-4 rounded-luxury backdrop-blur-xl">
              <ShieldCheck size={18} className="text-gold" />
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
                Termos atualizados em janeiro de 2026
              </span>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
