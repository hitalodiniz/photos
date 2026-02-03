'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  RefreshCw,
  Globe,
  MessageCircle,
  LogIn,
} from 'lucide-react';

interface GoogleAuthErrorProps {
  errorType: string | null;
  photographerName: string;
}

export default function GoogleAuthError({
  errorType,
  photographerName,
}: GoogleAuthErrorProps) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const isPermissionError = errorType === 'PERMISSION_DENIED';
  const isTokenMissing = errorType === 'TOKEN_NOT_FOUND';

  // Verifica se o usuário está autenticado (pode ser o dono)
  useEffect(() => {
    // Verifica se há sessão no localStorage/cookies do Supabase
    const checkAuth = async () => {
      try {
        // Tenta verificar se há uma sessão ativa
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (supabaseUrl && typeof window !== 'undefined') {
          // Se estiver em uma rota de dashboard ou similar, assume que é o dono
          const currentPath = window.location.pathname;
          if (
            currentPath.includes('/dashboard') ||
            document.cookie.includes('sb-')
          ) {
            setIsOwner(true);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
        {/* Ícone de Alerta com Glow */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full animate-pulse"></div>
          {isPermissionError ? (
            <Globe
              size={60}
              className="text-amber-500 relative z-10"
              strokeWidth={1.5}
            />
          ) : (
            <AlertTriangle
              size={60}
              className="text-amber-500 relative z-10"
              strokeWidth={1.5}
            />
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-white text-xl md:text-2xl font-bold uppercase tracking-luxury-widest leading-tight">
            {isPermissionError ? 'Acesso Pendente' : 'Galeria Indisponível'}
          </h1>
          <div className="h-1 w-12 bg-[#F3E5AB] mx-auto rounded-full"></div>
        </div>

        {/* Card de Instrução para o Usuário Final */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-5 text-left">
          <div className="flex items-center gap-3 text-[#F3E5AB]">
            <MessageCircle size={18} />
            <span className="text-[11px] font-bold uppercase tracking-luxury-widest">
              Informativo
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-white text-xs md:text-sm leading-relaxed">
              {isPermissionError ? (
                <>
                  Os arquivos desta galeria ainda não foram liberados para
                  visualização pública no Google Drive.
                </>
              ) : (
                <>
                  Não foi possível carregar as mídias desta galeria devido a uma
                  interrupção na conexão com o serviço de armazenamento.
                </>
              )}
            </p>
            <p className="text-white text-xs md:text-sm leading-relaxed">
              {isTokenMissing ? (
                <>
                  O autor desta galeria precisa reconectar sua conta do Google
                  Drive para que as fotos possam ser exibidas. A conexão foi
                  interrompida ou expirou.
                </>
              ) : isPermissionError ? (
                <>
                  Os arquivos desta galeria ainda não foram liberados para
                  visualização pública...
                </>
              ) : (
                <>
                  Não foi possível carregar as mídias devido a uma interrupção
                  na conexão...
                </>
              )}
            </p>

            <div className="p-4 bg-black/30 rounded-lg border-l-2 border-[#F3E5AB]">
              <p className="text-white/80 text-[11px] md:text-xs leading-relaxed italic">
                {isTokenMissing ? (
                  <>
                    O autor <strong>{photographerName}</strong> precisa
                    reconectar sua conta do Google Drive no painel de controle
                    para restaurar o acesso às fotos desta galeria.
                  </>
                ) : (
                  <>
                    Para resolver este problema, entre em contato com{' '}
                    <strong>{photographerName}</strong> e solicite a
                    regularização do acesso aos arquivos desta galeria.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col items-center gap-3">
          {isTokenMissing && isOwner && (
            <button
              onClick={() => router.push('/auth/reconnect')}
              className="flex items-center justify-center gap-3 px-6 py-3 bg-[#F3E5AB] text-black hover:bg-champagnetransition-colors rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-lg"
            >
              <LogIn size={14} /> Reconectar Google Drive
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-3 text-white/90 hover:text-[#F3E5AB] transition-colors text-[10px] font-bold uppercase tracking-luxury-widest"
          >
            <RefreshCw size={12} /> Tentar atualizar a página
          </button>
        </div>
      </div>
    </div>
  );
}
