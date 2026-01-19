'use client';
import { CreditCard, History } from 'lucide-react';

export default function BillingPage() {
  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto">
      <h1 className="text-3xl italic text-white mb-8">
        Assinatura e Faturamento
      </h1>

      <div className="grid grid-cols-1 gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-6 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/10 transition-all group">
            <CreditCard className="text-champagne mb-4 group-hover:scale-110 transition-transform" />
            <h4 className="text-white font-semibold text-sm">
              Método de Pagamento
            </h4>
            <p className="text-white/40 text-xs mt-1">Visa final 4242</p>
          </button>

          <button className="p-6 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/10 transition-all group">
            <History className="text-champagne mb-4 group-hover:scale-110 transition-transform" />
            <h4 className="text-white font-semibold text-sm">
              Histórico de Faturas
            </h4>
            <p className="text-white/40 text-xs mt-1">
              Acessar recibos anteriores
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
