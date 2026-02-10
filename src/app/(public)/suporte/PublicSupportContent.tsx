'use client';

import { useState } from 'react';
import {
  Cpu,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';

import { useSegment } from '@/hooks/useSegment';
import { getSEOBySegment } from '@/core/config/seo.config';
import { SEGMENT_DICTIONARY } from '@/core/config/segments';
import EditorialView from '@/components/layout/EditorialView';
import { PLANS_BY_SEGMENT, PlanKey } from '@/core/config/plans';

export default function PublicSupportContent() {
  const { segment } = useSegment();
  const seo = getSEOBySegment(segment);
  const terms = SEGMENT_DICTIONARY[segment]; // 🎯 Captura os termos do segmento atual

  // 2. Filtra os planos exclusivos do segmento ativo (ex: CAMPAIGN, OFFICE, etc)
  const segmentPlans =
    PLANS_BY_SEGMENT[segment as keyof typeof PLANS_BY_SEGMENT]; //
  const planosKeys = Object.keys(segmentPlans) as PlanKey[];

  // 3. Pegue os nomes reais dos planos (normalmente os dois últimos são os pagos)
  // Ex: Se for OFFICE, pode ser 'Gabinete' e 'Mandato' em vez de PRO e PREMIUM
  const planProName =
    segmentPlans[planosKeys[planosKeys.length - 2]]?.name || 'PRO'; //
  const planPremiumName =
    segmentPlans[planosKeys[planosKeys.length - 1]]?.name || 'PREMIUM'; //

  const [openQ, setOpenQ] = useState<string | null>(null);

  // 🎯 FAQ Dinâmico baseado nos termos do dicionário
  const publicFaq = [
    {
      category: 'Tecnologia',
      icon: <Cpu size={20} />,
      questions: [
        {
          q: `Como funciona o espelhamento do Google Drive™?`,
          a: `Nossa tecnologia não exige upload manual. Ao vincular uma pasta, o sistema cria um portal direto para seus arquivos. Qualquer ${terms.item} adicionada ou removida no seu Drive reflete instantaneamente na galeria final.`,
        },
        {
          q: 'O usuário final precisa baixar algum aplicativo?',
          a: 'Não. A experiência é 100% web-app. O acesso é feito por um link elegante que abre em qualquer navegador, com interface otimizada para smartphones e desktops.',
        },
      ],
    },
    {
      category: 'Segurança',
      icon: <ShieldCheck size={20} />,
      questions: [
        {
          q: 'O sistema tem acesso a todos os meus arquivos?',
          a: 'Não. Você concede permissão apenas para as pastas que escolher através do selecionador de arquivos do Google Drive. Seus outros documentos e pastas permanecem totalmente invisíveis para a plataforma.',
        },
        {
          q: 'Como funciona a proteção das galerias?',
          a: `Você pode definir senhas numéricas para cada trabalho. Além disso, oferecemos cadastro de visitantes para que você saiba exatamente quem acessou seu conteúdo de ${terms.items}.`,
        },
      ],
    },
    {
      category: 'Planos',
      icon: <Zap size={20} />,
      questions: [
        {
          q: 'Posso começar gratuitamente?',
          a: `Sim. Oferecemos um plano permanente para quem está começando, permitindo criar ${terms.items} com limites básicos e recursos de design padrão.`,
        },
        {
          q: 'Como funcionam os upgrades?',
          a: `Ao assinar um plano ${planProName} ou ${planPremiumName}, você libera recursos como download de ${terms.items} em alta resolução, carrossel de capas, slideshow e remoção da nossa marca.`,
        },
      ],
    },
  ];

  return (
    <EditorialView
      title="Tecnologia & Suporte"
      subtitle={
        <span>
          Conheça a engenharia por trás de <strong>{terms.identity}</strong>.
        </span>
      }
    >
      <div className="max-w-4xl mx-auto px-4 relative z-20">
        <div className="space-y-12">
          {publicFaq.map((section) => (
            <section key={section.category} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                <div className="text-gold">{section.icon}</div>
                <h2 className="text-[12px] font-bold uppercase tracking-luxury-widest text-petroleum">
                  {section.category}
                </h2>
              </div>

              <div className="grid gap-3">
                {section.questions.map((item) => (
                  <div
                    key={item.q}
                    className="bg-white rounded-luxury border border-slate-200 overflow-hidden shadow-sm"
                  >
                    <button
                      onClick={() => setOpenQ(openQ === item.q ? null : item.q)}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm font-bold text-petroleum">
                        {item.q}
                      </span>
                      <div className="text-gold">
                        {openQ === item.q ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </div>
                    </button>

                    {openQ === item.q && (
                      <div className="px-5 pb-5 pt-0 animate-in fade-in slide-in-from-top-2">
                        <p className="text-sm text-slate-600 leading-relaxed ">
                          {item.a}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* 🎯 Call to Action Final Dinâmico */}
        <div className="mt-16 p-8 bg-petroleum rounded-luxury text-center space-y-6 shadow-2xl">
          <h3 className="text-champagne font-bold uppercase tracking-widest text-sm">
            Pronto para elevar o nível das suas entregas?
          </h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Junte-se a milhares de profissionais que já automatizaram seu fluxo
            de trabalho com <strong>{seo.brandName}</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-gold text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-champagne transition-all">
              {segment === 'PHOTOGRAPHER'
                ? 'Criar Galeria Grátis'
                : 'Começar Agora'}
            </button>
            <button className="px-8 py-3 bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-white/20 transition-all">
              Ver Planos PRO
            </button>
          </div>
        </div>
      </div>
    </EditorialView>
  );
}
