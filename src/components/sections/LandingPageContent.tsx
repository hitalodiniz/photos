'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Cloud,
  Smartphone,
  Search,
  Grid,
  Users,
  MessageCircle,
  ArrowRight,
  RefreshCw,
  LogIn,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

import EditorialCard from '../ui/EditorialCard';
import EditorialView from '../layout/EditorialView';
import { authService } from '@photos/core-auth';
import { useSegment } from '@/hooks/useSegment';
import { PLANS_BY_SEGMENT } from '@/core/config/plans';

const STORAGE_KEY = '@suagaleria:active-tab';

export default function LandingPageContent() {
  const { terms, segment, SegmentIcon } = useSegment();
  const [userType, setUserType] = useState<'explorer' | 'photographer'>(
    'explorer',
  );
  const [isDecided, setIsDecided] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setIsDecided(true);
      setUserType(saved as any);
    }
  }, []);

  // Busca o preço do plano inicial dinamicamente
  const startingPrice = useMemo(() => {
    const segmentPlans = PLANS_BY_SEGMENT[segment];
    // Buscamos o valor do plano 'START' ou o primeiro disponível
    const startPlan = segmentPlans['START'] || Object.values(segmentPlans)[0];
    return startPlan?.price || '29';
  }, [segment]);

  const handleTypeSelection = (type: 'explorer' | 'photographer') => {
    setUserType(type);
    localStorage.setItem(STORAGE_KEY, type);
    setIsDecided(true);
    if (type === 'explorer') {
      document
        .getElementById('explore-section')
        ?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const benefits = useMemo(
    () => [
      {
        title: `Sua galeria de ${terms.items} entregam mais`,
        accent: 'gold',
        items: [
          `Cada ${terms.item} importa`,
          'Qualidade superior ao Instagram e Whatsapp',
          `Protege suas ${terms.items} no formato original`,
          'Subiu no Drive, está na galeria em tempo real',
        ],
      },
      {
        title: 'A galeria fica na sua nuvem',
        accent: 'petroleum',
        items: [
          'Hospedagem direta no seu Google Drive™',
          'Acesso protegido pela autenticação do Google™',
          'Acesso quando e onde quiser',
          'Sem barreiras ou limites de upload',
        ],
      },
      {
        title: 'Acessível e para todos',
        accent: 'gold',
        items: [
          `Planos a partir de R$ ${startingPrice}/mês`,
          'Interface descomplicada',
          'Suporte profissional incluído',
          'Experiência fluida e elegante no celular',
        ],
      },
    ],
    [terms],
  );

  const cardModo = useMemo(() => {
    if (!isDecided) {
      return (
        <div className="absolute top-[15%] md:top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 md:-translate-y-3/4 w-full max-w-2xl px-4 md:px-6 z-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 animate-in fade-in zoom-in-95 duration-700">
            <button
              onClick={() => handleTypeSelection('explorer')}
              className="group bg-slate-50 border border-white/10 p-4 md:p-6 rounded-3xl hover:border-gold/50 transition-all shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 md:p-3 bg-white/5 rounded-2xl group-hover:bg-gold transition-colors">
                  <Grid
                    className="text-petroleum group-hover:text-petroleum"
                    size={24}
                  />
                </div>
                <div className="text-left">
                  <h3 className="text-petroleum font-semibold text-sm md:text-base">
                    Quero Explorar
                  </h3>
                  <p className="text-petroleum/60 font-semibold text-[9px] md:text-[10px] uppercase tracking-widest">
                    Ver portfólios
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleTypeSelection('photographer')}
              className="group bg-gold p-4 md:p-6 rounded-3xl hover:scale-[1.02] transition-all shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 md:p-3 rounded-2xl">
                  <SegmentIcon className="text-petroleum" size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-petroleum font-semibold text-sm md:text-base">
                    Sou {terms.singular}
                  </h3>
                  <p className="text-petroleum/60 font-semibold text-[9px] md:text-[10px] uppercase tracking-widest">
                    Criar minha galeria
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      );
    }
    return null;
  }, [isDecided, terms, handleTypeSelection]);

  const compactSelector = useMemo(() => {
    if (!isDecided) return null;
    return (
      <div className="inline-flex bg-white/10 backdrop-blur-sm border border-white/20 p-1 rounded-full shadow-2xl scale-90 md:scale-100">
        <button
          onClick={() => handleTypeSelection('explorer')}
          className={`px-3 py-1.5 rounded-full text-[9px] md:text-[10px] font-semibold transition-all ${userType === 'explorer' ? 'bg-gold text-petroleum' : 'text-white/70'}`}
        >
          MODO EXPLORAR
        </button>
        <button
          onClick={() => handleTypeSelection('photographer')}
          className={`px-3 py-1.5 rounded-full text-[9px] md:text-[10px] font-semibold transition-all ${userType === 'photographer' ? 'bg-white text-petroleum' : 'text-white/70'}`}
        >
          MODO {terms.singular.toUpperCase()}
        </button>
      </div>
    );
  }, [isDecided, userType, terms, handleTypeSelection]);

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <EditorialView
      title={terms.site_name}
      subtitle={terms.heroSubtitle(segment)}
      altura="h-[75vh] md:h-[65vh]"
      showHeroAction={userType === 'photographer'}
      sectionSubtitle={terms.sectionSubtitle(userType)}
      sectionDescription={terms.sectionDescription(userType, terms)}
      heroCustomAction={cardModo}
      heroSecondaryAction={compactSelector}
    >
      <div className="px-2 md:px-0">
        {userType === 'explorer' ? (
          <div className="space-y-4 md:space-y-12 animate-in fade-in duration-500 md:-mt-32">
            <div className="flex flex-col md:flex-row gap-2 max-w-2xl ml-auto bg-white p-1.5 rounded-2xl border md:border-none shadow-lg md:shadow-none">
              <div className="flex-1 flex items-center relative group">
                <Search
                  size={18}
                  className="absolute left-4 text-slate-400 z-10"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Busca (Ex: Casamento...)"
                  className="w-full bg-slate-50/50 py-3 md:py-2.5 !pl-9 pr-10 md:!h-14 md:!text-[14px] outline-none text-petroleum text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 p-1 rounded-full text-slate-400"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                )}
              </div>
              <button className="bg-petroleum text-white px-6 py-3 md:py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2">
                <span>Buscar</span>
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="group bg-white rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm"
                >
                  <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                    <div className="absolute top-3 left-3 z-10">
                      <span className="bg-white/80 backdrop-blur-md px-2 py-1 rounded-full text-[8px] md:text-[9px] font-bold text-petroleum uppercase">
                        Ensaio
                      </span>
                    </div>
                  </div>
                  <div className="p-4 md:p-6 flex justify-between items-center bg-white">
                    <div className="space-y-1">
                      <h4 className="font-bold text-petroleum text-base md:text-lg">
                        Galeria Exemplo {i}
                      </h4>
                      <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-tighter">
                        Ver portfólio completo
                      </p>
                    </div>
                    <button className="p-2 md:p-3 bg-slate-50 text-slate-400 rounded-full border border-slate-100">
                      <MessageCircle size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16">
              {benefits.map((benefit, idx) => (
                <EditorialCard
                  key={idx}
                  {...benefit}
                  icon={
                    [
                      <Camera key="c" />,
                      <Cloud key="cl" />,
                      <Smartphone key="s" />,
                    ][idx]
                  }
                  accentColor={benefit.accent}
                />
              ))}
            </div>

            <div className="mt-10">
              {/* 🎯 Container Principal com bg-petroleum e bordas arredondadas de luxo */}
              <div className="max-w-4xl mx-auto relative overflow-hidden bg-petroleum border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl">
                {/* 🌊 Efeito de gradiente radial sutil para profundidade */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  {/* 🏷️ Badge em Champagne com fundo translúcido */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-champagne text-[10px] font-semibold uppercase tracking-widest mb-6 border border-white/5">
                    <Sparkles size={11} className="text-gold" /> Portfólio
                    Profissional
                  </div>

                  {/* ✍️ Título em Champagne Italic */}
                  <h3 className="text-xl md:text-3xl font-semibold text-champagne italic mb-4">
                    Pronto para transformar sua entrega?
                  </h3>

                  {/* 📄 Descrição em branco suave com destaque em Champagne */}
                  <p className="text-white/70 mb-8 text-xs md:text-base leading-relaxed max-w-lg">
                    Crie galerias elegantes usando apenas seu{' '}
                    <span className="font-semibold text-champagne">
                      Google Drive™
                    </span>
                    .
                  </p>

                  {/* 🔘 Botão de Ação em Gold (Padrão de conversão) */}
                  <button
                    onClick={async () => {
                      try {
                        await authService.signInWithGoogle(true);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="bg-gold text-black px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 w-full md:w-auto hover:bg-champagne transition-all shadow-lg active:scale-95 group"
                  >
                    <LogIn
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                    <span className="text-[11px] uppercase tracking-widest">
                      Começar com Google Drive
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </EditorialView>
  );
}
