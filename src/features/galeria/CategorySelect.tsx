'use client';
import { GALLERY_CATEGORIES } from '@/core/config/categories';
import { ChevronDown } from 'lucide-react'; // Usando Lucide para manter a consistência de ícones

export default function CategorySelect({ value, onChange }) {
  return (
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full pl-4 pr-10 bg-white border border-petroleum/40 rounded-luxury 
                   text-petroleum/90 text-[13px] font-medium h-10
                   focus:border-gold outline-none appearance-none cursor-pointer
                   invalid:text-petroleum/40 transition-all group-hover:border-petroleum/60"
      >
        <option value="" disabled hidden>
          Selecione a categoria
        </option>
        {GALLERY_CATEGORIES.map((cat) => (
          <option
            key={cat.id}
            value={cat.id}
            className="bg-white text-petroleum/90"
          >
            {cat.label}
          </option>
        ))}
      </select>

      {/* Seta Ajustada - Mais visível e elegante */}
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-petroleum/60 group-hover:text-gold transition-colors">
        <ChevronDown size={16} strokeWidth={2} />
      </div>
    </div>
  );
}
