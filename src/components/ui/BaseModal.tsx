'use client';

import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  headerIcon?: ReactNode;
  footer?: ReactNode;
  topBanner?: ReactNode;
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
}: BaseModalProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-[1001] bg-petroleum/30 backdrop-blur-md flex items-center justify-center px-6 md:p-6 animate-in fade-in duration-500">
      <div className="absolute inset-0" onClick={onClose} />

      <div className={`w-full ${maxWidthClasses[maxWidth]} flex flex-col h-auto max-h-[90vh] relative shadow-2xl rounded-luxury overflow-hidden border border-white/10`}>
        
        {/* HEADER - Azul Petróleo Profundo */}
        <div className="bg-petroleum px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {headerIcon && <div className="text-gold scale-90">{headerIcon}</div>}
            <div>
              <h2 className="text-sm text-white font-bold uppercase tracking-widest leading-none">
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
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* CORPO - Branco com Bordas Internas (Estilo FormSection) */}
        <div className="bg-white flex-1 overflow-y-auto no-scrollbar">
          {topBanner && <div className="border-b border-petroleum/10">{topBanner}</div>}
          
          <div className="p-5">
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
}