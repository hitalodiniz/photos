'use client';
import { useState } from 'react';
import { GALLERY_CATEGORIES } from '@/core/config/categories';
import { ChevronDown, Loader2 } from 'lucide-react';
import { updateCustomCategories } from '@/core/services/profile.service'; // Ajuste o path conforme seu projeto

export default function CategorySelect({ value, onChange, initialCustomCategories = [] }) {
  const [customCategories, setCustomCategories] = useState<string[]>(initialCustomCategories);
  const [loading, setLoading] = useState(false);

  // Combina as categorias estáticas com as do usuário
  const allCategories = [
    ...GALLERY_CATEGORIES,
    ...customCategories.map(cat => ({ id: cat, label: cat }))
  ];

  const handleAddNew = async () => {
    const newCat = prompt("digite o nome da nova categoria:");
    if (!newCat || newCat.trim() === "") return;

    const trimmedCat = newCat.trim();

    // Evita duplicados (case insensitive)
    if (allCategories.some(c => c.label.toLowerCase() === trimmedCat.toLowerCase())) {
      alert("esta categoria já existe.");
      return;
    }

    setLoading(true);
    const newList = [...customCategories, trimmedCat];

    // Chama a Server Action que criamos acima
    const result = await updateCustomCategories(newList);

    if (result.success) {
      setCustomCategories(newList);
      onChange(trimmedCat); // Seleciona a nova automaticamente
    } else {
      alert("erro ao salvar categoria: " + result.error);
    }
    setLoading(false);
  };

  return (
    <div className="relative group">
      <select
        value={value}
        disabled={loading}
        onChange={(e) => {
          if (e.target.value === "ADD_NEW_TRIGGER") {
            handleAddNew();
          } else {
            onChange(e.target.value);
          }
        }}
        required
        className="w-full pl-4 pr-10 bg-white border border-petroleum/40 rounded-luxury 
                   text-petroleum/90 text-[13px] font-medium h-10
                   focus:border-gold outline-none appearance-none cursor-pointer
                   disabled:opacity-50 transition-all group-hover:border-petroleum/60"
      >
        <option value="" disabled hidden>selecione a categoria</option>

        <optgroup label="categorias padrão" className="text-petroleum/40 font-bold">
          {GALLERY_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </optgroup>

        {customCategories.length > 0 && (
          <optgroup label="minhas categorias" className="text-gold font-bold">
            {customCategories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </optgroup>
        )}

        <option value="ADD_NEW_TRIGGER" className="text-gold font-bold bg-champagne/10">
          + adicionar nova categoria...
        </option>
      </select>

      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-petroleum/60 group-hover:text-gold transition-colors">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
      </div>
    </div>
  );
}