'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Crown, Sparkles } from 'lucide-react';
import { EditorialHeader, DynamicHeroBackground, Footer } from '@/components/layout';
import { PLANS } from '@/config/plans';

// ESTILOS PADRONIZADOS PARA LEGIBILIDADE EXTREMA
const STYLES = {
  label: "py-5 px-2 border-b border-black/10 font-bold text-slate-900 text-[10px] md:text-[13px] tracking-[0.1em] leading-relaxed",
  cellText: "text-[10px] md:text-[13px] font-semibold text-slate-800",
  premiumCell: "text-[10px] md:text-[13px] bg-[#F3E5AB]/30 border-x border-[#F3E5AB]/30 text-slate-950 font-bold shadow-inner",
  categoryHeader: "py-8 px-4 border-b-2 border-slate-900 text-slate-950 font-serif italic text-2xl tracking-tight"
};

export default function PlanosPage() {
  const router = useRouter();
  const planosData = Object.values(PLANS);

  const features = [
    { label: "Galerias Ativas", key: "maxGalleries" },
    { label: "Identidade", values: ["Link Padrão", "Link Padrão", "Subdomínio Próprio", "Subdomínio Próprio"] },
    { label: "Perfil do Fotógrafo", values: ["Foto + Nome", "Full (Bio + Links)", "Full (Bio + Links)", "Full (Bio + Links)"] },
    { label: "Redes Sociais", values: [false, true, true, true] },
    { label: "Enviar fotos via WhatsApp", values: [false, true, true, true] },
    { label: "Download de todos as fotos (ZIP)", values: [false, "Sem Marca d'água", "Sem Marca d'água", "Sem Marca d'água"] },
    { label: "Analytics Básico", values: [false, "Cliques Totais", "Cliques + Origem", "Cliques + Origem"] },
    { label: "Analytics de Fotos", values: [false, false, "Ranking Favoritas", "Ranking Favoritas"] },
    { label: "Suporte", values: ["Via Ticket", "Via Ticket", "WhatsApp VIP", "WhatsApp VIP"] },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black ">
      <DynamicHeroBackground />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Planos & Investimento"
          subtitle={<>Escolha a vitrine ideal para a sua <span className="font-bold border-b-2 border-[#F3E5AB] text-white">carreira fotográfica</span></>}
        />

        <main className="flex-grow flex items-center justify-center py-10 px-4 ">
          <section className="w-full max-w-6xl mx-auto bg-white/98 backdrop-blur-3xl rounded-[3rem] md:rounded-[4rem] p-6 md:p-12 shadow-[0_50px_100px_rgba(0,0,0,0.5)] 
          border border-white/20 overflow-x-auto relative bg-[#FFF]/100">
            
            <table className="w-full text-left border-collapse min-w-[850px] relative ">
              <thead>
                <tr>
                  <th className={STYLES.categoryHeader}>Categoria</th>
                  {planosData.map((p) => {
                    const isPremium = p.name === "Premium";
                    return (
                      <th key={p.id} className={`py-8 px-4 border-b-2 border-slate-900 text-center relative ${isPremium ? 'bg-[#F3E5AB]/30' : ''}`}>
                        {isPremium && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 bg-slate-950 text-[#F3E5AB] text-[10px] font-black uppercase tracking-[0.25em] px-5 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 animate-pulse border border-[#F3E5AB]/30">
                            <Sparkles size={12} /> Recomendado
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`uppercase tracking-[0.25em] text-[11px] font-black ${isPremium ? 'text-amber-600' : 'text-slate-400'}`}>
                            {p.name}
                          </span>
                          <span className="text-3xl font-black text-slate-950">
                            R$ {p.price}<span className="text-[13px] text-slate-500 font-bold ml-0.5">/mês</span>
                          </span>
                          <span className="text-[12px] md:text-[13px] italic font-semibold text-slate-900">{p.conceito}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              
              <tbody>
                {features.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className={STYLES.label}>
                      {row.label}
                    </td>
                    {planosData.map((p, i) => {
                      const cellValue = row.key ? (p as any)[row.key] : row.values?.[i];
                      const isPremiumCol = p.name === "Premium";
                      
                      return (
                        <td key={p.id} className={`py-5 px-4 border-b border-slate-200 text-center ${isPremiumCol ? STYLES.premiumCell : STYLES.cellText}`}>
                          {cellValue === true ? <Check size={20} strokeWidth={3} className={`mx-auto ${isPremiumCol ? 'text-amber-600' : 'text-[#D4AF37]'}`} /> : 
                           cellValue === false ? <X size={20} strokeWidth={3} className="mx-auto text-slate-300" /> : 
                           cellValue === Infinity ? "Ilimitadas" : 
                           typeof cellValue === "number" ? `Até ${cellValue.toString().padStart(2, '0')}` : cellValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-16 flex flex-col items-center gap-4">
               <button 
                onClick={() => router.push('/login')}
                className="px-16 py-6 bg-slate-950 text-[#F3E5AB] rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-amber-600 hover:text-white transition-all transform hover:scale-[1.03] shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-[#F3E5AB]/20 flex items-center gap-4 group"
               >
                 <Crown size={24} className="group-hover:rotate-12 transition-transform" /> 
                 Assinar Plano de Elite
               </button>
               <p className="text-[12px]  tracking-[0.2em] text-slate-500 font-bold">
                 * Transação segura via criptografia SSL
               </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}