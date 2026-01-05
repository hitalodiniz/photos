'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  // Estilos sutos: Champanhe para sucesso e Rosé suave para erro
  const styles =
    type === 'success'
      ? 'bg-[#FAF7ED]/90 border-gold/30 text-slate-900 shadow-[0_20px_50px_rgba(212,175,55,0.1)]'
      : 'bg-[#FFF5F5]/90 border-red-100 text-[#991B1B] shadow-[0_20px_50px_rgba(153,27,27,0.05)]';
  // Timer para fechar automaticamente após 6 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 6000); // 6 segundos é ideal para mensagens longas de erro
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed bottom-10 right-10 z-[10001]"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <div
            className={`flex items-start gap-4 rounded-[28px] border px-6 py-5 min-w-[320px] max-w-[420px] backdrop-blur-xl transition-colors ${styles}`}
          >
            {/* Ícone com tamanho balanceado */}
            <div className="shrink-0 mt-0.5">
              {type === 'success' ? (
                <CheckCircle2 size={22} className="text-[#D4AF37]" />
              ) : (
                <AlertCircle size={22} className="text-red-400" />
              )}
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              {/* Título discreto em 10px */}
              <span className="text-[10px] uppercase tracking-[0.25em] font-black opacity-40">
                {type === 'success' ? 'Sucesso' : 'Atenção'}
              </span>

              {/* Mensagem Principal: 12px Mobile / 14px Desktop */}
              <p className="text-[12px] md:text-[14px] leading-relaxed font-semibold tracking-tight">
                {message}
              </p>
            </div>

            {/* Botão de fechar minimalista */}
            <button
              onClick={onClose}
              className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors text-slate-300 hover:text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
