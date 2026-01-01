// components/DashboardUI/Toast.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react'; // Importe ícones para melhor feedback

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  // Cores refinadas: Champanhe para Sucesso e um Vermelho sutil para Erro
  const styles =
    type === 'success'
      ? 'bg-[#FAF7ED] border-[#D4AF37]/40 text-slate-900 shadow-[0_10px_30px_rgba(212,175,55,0.15)]'
      : 'bg-red-50 border-red-200 text-red-900 shadow-[0_10px_30px_rgba(220,38,38,0.1)]';

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed bottom-8 right-8 z-[200]" // Z-index maior que o modal (100)
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div
            className={`flex items-center gap-4 rounded-2xl border px-5 py-4 min-w-[320px] backdrop-blur-md ${styles}`}
          >
            <div className="shrink-0">
              {type === 'success' ? (
                <CheckCircle2 size={20} className="text-[#D4AF37]" />
              ) : (
                <AlertCircle size={20} className="text-red-500" />
              )}
            </div>

            <div className="flex flex-col gap-0.5 flex-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-50">
                {type === 'success' ? 'Sucesso' : 'Atenção'}
              </span>
              <span className="text-sm font-medium leading-tight">
                {message}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-black/5 rounded-full transition-colors text-slate-400"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
