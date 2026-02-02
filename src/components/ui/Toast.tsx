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
  // Sucesso: Petroleum/Gold | Erro: Petroleum/Red
  const styles =
    type === 'success'
      ? 'bg-slate-950/90 border-white/10 text-white shadow-2xl backdrop-blur-xl'
      : 'bg-red-950/90 border-red-500/20 text-white shadow-2xl backdrop-blur-xl';

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
            className={`inline-flex items-center gap-1.5 font-bold underline mt-2 px-3 py-2 rounded-luxury transition-all ${
              type === 'success'
                ? 'bg-gold/10 text-gold hover:bg-white hover:text-black'
                : 'bg-red-500/10 text-red-400 hover:bg-white hover:text-black'
            }`}
          >
            <span className="text-editorial-label">Abrir pasta no Drive</span>
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
            className={`flex items-start gap-4 rounded-luxury border px-6 py-5 min-w-[320px] max-w-[440px] ${styles}`}
          >
            {/* Ícone com Container de Destaque */}
            <div
              className={`shrink-0 p-2 rounded-luxury ${type === 'success' ? 'bg-gold/10' : 'bg-red-500/10'}`}
            >
              {type === 'success' ? (
                <CheckCircle2 size={20} className="text-gold" />
              ) : (
                <AlertCircle size={20} className="text-red-500" />
              )}
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span
                className={`text-editorial-label ${type === 'success' ? 'text-gold' : 'text-red-400'}`}
              >
                {type === 'success' ? 'Sucesso' : 'Atenção'}
              </span>

              <div className="text-[13px] md:text-[14px] leading-relaxed font-bold tracking-luxury-tight text-white/90 italic">
                {renderMessage(message)}
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors text-white/40"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
