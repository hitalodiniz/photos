'use client';
import { X, Camera, Plus } from 'lucide-react';
import SecondaryButton from '@/components/ui/SecondaryButton';

interface ModalProps {
  title: string;
  subtitle?: string;
  isEdit: boolean;
  onClose: () => void;
  children: React.ReactNode;
  submitButton: React.ReactNode; // Recebe apenas o botão de ação principal
}

export default function GalleryModalLayout({
  title,
  subtitle,
  isEdit,
  onClose,
  children,
  submitButton,
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl h-fit max-h-[95vh] bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
        {/* HEADER PADRONIZADO */}
        <div className="flex items-center justify-between py-3 px-8 border-b border-slate-50 bg-[#FAF7ED]/50 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37]">
              {isEdit ? <Camera size={18} /> : <Plus size={18} />}
            </div>
            <div className="flex items-baseline gap-2 min-w-0">
              <h2 className="text-sm font-bold text-slate-900">{title}</h2>
              {subtitle && (
                <p className="text-sm text-slate-500 font-medium truncate italic font-serif">
                  | {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white rounded-full text-slate-400 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTEÚDO DO FORMULÁRIO */}
        <div className="px-4 pr-4 pb-4 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>

        {/* RODAPÉ PADRONIZADO (Botão Cancelar e Ação) */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 shrink-0 px-8">
          <div className="flex items-center justify-between gap-4">
            <SecondaryButton label="Cancelar" onClick={onClose} />
            <div className="w-full max-w-[240px]">{submitButton}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
