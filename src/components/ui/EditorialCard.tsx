'use client';
import React from 'react';

interface EditorialCardProps {
  title: string;
  icon: React.ReactNode;
  badge?: string; // Ex: "Recomendado", "Essencial", "Upgrade"
  isHighlighted?: boolean; // Se verdadeiro, aplica a borda dourada e escala
  children: React.ReactNode; // O conteúdo interno do card
  className?: string;
}

export default function EditorialCard({
  title,
  icon,
  badge,
  isHighlighted = false,
  children,
  className = '',
}: EditorialCardProps) {
  return (
    <div
      className={`relative bg-white/95 backdrop-blur-sm rounded-luxury flex flex-col transition-all duration-500 overflow-visible ${
        isHighlighted
          ? 'ring-2 ring-gold shadow-2xl z-20 scale-[1.02]'
          : 'border border-petroleum/10 shadow-lg z-10'
      } ${className}`}
    >
      {/* --- BADGE SUSPENSA (Ex: Recomendado) --- */}
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-[50] whitespace-nowrap">
          <span className="inline-flex items-center px-4 py-1.5 bg-gold text-petroleum text-[11px] font-semibold uppercase tracking-wider rounded-full shadow-2xl border border-white/20">
            {badge}
          </span>
        </div>
      )}

      {/* --- HEADER ENVOLVENTE PETROLEUM --- */}
      <div className="flex flex-col items-center text-center p-4 bg-petroleum relative rounded-t-luxury">
        <div
          className={`mb-3 p-2 bg-white/5 rounded-full text-white/90 ${isHighlighted ? 'text-gold' : ''}`}
        >
          {/* Garante que o ícone tenha o tamanho padrão se for passado como Lucide Icon */}
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement, {
                size: 28,
                strokeWidth: 1.5,
              })
            : icon}
        </div>
        <h3 className="text-[14px] font-semibold uppercase tracking-[0.2em] text-white">
          {title}
        </h3>
      </div>

      {/* --- CORPO DO CARD --- */}
      <div className="px-6 pt-2 pb-2 flex flex-col flex-grow">{children}</div>
    </div>
  );
}
