'use client';
import { GALLERY_CATEGORIES } from '@/constants/categories';
import { Group } from 'lucide-react';

export default function CategorySelect({
  value,
  onChange,
}: CategorySelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* Label padronizado com o formulário */}
      <label>
        <Group size={14} className="text-[#D4AF37]" />
        Categoria da galeria
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          // bg-black/5 ou similar para manter o cinza suave do formulário
          className="w-full p-4 bg-slate-100 border-none rounded-2xl text-slate-900 text-sm 
                     focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer
                     invalid:text-slate-400"
        >
          {/* OPÇÃO INICIAL VAZIA */}
          <option value="" disabled hidden>
            Selecione uma categoria
          </option>

          {GALLERY_CATEGORIES.map((cat) => (
            <option
              key={cat.id}
              value={cat.id}
              className="bg-white text-slate-900"
            >
              {cat.label} {cat.icon}
            </option>
          ))}
        </select>

        {/* Seta customizada */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <svg
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
