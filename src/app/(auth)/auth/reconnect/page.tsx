import { Metadata } from 'next';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Restaurar Conexão | Sua Galeria',
};

export default function ReconnectPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 text-center">
        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
          <RefreshCw size={40} className="animate-spin-slow" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight uppercase">
          Conexão Expirada
        </h1>

        <p className="text-slate-500 mb-8 leading-relaxed text-sm">
          Sua chave de acesso ao <strong>Google Drive™</strong> precisa ser
          renovada por motivos de segurança. Clique abaixo para reestabelecer o
          vínculo e continuar editando seu perfil.
        </p>

        <div className="space-y-4">
          <GoogleSignInButton />

          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-slate-400 py-2 text-xs font-bold hover:text-slate-600 transition-colors uppercase tracking-widest"
          >
            <ArrowLeft size={14} />
            Voltar ao Início
          </Link>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-50">
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 uppercase tracking-tighter">
            <AlertCircle size={12} />
            Nenhuma foto será apagada do seu Drive
          </div>
        </div>
      </div>
    </div>
  );
}
