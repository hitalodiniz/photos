'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  variant = 'danger',
  isLoading = false,
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            // Estilo alinhado à Navbar: bg-[#FFF9F0] e border-[#F3E5AB]
            className="w-full max-w-sm rounded-[32px] border border-[#F3E5AB] bg-[#FFF9F0] p-8 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Ícone de Destaque conforme a variante */}
            {/* Cabeçalho Horizontal: Ícone + Título */}
            <div className="mb-6 flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  variant === 'danger' ? 'bg-red-50' : 'bg-[#D4AF37]/10'
                }`}
              >
                {variant === 'danger' ? (
                  <AlertTriangle className="text-[#B3261E] w-6 h-6" />
                ) : (
                  <Info className="text-[#D4AF37] w-6 h-6" />
                )}
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 italic">
                {title}
              </h2>
            </div>

            {/* Mensagem com Quebra de Linha Forçada */}
            <div className="mb-8 text-[14px] md:text-[16px]  leading-relaxed text-slate-600 font-medium">
              {typeof message === 'string'
                ? message.split('Esta ação').map((part, index) => (
                    <span key={index} className="block">
                      {index === 0 ? part : `Esta ação ${part}`}
                      {index === 0 && <span className="block h-2" />}{' '}
                      {/* Espaçador entre linhas */}
                    </span>
                  ))
                : message}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={onConfirm}
                disabled={isLoading}
                // Botão principal usando as cores do global.css
                className={`flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-xs font-bold uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 ${
                  variant === 'danger'
                    ? 'bg-[#B3261E] text-white shadow-lg shadow-red-900/20 hover:bg-red-700'
                    : 'bg-slate-900 text-white shadow-lg hover:bg-black'
                }`}
              >
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  confirmText
                )}
              </button>

              <button
                onClick={onClose}
                disabled={isLoading}
                // Botão secundário minimalista
                className="h-12 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
