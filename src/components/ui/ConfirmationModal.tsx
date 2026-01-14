'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import SecondaryButton from '@/components/ui/SecondaryButton';

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
          className="fixed inset-0 z-[10002] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-[32px] border border-[#F3E5AB] bg-[#FFF9F0] p-10 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Cabeçalho Horizontal */}
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

              <h2 className="text-xl font-semibold tracking-tight text-slate-900 italic font-serif">
                {title}
              </h2>
            </div>

            {/* Mensagem com Quebra de Linha Forçada */}
            <div className="mb-10 text-[14px] leading-relaxed text-slate-600 font-medium">
              {typeof message === 'string'
                ? message.split('Esta ação').map((part, index) => (
                    <span key={index} className="block">
                      {index === 0 ? part : `Esta ação ${part}`}
                      {index === 0 && <span className="block h-2" />}
                    </span>
                  ))
                : message}
            </div>

            {/* Ações Padronizadas */}
            <div className="flex flex-col gap-3">
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`w-full py-4 rounded-2xl font-semibold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-black/5 ${
                  variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-900 text-white hover:bg-black'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  confirmText
                )}
              </button>

              {/* Botão Secundário Padronizado */}
              <SecondaryButton
                label="Cancelar"
                onClick={onClose}
                className="!w-full border-transparent hover:bg-white/50"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
