'use client';
import { GALLERY_CATEGORIES } from '@/constants/categories';
import { ChevronDown } from 'lucide-react'; // Usando Lucide para manter a consistência de ícones

export default function CategorySelect({ value, onChange }) {
  return (
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full pl-4 pr-10 bg-white border border-slate-200 rounded-[0.5rem] 
                   text-slate-900 text-[13px] font-medium h-10
                   focus:border-[#D4AF37] outline-none appearance-none cursor-pointer
                   invalid:text-slate-400 transition-all shadow-sm group-hover:border-slate-300"
      >
        <option value="" disabled hidden>
          Selecione a categoria
        </option>
        {GALLERY_CATEGORIES.map((cat) => (
          <option
            key={cat.id}
            value={cat.id}
            className="bg-white text-slate-900"
          >
            {cat.label}
          </option>
        ))}
      </select>

      {/* Seta Ajustada - Mais visível e elegante */}
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[#D4AF37] transition-colors">
        <ChevronDown size={16} strokeWidth={2} />
      </div>
    </div>
  );
}
