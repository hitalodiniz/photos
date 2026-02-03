'use client';
import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface EditorialCardProps {
  title: string;
  items?: string[]; // Opcional, caso use children
  icon: React.ReactNode;
  accentColor?: string;
  children?: React.ReactNode; // Permite inserir os indicadores originais
  badge?: string;
}

export default function EditorialCard({
  title,
  items,
  icon,
  accentColor = '#B8860B',
  children,
  badge,
}: EditorialCardProps) {
  return (
    <div className="bg-slate-50 rounded-3xl overflow-visible shadow-lg flex flex-col relative border border-slate-100 group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 h-full">
      {badge && (
        <div className="absolute -top-3 right-6 bg-gold text-petroleum text-[9px] font-black uppercase tracking-tighter px-3 py-1 rounded-full z-20 shadow-sm">
          {badge}
        </div>
      )}

      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl transition-all duration-500 group-hover:w-3"
        style={{ backgroundColor: accentColor }}
      />

      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-petroleum flex items-center justify-center text-white shadow-xl z-10 transition-transform group-hover:scale-110">
        {icon}
      </div>

      <div className="p-8 pt-16 flex flex-col h-full">
        <h3 className="text-petroleum text-xl font-semibold text-center leading-tight mb-8">
          {title}
        </h3>

        {/* Slot para o conteúdo dinâmico (Preços, Indicadores, CTAs) */}
        <div className="flex-grow flex flex-col">{children}</div>

        {items && items.length > 0 && (
          <ul className="space-y-4 mt-6 text-left border-t border-slate-200 pt-6">
            {items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-slate-900 text-[12px] font-medium leading-tight"
              >
                <CheckCircle2
                  size={16}
                  className="text-gold shrink-0"
                  strokeWidth={2.5}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
