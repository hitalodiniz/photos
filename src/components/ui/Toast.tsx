'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X, ExternalLink } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  position?: 'left' | 'right';
  /** Link opcional exibido abaixo da mensagem (ex.: abrir pasta no Drive) */
  link?: { url: string; label?: string };
}

export default function Toast({
  message,
  type,
  onClose,
  position = 'right',
  link,
}: ToastProps) {
  const isLeft = position === 'left';

  // 🎯 MERCADO: Fundo extremamente sutil (quase branco/cinza) com acento na borda lateral
  // Sucesso: Fundo champagne ultra-leve | Erro: Fundo avermelhado pálido
  const styles =
    type === 'success'
      ? 'bg-white border-slate-200 text-petroleum shadow-lg'
      : 'bg-[#FFF5F5] border-red-100 text-[#822727] shadow-lg';

  useEffect(() => {
    const duration = type === 'success' ? 4000 : 7000;
    if (message) {
      const timer = setTimeout(() => onClose(), duration);
      return () => clearTimeout(timer);
    }
  }, [message, type, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className={`fixed bottom-8 z-[10001] ${isLeft ? 'left-8' : 'right-8'}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
        >
          <div
            className={`flex items-center gap-4 rounded-lg border p-4 min-w-[320px] ${styles}`}
          >
            {/* Barra lateral de cor (Acento de Status) */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-lg ${
                type === 'success' ? 'bg-gold' : 'bg-red-500'
              }`}
            />

            <div className="shrink-0">
              {type === 'success' ? (
                <CheckCircle2 size={20} className="text-gold" />
              ) : (
                <AlertCircle size={20} className="text-red-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-tight tracking-tight">
                {message}
              </p>
              {link?.url && (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold text-gold hover:underline"
                >
                  <ExternalLink size={12} />
                  {link.label ?? 'Abrir link'}
                </a>
              )}
            </div>

            <button
              onClick={onClose}
              className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors text-slate-400"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
