'use client';
import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface EditorialCardProps {
  title: string;
  items?: string[];
  icon: React.ReactNode;
  // Alterado: agora aceita o nome da cor ou uma classe utilitária
  accentColor?: 'gold' | 'petroleum';
  children?: React.ReactNode;
  badge?: string;
}

export default function EditorialCard({
  title,
  items,
  icon,
  accentColor = 'gold', // Default agora é a variável CSS
  children,
  badge,
}: EditorialCardProps) {
  // Mapeamento de classes para garantir que o Tailwind encontre os tokens
  const accentClasses = {
    gold: 'bg-gold',
    petroleum: 'bg-petroleum',
  };

  return (
    <div className="z-10 hover:z-50 bg-white rounded-3xl overflow-visible shadow-lg flex flex-col relative border border-slate-100 group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 h-full">
      {badge && (
        <div className="absolute top-3 right-2 bg-gold text-petroleum text-[9px] font-semibold uppercase tracking-tighter px-3 py-1 rounded-full z-20 shadow-sm">
          {badge}
        </div>
      )}

      {/* 🎯 Ajuste: Agora usa a classe dinâmica em vez de style inline */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl transition-all duration-500 group-hover:w-3 ${accentClasses[accentColor]}`}
      />

      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-petroleum/90 flex items-center justify-center text-white shadow-xl z-10 transition-transform group-hover:scale-110">
        {icon}
      </div>

      <div className="p-6 pt-12 flex flex-col h-full">
        <h3 className="text-petroleum text-xl font-semibold text-center leading-tight mb-4">
          {title}
        </h3>

        <div className="flex-grow flex flex-col">{children}</div>

        {items && items.length > 0 && (
          <ul className="space-y-4 text-left border-t border-slate-200 pt-6">
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
