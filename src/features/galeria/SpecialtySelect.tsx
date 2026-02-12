'use client';

import { useState } from 'react';
import { Tag, Plus, X, AlertCircle } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import { usePlan } from '@/core/context/PlanContext';
import UpgradeModal from '@/components/ui/UpgradeModal';

// Especialidades padrão para o nicho de fotografia/vídeo
const DEFAULT_SPECIALTIES = [
  'Casamentos',
  'Ensaios Gestante',
  'Eventos Corporativos',
  'Formatura',
  'Moda',
  'Gastronomia',
  'Arquitetura',
  'Publicidade',
];

export default function SpecialtySelect({
  value,
  onChange,
  initialCustoms = [],
}) {
  const { permissions } = usePlan();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customList, setCustomList] = useState<string[]>(initialCustoms);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const handleAddNew = () => {
    if (!permissions.canCustomCategories) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setIsModalOpen(true);
    setError('');
    setNewName('');
  };

  const saveNew = () => {
    const name = newName.trim();
    if (!name) return;

    if (
      [...DEFAULT_SPECIALTIES, ...customList].some(
        (s) => s.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setError('Esta especialidade já existe.');
      return;
    }

    //Criamos a nova lista explicitamente para enviar ao pai
    const updatedList = [...customList, name];

    setCustomList(updatedList);

    // 🎯 Enviamos o nome da nova categoria E a lista completa atualizada
    onChange(name, updatedList);

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="relative group">
        <select
          value={value}
          onChange={(e) =>
            e.target.value === 'NEW' ? handleAddNew() : onChange(e.target.value)
          }
          className="w-full pl-4 pr-10 bg-white border border-slate-200 rounded-luxury text-petroleum/90 text-[13px] font-medium h-10 focus:border-gold outline-none appearance-none cursor-pointer transition-all"
        >
          <option value="" disabled hidden>
            Selecione sua área principal
          </option>

          <optgroup
            label="Especialidades Padrão"
            className="text-[10px] uppercase font-bold text-slate-400"
          >
            {DEFAULT_SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </optgroup>

          {customList.length > 0 && (
            <optgroup
              label="Minhas Personalizadas"
              className="text-[10px] uppercase font-bold text-slate-400"
            >
              {customList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </optgroup>
          )}

          <option value="NEW" className="text-gold font-bold">
            + Adicionar nova área...
          </option>
        </select>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureName="Especialidades Personalizadas"
      />

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Área de Atuação"
        subtitle="Como você se define profissionalmente?"
        headerIcon={<Tag size={18} />}
        footer={
          <button
            onClick={saveNew}
            className="btn-luxury-primary w-full py-2.5 text-[10px]"
          >
            SALVAR ESPECIALIDADE
          </button>
        }
      >
        <div className="space-y-4">
          <input
            autoFocus
            className="w-full bg-slate-50 border border-slate-200 rounded-luxury px-4 h-12 text-sm outline-none focus:border-gold"
            placeholder="Ex: Newborn, Pet Photography..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveNew()}
          />
          {error && (
            <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1">
              <AlertCircle size={12} /> {error}
            </p>
          )}
        </div>
      </BaseModal>
    </div>
  );
}
