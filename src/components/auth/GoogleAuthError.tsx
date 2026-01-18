'use client';
import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Lock,
  Globe,
  MessageCircle,
} from 'lucide-react';

interface GoogleAuthErrorProps {
  errorType: string | null;
  photographerName: string;
}

export default function GoogleAuthError({
  errorType,
  photographerName,
}: GoogleAuthErrorProps) {
  const isPermissionError = errorType === 'PERMISSION_DENIED';
  const isTokenMissing = errorType === 'TOKEN_NOT_FOUND';

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
          <h1 className="text-white text-xl md:text-2xl font-bold uppercase tracking-[0.2em] leading-tight">
            {isPermissionError ? 'Acesso Pendente' : 'Galeria Indisponível'}
          </h1>
          <div className="h-1 w-12 bg-[#F3E5AB] mx-auto rounded-full"></div>
        </div>

        {/* Card de Instrução para o Usuário Final */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-5 text-left">
          <div className="flex items-center gap-3 text-[#F3E5AB]">
            <MessageCircle size={18} />
            <span className="text-[11px] font-bold uppercase tracking-widest">
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
                  A conexão entre esta galeria e o serviço de armazenamento
                  ainda não foi estabelecida pelo autor.
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
                Para resolver este problema, entre em contato com{' '}
                <strong>{photographerName}</strong> e solicite a regularização
                do acesso aos arquivos desta galeria.
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Refresh Sutil */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-3 mx-auto text-white/40 hover:text-[#F3E5AB] transition-colors text-[10px] font-bold uppercase tracking-[0.3em]"
        >
          <RefreshCw size={12} /> Tentar atualizar a página
        </button>
      </div>
    </div>
  );
}
