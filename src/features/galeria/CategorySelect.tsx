'use client';
import { GALLERY_CATEGORIES } from '@/core/config/categories';
import { ChevronDown, Plus, Lock } from 'lucide-react';
import { usePlan } from '@/hooks/usePlan'; // Nosso hook de autoridade

export default function CategorySelect({ value, onChange, onAddNew }) {
  const { permissions } = usePlan();

  return (
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === 'ADD_NEW_ACTION') {
            onAddNew?.(); // Abre o modal de nova categoria
          } else {
            onChange(e.target.value);
          }
        }}
        required
        className="w-full pl-4 pr-10 bg-white border border-petroleum/40 rounded-luxury 
                   text-petroleum/90 text-[13px] font-medium h-10
                   focus:border-gold outline-none appearance-none cursor-pointer
                   invalid:text-petroleum/40 transition-all group-hover:border-petroleum/60"
      >
        <option value="" disabled hidden>
          Selecione a categoria
        </option>

        <optgroup label="Padrão do Sistema">
          {GALLERY_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </optgroup>

        {/* 🎯 GATILHO PARA NOVA CATEGORIA (CONDICIONAL) */}
        <optgroup label="Personalização">
          {permissions.canCustomCategories ? (
            <option value="ADD_NEW_ACTION" className="text-gold font-bold">
              + Criar nova categoria...
            </option>
          ) : (
            <option disabled className="text-petroleum/30">
              🔒 Nova categoria (Plano Plus)
            </option>
          )}
        </optgroup>
      </select>

      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-petroleum/60 group-hover:text-gold transition-colors">
        <ChevronDown size={16} strokeWidth={2} />
      </div>
    </div>
  );
}
