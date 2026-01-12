'use client';
import { GALLERY_CATEGORIES } from '@/constants/categories';

export default function CategorySelect({ value, onChange }) {
  return (
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full px-4 py-3 bg-white border border-[#F3E5AB] rounded-xl text-slate-900 text-sm 
                   focus:border-gold focus:ring-4 focus:ring-gold/5 outline-none appearance-none cursor-pointer
                   invalid:text-slate-400 transition-all"
      >
        <option value="" disabled hidden>
          Selecione uma categoria
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

      {/* Seta refinada - Alinhada com o estilo luxo */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-gold transition-colors">
        <svg
          width="10"
          height="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          viewBox="0 0 24 24"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
