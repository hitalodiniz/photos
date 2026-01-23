'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { authService, useAuth } from '@photos/core-auth';
import { getProfileData } from '@/core/services/profile.service';
import { usePageTitle } from '@/hooks/usePageTitle';

import { GoogleSignInButton } from '@/components/auth';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import FeatureGrid from '@/components/ui/FeatureGrid';

function LoginContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSyncingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 🎯 Verifica erros na URL
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'session_expired') {
      setErrorMessage('Sua sessão expirou. Por favor, faça login novamente.');
    } else if (error === 'session_error') {
      setErrorMessage('Erro ao validar sua sessão. Por favor, faça login novamente.');
    } else if (error === 'auth_failed') {
      setErrorMessage('Falha na autenticação. Tente novamente.');
    } else {
      setErrorMessage(null);
    }
  }, [searchParams]);

  useEffect(() => {
    // Só executamos a triagem se NÃO estiver carregando e se HOUVER uma sessão
    if (authLoading || !user) return;

    const handleRouting = async () => {
      // 1. Sincronização de Sessão (Refresh para garantir cookies)
      if (!isSyncingRef.current) {
        isSyncingRef.current = true;
        try {
          await authService.refreshSession();
        } catch (e) {
          console.error('Falha ao sincronizar sessão:', e);
        }
      }

      // 2. Busca o perfil para triagem via Server Action (permitida)
      const result = await getProfileData();
      
      if (!result.success || !result.profile) {
        // Se não conseguir buscar o perfil, manda para onboarding por segurança
        router.replace('/onboarding');
        return;
      }

      const profile = result.profile;

      // 3. Validação de Onboarding
      const isComplete =
        profile.full_name && profile.username && profile.mini_bio;
      if (!isComplete) {
        router.replace('/onboarding');
        return;
      }

      // 4. Lógica de Subdomínio
      const host = window.location.hostname;
      const isLocal = host.includes('localhost');
      const chunks = host.split('.');
      const currentSubdomain = isLocal
        ? chunks.length > 1 && chunks[chunks.length - 1] === 'localhost'
          ? chunks[0]
          : ''
        : chunks.length > 2
          ? chunks[0]
          : '';

      if (
        profile.use_subdomain &&
        profile.username !== currentSubdomain &&
        currentSubdomain !== 'www'
      ) {
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : '';
        const domainBase = isLocal ? 'localhost' : 'suagaleria.com.br';

        // Redirecionamento Cross-domain
        window.location.href = `${protocol}//${profile.username}.${domainBase}${port}/dashboard`;
        return;
      }

      // 5. Destino Final padrão
      router.replace('/dashboard');
    };

    handleRouting();
  }, [user, authLoading, router]);

  const loginItems = [
    {
      icon: <ShieldCheck />,
      title: 'Identificação autor',
      desc: (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-2">
            <p className="text-white/70 max-w-sm">
              Utilize sua conta Google para gerenciar suas galerias e conteúdos
              profissionais com segurança total.
            </p>
          </div>

          {/* 🎯 Mensagem de erro */}
          {errorMessage && (
            <div className="w-full max-w-sm mx-auto mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-luxury flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
              <p className="text-red-200/80 text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          <GoogleSignInButton />

          <div className="pt-6 border-t border-white/5 w-full">
            <p className="text-editorial-label text-white/40">
              Ambiente seguro • Criptografia ponta a ponta
            </p>
          </div>
        </div>
      ),
    },
  ];

  // Se estiver carregando a autenticação ou se já houver sessão (redirecionando),
  // podemos mostrar um estado de loading sutil ou nada.
  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="loading-luxury w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black">
      <DynamicHeroBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Acesso Restrito"
          subtitle={
            <>
              Bem-vindo de volta ao seu{' '}
              <span className="font-bold border-b-2 border-gold/30 text-white italic">
                espaço exclusivo
              </span>
            </>
          }
        />
        <main className="flex-grow flex flex-col items-center justify-center py-6 md:py-10">
          <div className="w-full max-w-2xl mx-auto">
            <FeatureGrid items={loginItems} iconPosition="top" />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// 🎯 Componente principal que envolve com Suspense
export default function LoginPage() {
  usePageTitle('Acesso restrito');

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="loading-luxury w-10 h-10" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
