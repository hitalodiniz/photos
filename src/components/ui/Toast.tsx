'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X, ExternalLink } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  // 🎯 Estilos Baseados no global.css
  // Sucesso: Champagne/Gold | Erro: Rosé Suave/Error-Red
  const styles =
    type === 'success'
      ? 'bg-[#FAF7ED]/95 border-gold/30 text-slate-900 shadow-[0_20px_50px_rgba(212,175,55,0.15)]'
      : 'bg-[#FFF5F5]/95 border-red-200 text-[#991B1B] shadow-[0_20px_50px_rgba(179,38,30,0.1)]';

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 8000); // 8 segundos para garantir leitura de links longos
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  // Função para renderizar mensagem com link clicável
  const renderMessage = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 font-bold underline mt-2 px-3 py-2 rounded-lg transition-all ${
              type === 'success'
                ? 'bg-gold/10 text-gold hover:bg-gold/20'
                : 'bg-red-50 text-[#B3261E] hover:bg-red-100'
            }`}
          >
            Abrir pasta no Drive
            <ExternalLink size={14} />
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[10001]"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <div
            className={`flex items-start gap-4 rounded-[24px] border px-6 py-5 min-w-[320px] max-w-[440px] backdrop-blur-md ${styles}`}
          >
            {/* Ícone com Container de Destaque */}
            <div
              className={`shrink-0 p-2 rounded-full ${type === 'success' ? 'bg-gold/10' : 'bg-red-50'}`}
            >
              {type === 'success' ? (
                <CheckCircle2 size={20} className="text-[#D4AF37]" />
              ) : (
                <AlertCircle size={20} className="text-[#B3261E]" />
              )}
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span
                className={`text-[10px] uppercase tracking-[0.3em] font-bold opacity-60 font-barlow`}
              >
                {type === 'success' ? 'Sincronizado' : 'Ação Necessária'}
              </span>

              <div className="text-[13px] md:text-[14px] leading-relaxed font-medium tracking-tight font-inter">
                {renderMessage(message)}
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors text-slate-400"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
