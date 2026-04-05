'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  LogIn,
  HardDrive,
  Shield,
  RefreshCw,
  LayoutGrid,
  PlayCircle,
  Info,
  ExternalLink,
  Table as TableIcon,
} from 'lucide-react';
import { useAuth } from '@photos/core-auth';
import Link from 'next/link';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string | React.ReactNode;
  icon?: React.ReactNode;
}

const faqData: FAQItem[] = [
  // --- CATEGORIA: PLANOS E CAPACIDADE ---
  {
    id: 'planos-capacidade-detalhado',
    category: 'Planos e Capacidade',
    question:
      'Como escolher o plano ideal? Entenda o Pool de Arquivos e limites.',
    answer: (
      <div className="space-y-6">
        <p>
          Esta guia ajuda você a escolher o plano ideal com base no seu volume
          de trabalho. Como entregamos fotos em alta resolução, traduzimos o
          espaço técnico (GB) para quantidade de arquivos, facilitando sua
          gestão.
        </p>

        {/* TABELA DE CAPACIDADE */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-100 text-slate-700 font-bold">
              <tr>
                <th className="p-2 md:p-3">Plano</th>
                <th className="p-2 md:p-3">Pool Total (Fotos + Vídeos)</th>
                <th className="p-2 md:p-3">Equivale a:</th>
                <th className="p-2 md:p-3">Galerias Ativas</th>
                <th className="p-2 md:p-3">Máx. por Galeria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600">
              <tr>
                <td className="p-2 md:p-3 font-bold text-slate-900">FREE</td>
                <td className="p-2 md:p-3">450 arquivos</td>
                <td className="p-2 md:p-3">4,5 GB</td>
                <td className="p-2 md:p-3">Até 3</td>
                <td className="p-2 md:p-3">150 fotos</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2 md:p-3 font-bold text-slate-900">START</td>
                <td className="p-2 md:p-3">2.500 arquivos</td>
                <td className="p-2 md:p-3">25 GB</td>
                <td className="p-2 md:p-3">Até 12</td>
                <td className="p-2 md:p-3">500 fotos</td>
              </tr>
              <tr>
                <td className="p-2 md:p-3 font-bold text-slate-900">PLUS</td>
                <td className="p-2 md:p-3">10.000 arquivos</td>
                <td className="p-2 md:p-3">100 GB</td>
                <td className="p-2 md:p-3">Até 30</td>
                <td className="p-2 md:p-3">1.000 fotos</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2 md:p-3 font-bold text-slate-900">PRO</td>
                <td className="p-2 md:p-3">50.000 arquivos</td>
                <td className="p-2 md:p-3">500 GB</td>
                <td className="p-2 md:p-3">Até 90</td>
                <td className="p-2 md:p-3">1.500 fotos</td>
              </tr>
              <tr>
                <td className="p-2 md:p-3 font-bold text-gold-900 font-bold">
                  PREMIUM
                </td>
                <td className="p-2 md:p-3">200.000 arquivos</td>
                <td className="p-2 md:p-3">2.000 GB (2TB)</td>
                <td className="p-2 md:p-3">Até 300</td>
                <td className="p-2 md:p-3">3.000 fotos</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* DETALHAMENTO DAS REGRAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <HardDrive size={16} className="text-gold" /> 1. O "Pool" de
              Arquivos
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              O Pool Total é o limite de fotos e vídeos que você pode ter
              guardados em sua conta somando todas as galerias. Se você apagar
              uma galeria antiga, os créditos de arquivos voltam para o seu
              "estoque" imediatamente. Cada vídeo conta como 1 arquivo dentro
              desse limite.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw size={16} className="text-gold" /> 2. Equilíbrio
              Elástico
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Você tem liberdade para organizar seus arquivos como preferir.{' '}
              <strong>Muitas fotos em poucas galerias:</strong> Se você faz
              casamentos (ex: 2.000 fotos), usará seu estoque mais rápido.{' '}
              <strong>Poucas fotos em muitas galerias:</strong> Se você faz
              ensaios curtos, poderá criar mais galerias até atingir o limite de
              vagas do plano.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <PlayCircle size={16} className="text-gold" /> 3. Regras para
              Vídeos (UX)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Para garantir que seu cliente assista e baixe os vídeos no celular
              sem travamentos: <strong>Tamanho Máximo:</strong> Até 100 MB por
              vídeo (Planos Plus, Pro e Premium). <strong>Experiência:</strong>{' '}
              Vídeos leves carregam instantaneamente e evitam falhas de
              download.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Info size={16} className="text-gold" /> 4. Limite por Galeria
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mesmo no Premium, cada galeria aceita até{' '}
              <strong>3.000 arquivos</strong>. Isso garante que a página abra
              rápido no celular do cliente. Para eventos maiores, recomendamos
              dividir em volumes (Ex: Cerimônia e Festa).
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-100 rounded-lg text-xs italic text-slate-600">
          <strong>Dica:</strong> No seu Painel de Controle, uma barra de
          progresso mostrará em tempo real quanto do seu "estoque" de fotos e
          vagas de galerias você já utilizou.
        </div>
      </div>
    ),
    icon: <TableIcon size={20} />,
  },
  // --- AUTENTICAÇÃO GOOGLE ---
  {
    id: 'google-login-1',
    category: 'Autenticação Google',
    question: 'Por que preciso fazer login com Google novamente?',
    answer: (
      <div className="space-y-3">
        <p>
          O sistema usa o Google Drive para importar suas fotos. Para acessar
          suas pastas, precisamos de uma permissão especial chamada{' '}
          <strong>refresh token</strong>.
        </p>
        <p>
          Este token pode expirar ou ser revogado pelo Google se: você revogou o
          acesso manualmente, o token expirou por inatividade ou é sua primeira
          vez no sistema.
        </p>
      </div>
    ),
    icon: <LogIn size={20} />,
  },
  {
    id: 'google-login-2',
    category: 'Autenticação Google',
    question: 'O que é a tela de consentimento do Google?',
    answer: (
      <div className="space-y-3">
        <p>
          A tela de consentimento é exibida pelo Google quando você precisa
          autorizar o acesso ao seu Google Drive. Ela garante que você sabe
          quais dados o sistema está acessando.
        </p>
        <p>
          <strong>Importante:</strong> Se você já tem um acesso válido, o
          sistema usa um login rápido para não interromper sua produtividade.
        </p>
      </div>
    ),
    icon: <Shield size={20} />,
  },
  // --- GOOGLE DRIVE ---
  {
    id: 'google-drive-1',
    category: 'Google Drive',
    question: 'Por que não consigo selecionar uma pasta do Google Drive?',
    answer: (
      <div className="space-y-3">
        <p>Isso geralmente ocorre por três motivos:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
          <li>Seu acesso (token) expirou ou foi revogado.</li>
          <li>A pasta está configurada como privada no Drive.</li>
          <li>Problemas temporários de conexão com a API do Google.</li>
        </ul>
        <p>
          <strong>Solução:</strong> O sistema detectará isso e pedirá para você
          renovar o acesso com um clique.
        </p>
      </div>
    ),
    icon: <HardDrive size={20} />,
  },
  {
    id: 'google-drive-2',
    category: 'Google Drive',
    question: 'Como configuro a pasta do Google Drive para ser acessível?',
    answer: (
      <div className="space-y-3">
        <p>
          A pasta precisa estar configurada como{' '}
          <strong>"Qualquer pessoa com o link"</strong>.
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
          <li>Abra a pasta no Google Drive.</li>
          <li>Clique com o botão direito e selecione "Compartilhar".</li>
          <li>Altere o acesso geral para "Qualquer pessoa com o link".</li>
        </ol>
      </div>
    ),
    icon: <HardDrive size={20} />,
  },
  // --- TOKENS E PERMISSÕES ---
  {
    id: 'refresh-token-1',
    category: 'Tokens e Permissões',
    question: 'O que acontece se eu não renovar o refresh token?',
    answer: (
      <div className="space-y-3">
        <p>
          Sem um refresh token válido, você não conseguirá importar novas fotos
          ou selecionar pastas do Drive. O sistema continuará exibindo as
          galerias já criadas, mas a sincronização de novos arquivos ficará
          pausada até a renovação.
        </p>
      </div>
    ),
    icon: <RefreshCw size={20} />,
  },
];

const categories = [
  { id: 'all', name: 'Todas', icon: <HelpCircle size={18} /> },
  {
    id: 'Planos e Capacidade',
    name: 'Planos e Limites',
    icon: <LayoutGrid size={18} />,
  },
  {
    id: 'Autenticação Google',
    name: 'Autenticação',
    icon: <LogIn size={18} />,
  },
  { id: 'Google Drive', name: 'Google Drive', icon: <HardDrive size={18} /> },
  { id: 'Tokens e Permissões', name: 'Permissões', icon: <Shield size={18} /> },
];

export default function FAQContent() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { user } = useAuth();

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) newOpenItems.delete(id);
    else newOpenItems.add(id);
    setOpenItems(newOpenItems);
  };

  const filteredFAQs =
    selectedCategory === 'all'
      ? faqData
      : faqData.filter((item) => item.category === selectedCategory);

  return (
    <div className="mx-auto flex flex-col lg:flex-row max-w-[1600px] gap-4 px-4 py-8 bg-luxury-bg min-h-screen pb-24 lg:pb-12">
      <main className="flex-1 space-y-4 min-w-0">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">
              Central de Ajuda
            </h1>
            <p className="text-slate-600">
              Esclareça suas dúvidas sobre planos, limites e integração com
              Google Drive.
            </p>
          </div>
          {!user && (
            <Link
              href="/auth/login"
              className="flex items-center gap-2 bg-gold text-black px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 transition-all w-fit"
            >
              Acessar minha conta <ExternalLink size={16} />
            </Link>
          )}
        </div>

        <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-4 mb-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-gold text-black shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredFAQs.map((item) => {
            const isOpen = openItems.has(item.id);
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="shrink-0 text-gold">{item.icon}</div>
                    <span className="font-semibold text-slate-900 flex-1">
                      {item.question}
                    </span>
                  </div>
                  <div className="shrink-0 ml-4 text-slate-400">
                    {isOpen ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="text-sm text-slate-700 leading-relaxed">
                      {item.answer}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-6 bg-slate-900 rounded-xl border border-white/10 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 p-3 bg-gold/10 rounded-lg">
                <HelpCircle className="text-gold" size={24} />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  Dúvida sobre faturamento?
                </h3>
                <p className="text-sm text-slate-400">
                  Se você precisa de ajuda com pagamentos ou alteração de plano,
                  chame nosso suporte.
                </p>
              </div>
            </div>
            {!user && (
              <Link
                href="/auth/register"
                className="bg-white text-black px-6 py-2.5 rounded-lg font-bold hover:bg-gold transition-colors whitespace-nowrap"
              >
                Criar conta gratuita
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
