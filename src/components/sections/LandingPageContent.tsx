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
import { div } from 'framer-motion/client';
import { authService } from '@photos/core-auth';

const STORAGE_KEY = '@suagaleria:active-tab';

export default function LandingPageContent() {
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
    setIsDecided(false);
  }, []);

  const handleTypeSelection = (type: 'explorer' | 'photographer') => {
    setUserType(type);
    localStorage.setItem(STORAGE_KEY, type);
    setIsDecided(true); // Compacta a interface imediatamente

    if (type === 'explorer') {
      document
        .getElementById('explore-section')
        ?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const benefits = useMemo(
    () => [
      {
        title: 'Suas fotos rendem mais',
        accent: '#B8860B',
        items: [
          'Toda foto importa',
          'Qualidade superior ao Instagram',
          'Protege suas memórias em alta resolução',
          'Subiu no Drive, está na galeria em tempo real',
        ],
      },
      {
        title: 'A galeria fica na sua nuvem',
        accent: '#1a363d',
        items: [
          'Hospedagem direta no seu Google Drive™',
          'Acesso protegido pela autenticação do Google™',
          'Acesso quando e onde quiser',
          'Sem barreiras ou limites de upload',
        ],
      },
      {
        title: 'Acessível e para todos',
        accent: '#B8860B',
        items: [
          'Planos a partir de R$ 29/mês',
          'Interface descomplicada',
          'Suporte profissional incluído',
          'Experiência fluida e elegante no celular',
        ],
      },
    ],
    [],
  );

  const cardModo = useMemo(() => {
    if (!isDecided) {
      return (
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-3/4 w-full max-w-2xl px-6 z-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-700">
            <button
              onClick={() => handleTypeSelection('explorer')}
              className="group bg-slate-50  border border-white/10 px-6 rounded-3xl hover:border-gold/50 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-gold transition-colors">
                  <Grid
                    className="text-petroleum group-hover:text-petroleum"
                    size={32}
                  />
                </div>
                <div className="text-left">
                  <h3 className="text-petroleum font-semibold">
                    Quero Explorar
                  </h3>
                  <p className="text-petroleum/60 font-semibold text-[10px] uppercase tracking-widest">
                    Ver portfólios
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleTypeSelection('photographer')}
              className="group bg-gold p-6 rounded-3xl hover:scale-[1.02] transition-all shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-3  rounded-2xl">
                  <Camera className="text-petroleum" size={32} />
                </div>
                <div className="text-left">
                  <h3 className="text-petroleum font-semibold">
                    Sou Fotógrafo
                  </h3>
                  <p className="text-petroleum/60 font-semibold  text-[10px] uppercase tracking-widest">
                    Criar minha galeria
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      );
    }
    return null; // Não renderiza nada no CustomAction se já decidiu
  }, [isDecided, handleTypeSelection]);

  // 🎯 Nova constante para o seletor compacto
  const compactSelector = useMemo(() => {
    if (!isDecided) return null;

    return (
      <div className="inline-flex bg-white/10 backdrop-blur-sm border border-white/20 p-1 rounded-full shadow-2xl">
        <button
          onClick={() => handleTypeSelection('explorer')}
          className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${
            userType === 'explorer'
              ? 'bg-gold text-petroleum'
              : 'text-white/70 hover:text-white'
          }`}
        >
          MODO EXPLORAR
        </button>
        <button
          onClick={() => handleTypeSelection('photographer')}
          className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${
            userType === 'photographer'
              ? 'bg-white text-petroleum'
              : 'text-white/70 hover:text-white'
          }`}
        >
          MODO FOTÓGRAFO
        </button>
      </div>
    );
  }, [isDecided, userType, handleTypeSelection]);

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <EditorialView
      title="Sua Galeria"
      subtitle={
        <>
          Encontre profissionais ou transforme seu{' '}
          <span className="italic font-semibold text-white">Google Drive™</span>{' '}
          em uma Galeria Profissional
        </>
      }
      altura="h-[65vh]"
      showHeroAction={userType === 'photographer'} // Só mostra login na aba de fotógrafos
      sectionTitle="Aplicativo "
      sectionSubtitle={
        userType === 'photographer'
          ? 'Sua estrutura profissional'
          : 'Encontre o clique perfeito'
      }
      sectionDescription={
        userType === 'explorer'
          ? 'Navegue por galerias públicas e conecte-se direto com fotógrafos.'
          : 'Toda a tecnologia necessária para entregar fotos com elegância e baixo custo.'
      }
      heroCustomAction={cardModo} // 🎯 Passamos os cards como ação customizada
      heroSecondaryAction={compactSelector} // Pílula (abaixo do subtítulo)
    >
      <div className="mb-20">
        {userType === 'explorer' ? (
          <div className="space-y-12 animate-in fade-in duration-500 -mt-32">
            {/* Busca para Clientes - Versão Minimalista */}
            <div className="flex gap-2 max-w-2xl ml-auto bg-white p-1.5 rounded-2xl transition-all">
              <div className="flex-1 flex items-center relative group">
                {/* Ícone de Busca (Esquerda) */}
                <Search
                  size={18}
                  className="absolute left-4 text-slate-400 group-focus-within:text-gold transition-colors z-10"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="O que você busca? (Ex: Casamento em BH...)"
                  className="w-full bg-slate-50/50 py-2.5 !pl-9 pr-10 !h-12 utline-none text-petroleum font-medium text-sm placeholder:text-slate-400 border border-transparent focus:border-slate-100 transition-all"
                />

                {/* Botão Limpar (Direita) - Aparece apenas se houver texto */}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-petroleum transition-all animate-in fade-in zoom-in-75"
                    title="Limpar busca"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                )}
              </div>
              <button className="bg-petroleum text-white px-6 py-2.5 rounded-xl hover:bg-black transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm active:scale-95">
                <span>Buscar</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Grid de Galerias - Design Limpo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="group cursor-pointer bg-white rounded-[2rem] overflow-hidden border border-slate-100 transition-all hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/50"
                >
                  <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                    {/* Badge de Categoria sutil */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-white/80 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-[9px] font-bold text-petroleum uppercase tracking-widest shadow-sm">
                        Ensaio
                      </span>
                    </div>

                    {/* Placeholder para imagem do Drive */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-100 to-transparent opacity-50" />
                  </div>

                  <div className="p-6 flex justify-between items-center bg-white">
                    <div className="space-y-1">
                      <h4 className="font-bold text-petroleum text-lg tracking-tight group-hover:text-gold transition-colors">
                        Galeria Exemplo {i}
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gold" />
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-tighter">
                          Ver portfólio completo
                        </p>
                      </div>
                    </div>

                    <button
                      title="Solicitar Orçamento"
                      className="p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-green-50 hover:text-green-600 transition-all border border-slate-100 hover:border-green-100 shadow-sm"
                    >
                      <MessageCircle size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {/* Conteúdo B2B (Fotógrafos) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {benefits.map((benefit, idx) => (
                <EditorialCard
                  key={idx}
                  title={benefit.title}
                  items={benefit.items}
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

            <div className="mt-10 px-6">
              <div className="max-w-4xl mx-auto relative overflow-hidden bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm group">
                {/* Detalhe Sutil de Fundo */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-gold/5 rounded-full blur-3xl transition-all group-hover:bg-gold/10" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  {/* Badge Superior */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
                    <Sparkles size={12} className="text-gold" />
                    Seu Portifólio Profissional
                  </div>

                  <h3 className="text-2xl md:text-3xl font-semibold text-petroleum italic mb-4">
                    Pronto para transformar sua entrega?
                  </h3>

                  <p className="text-slate-500 max-w-xl mb-6 text-sm md:text-base leading-relaxed">
                    Crie galerias elegantes usando apenas seu{' '}
                    <span className="font-semibold text-petroleum">
                      Google Drive™
                    </span>
                    . Sem custos extras de hospedagem, com 100% de controle.
                  </p>

                  <div className="flex flex-col items-center gap-6 w-full">
                    <button
                      onClick={async () => {
                        try {
                          await authService.signInWithGoogle(true);
                        } catch (error) {
                          console.error('Erro na autenticação:', error);
                        }
                      }}
                      className="group relative bg-petroleum text-white px-10 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:bg-black hover:shadow-xl active:scale-95 w-full md:w-auto"
                    >
                      <LogIn size={20} />
                      <span>Começar agora com Google Drive</span>
                      <ArrowRight
                        size={18}
                        className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                      />
                    </button>

                    {/* Selo de Segurança Clean */}
                    <div className="flex items-center gap-2 py-2 px-4 rounded-xl bg-slate-50/50 border border-slate-100/50">
                      <ShieldCheck size={14} className="text-gold" />
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Conexão direta e segura com sua conta Google
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </EditorialView>
  );
}
