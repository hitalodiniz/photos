'use client';
import { useState } from 'react';
import { GALLERY_CATEGORIES } from '@/core/config/categories';
import { ChevronDown, Loader2, Tag, Plus, AlertCircle } from 'lucide-react';
import { updateCustomCategories } from '@/core/services/profile.service';
import BaseModal from '@/components/ui/BaseModal';

export default function CategorySelect({ value, onChange, initialCustomCategories = [] }) {
  const [customCategories, setCustomCategories] = useState<string[]>(initialCustomCategories);
  const [loading, setLoading] = useState(false);

  // Estados para o Modal de Criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const allCategories = [
    ...GALLERY_CATEGORIES,
    ...customCategories.map(cat => ({ id: cat, label: cat }))
  ];

  const handleOpenModal = () => {
    setNewCategoryName('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSaveCategory = async () => {
    const trimmedCat = newCategoryName.trim();

    if (!trimmedCat) {
      setErrorMessage('por favor, digite um nome para a categoria.');
      return;
    }

    if (allCategories.some(c => c.label.toLowerCase() === trimmedCat.toLowerCase())) {
      setErrorMessage('esta categoria já existe em sua lista.');
      return;
    }

    setLoading(true);
    const newList = [...customCategories, trimmedCat];

    const result = await updateCustomCategories(newList);

    if (result.success) {
      setCustomCategories(newList);
      onChange(trimmedCat);
      setIsModalOpen(false);
    } else {
      setErrorMessage("erro ao salvar: " + result.error);
    }
    setLoading(false);
  };

  const modalFooter = (
    <div className="flex gap-3 w-full">
      <button
        onClick={() => setIsModalOpen(false)}
        className="flex-1 px-4 py-2.5 rounded-luxury text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors border border-white/10"
      >
        cancelar
      </button>
      <button
        onClick={handleSaveCategory}
        disabled={loading}
        className="flex-1 bg-gold hover:bg-white text-petroleum px-4 py-2.5 rounded-luxury text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : 'salvar categoria'}
      </button>
    </div>
  );

  return (
    <>
      <div className="relative group">
        <select
          value={value}
          disabled={loading}
          onChange={(e) => {
            if (e.target.value === "ADD_NEW_TRIGGER") {
              handleOpenModal();
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

          <optgroup label="categorias padrão" className="text-petroleum font-semibold uppercase text-[10px]">
            {GALLERY_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </optgroup>

          {customCategories.length > 0 && (
            <optgroup label="minhas categorias" className="text-petroleum font-semibold uppercase text-[10px]">
              {customCategories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </optgroup>
          )}

          <option value="ADD_NEW_TRIGGER" className="text-petroleum font-semibold bg-champagne/10">
            + adicionar nova categoria...
          </option>
        </select>

        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-petroleum/60 group-hover:text-gold transition-colors">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Modal Editorial para Nova Categoria */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => !loading && setIsModalOpen(false)}
        title="nova categoria"
        subtitle="personalize a organização da sua galeria"
        headerIcon={<Tag size={18} />}
        maxWidth="sm"
        footer={modalFooter}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum/60">
              nome da categoria
            </label>
            <input
              autoFocus
              type="text"
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
              placeholder="ex: ensaio gestante"
              className="w-full bg-slate-50 border border-petroleum/20 rounded-luxury px-4 h-12 text-petroleum text-sm outline-none focus:border-gold transition-all"
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-luxury bg-red-50 border border-red-100 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                {errorMessage}
              </p>
            </div>
          )}
        </div>
      </BaseModal>
    </>
  );
}
