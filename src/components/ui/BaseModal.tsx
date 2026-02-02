'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showCloseButton?: boolean;
  headerIcon?: ReactNode;
  footer?: ReactNode;
  topBanner?: ReactNode;
  // 🎯 Novos parâmetros para controle total do fundo (Overlay)
  overlayColor?: string; // Ex: 'bg-black' ou 'bg-petroleum'
  overlayOpacity?: string; // Ex: '20', '10', '05'
  blurLevel?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  headerIcon,
  footer,
  topBanner,
  overlayColor = 'bg-petroleum',
  overlayOpacity = '60', // Padrão John (30%)
  blurLevel = 'md', // Padrão John (Blur médio)
}: BaseModalProps) {
  const [mounted, setMounted] = useState(false);

  // 🎯 Garante que o modal só renderize no cliente (para o Portal)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🎯 Fecha modal com a tecla ESC (Apenas se o botão fechar estiver habilitado)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && showCloseButton) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, showCloseButton, onClose]);

  if (!isOpen || !mounted) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  // Mapeamento de blur para classes Tailwind
  const blurClasses = {
    none: 'backdrop-blur-none',
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
  };

  const modalContent = (
    <div
      className={`fixed inset-0 z-[10000] ${overlayColor}/${overlayOpacity} ${blurClasses[blurLevel]} flex items-center justify-center px-6 md:p-6 animate-in fade-in duration-500`}
    >
      <div
        className="absolute inset-0"
        onClick={() => showCloseButton && onClose()}
      />

      {/* O Modal em si (Corpo Branco) */}
      <div
        className={`w-full ${maxWidthClasses[maxWidth]} flex flex-col h-auto max-h-[90vh] relative shadow-2xl rounded-luxury overflow-hidden border border-white/10`}
      >
        {/* HEADER - Azul Petróleo Profundo */}
        <div className="bg-petroleum px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {headerIcon && (
              <div className="text-gold scale-90">{headerIcon}</div>
            )}
            <div>
              <h2 className="text-sm text-white font-bold uppercase tracking-luxury-widest leading-none">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[10px] font-bold uppercase tracking-luxury text-gold mt-1.5 opacity-90">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* CORPO - Branco (Aqui é onde a informação aparece limpa) */}
        <div className="bg-white flex-1 overflow-y-auto no-scrollbar">
          {topBanner && (
            <div className="border-b border-petroleum/10">{topBanner}</div>
          )}

          <div className="p-5">
            {/* Borda interna Petroleum sutil seguindo a estética do formulário */}
            <div className="border border-petroleum/20 rounded-luxury p-4 bg-white shadow-sm">
              {children}
            </div>
          </div>
        </div>

        {/* FOOTER - Azul Petróleo Profundo */}
        {footer && (
          <div className="bg-petroleum px-6 py-4 border-t border-white/10 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
