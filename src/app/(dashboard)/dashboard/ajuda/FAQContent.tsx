'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, LogIn, HardDrive, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '@photos/core-auth';
import { useRouter } from 'next/navigation';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string | React.ReactNode;
  icon?: React.ReactNode;
}

const faqData: FAQItem[] = [
  {
    id: 'google-login-1',
    category: 'Autenticação Google',
    question: 'Por que preciso fazer login com Google novamente?',
    answer: (
      <div className="space-y-3">
        <p>
          O sistema usa o Google Drive para importar suas fotos. Para acessar suas pastas, precisamos de uma permissão especial chamada <strong>refresh token</strong>.
        </p>
        <p>
          Este token pode expirar ou ser revogado pelo Google em algumas situações:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
          <li>Você revogou o acesso manualmente nas configurações do Google</li>
          <li>O token expirou por inatividade</li>
          <li>É a primeira vez que você está usando o sistema</li>
        </ul>
        <p>
          Quando isso acontece, o sistema detecta automaticamente e solicita que você faça login novamente para renovar o acesso.
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
          A tela de consentimento é exibida pelo Google quando você precisa autorizar o acesso ao seu Google Drive. Ela aparece quando:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
          <li>É a primeira vez que você autoriza o acesso</li>
          <li>Seu refresh token expirou ou foi revogado</li>
          <li>Você precisa renovar as permissões</li>
        </ul>
        <p>
          <strong>Importante:</strong> Se você já tem um refresh token válido, o sistema usa um login rápido (sem tela de consentimento) para melhorar sua experiência.
        </p>
      </div>
    ),
    icon: <Shield size={20} />,
  },
  {
    id: 'google-drive-1',
    category: 'Google Drive',
    question: 'Por que não consigo selecionar uma pasta do Google Drive?',
    answer: (
      <div className="space-y-3">
        <p>
          Se você não consegue selecionar uma pasta, pode ser porque:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
          <li>Seu refresh token expirou ou foi revogado</li>
          <li>A pasta está privada e não permite acesso externo</li>
          <li>Há um problema temporário com a conexão</li>
        </ul>
        <p>
          <strong>Solução:</strong> Quando isso acontecer, um modal aparecerá automaticamente pedindo para você renovar o acesso. Basta clicar em "Entendi, continuar" e autorizar novamente.
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
          Para que o sistema possa acessar suas fotos, a pasta do Google Drive precisa estar configurada como:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
          <li><strong>"Qualquer pessoa com o link"</strong> - Esta é a configuração recomendada</li>
          <li>Ou você precisa ter dado permissão de acesso ao sistema</li>
        </ul>
        <p>
          <strong>Como alterar:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
          <li>Abra a pasta no Google Drive</li>
          <li>Clique com o botão direito e selecione "Compartilhar"</li>
          <li>Altere o acesso para "Qualquer pessoa com o link"</li>
          <li>Tente selecionar a pasta novamente no sistema</li>
        </ol>
      </div>
    ),
    icon: <HardDrive size={20} />,
  },
  {
    id: 'refresh-token-1',
    category: 'Tokens e Permissões',
    question: 'O que acontece se eu não renovar o refresh token?',
    answer: (
      <div className="space-y-3">
        <p>
          Sem um refresh token válido, você não conseguirá:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
          <li>Selecionar pastas do Google Drive</li>
          <li>Importar fotos automaticamente</li>
          <li>Usar o Google Picker para vincular pastas</li>
        </ul>
        <p>
          O sistema continuará funcionando normalmente para outras funcionalidades, mas a integração com o Google Drive ficará desabilitada até que você renove o acesso.
        </p>
      </div>
    ),
    icon: <RefreshCw size={20} />,
  },
];

const categories = [
  { id: 'all', name: 'Todas', icon: <HelpCircle size={18} /> },
  { id: 'Autenticação Google', name: 'Autenticação', icon: <LogIn size={18} /> },
  { id: 'Google Drive', name: 'Google Drive', icon: <HardDrive size={18} /> },
  { id: 'Tokens e Permissões', name: 'Permissões', icon: <Shield size={18} /> },
];

export default function FAQContent() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { user } = useAuth();
  const router = useRouter();

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQs = selectedCategory === 'all'
    ? faqData
    : faqData.filter(item => item.category === selectedCategory);

  // Redireciona se não houver usuário
  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/auth/login');
    }
    return null;
  }

  return (
    <div className="mx-auto flex flex-col lg:flex-row max-w-[1600px] gap-4 px-4 py-2 bg-luxury-bg min-h-screen pb-24 lg:pb-6">
      {/* MAIN CONTENT */}
      <main className="flex-1 space-y-4 min-w-0">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            Perguntas Frequentes
          </h1>
          <p className="text-slate-600">
            Encontre respostas para as dúvidas mais comuns sobre o uso da plataforma
          </p>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    selectedCategory === category.id
                      ? 'bg-gold text-black shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }
                `}
              >
                {category.icon}
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
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
                    {item.icon && (
                      <div className="shrink-0 text-gold">
                        {item.icon}
                      </div>
                    )}
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
                  <div className="px-6 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50">
                    <div className="text-sm text-slate-700 leading-relaxed">
                      {item.answer}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Help */}
        <div className="mt-12 p-6 bg-white rounded-xl border border-slate-200">
          <div className="flex items-start gap-4">
            <div className="shrink-0 p-3 bg-gold/10 rounded-lg">
              <HelpCircle className="text-gold" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Não encontrou sua resposta?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Se você ainda tem dúvidas ou precisa de ajuda adicional, entre em contato com nosso suporte.
              </p>
              <p className="text-xs text-slate-500">
                Esta página será atualizada conforme novas funcionalidades forem adicionadas ao sistema.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
