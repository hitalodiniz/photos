'use client';

import { useState } from 'react';
import { Tag, AlertCircle } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import { usePlan } from '@/core/context/PlanContext';
import UpgradeModal from '@/components/ui/UpgradeModal';

export const DEFAULT_SPECIALTIES = [
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
  selected = [],
  onAdd,
  initialCustoms = [],
  onCustomsChange,
}: {
  selected: string[];
  onAdd: (value: string) => void;
  initialCustoms?: string[];
  onCustomsChange?: (customs: string[]) => void;
}) {
  const { permissions } = usePlan();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customList, setCustomList] = useState<string[]>(
    Array.isArray(initialCustoms) ? initialCustoms : [],
  );
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const availableDefaults = DEFAULT_SPECIALTIES.filter(
    (s) => !selected.includes(s),
  );
  const availableCustom = customList.filter((s) => !selected.includes(s));
  const hasOptions = availableDefaults.length > 0 || availableCustom.length > 0;

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

    const updatedList = [...customList, name];
    setCustomList(updatedList);
    onCustomsChange?.(updatedList);
    onAdd(name);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="relative group">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value === 'NEW') {
              handleAddNew();
            } else {
              onAdd(e.target.value);
            }
          }}
          className="w-full pl-4 pr-10 bg-white border border-slate-200 rounded-luxury text-petroleum/90 text-[13px] font-medium h-10 focus:border-gold outline-none appearance-none cursor-pointer transition-all"
        >
          <option value="" disabled hidden>
            {hasOptions ? '+ Adicionar especialidade' : 'Todas selecionadas'}
          </option>

          {availableDefaults.length > 0 && (
            <optgroup
              label="Especialidades Padrão"
              className="text-[10px] uppercase font-bold text-slate-400"
            >
              {availableDefaults.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </optgroup>
          )}

          {availableCustom.length > 0 && (
            <optgroup
              label="Minhas Personalizadas"
              className="text-[10px] uppercase font-bold text-slate-400"
            >
              {availableCustom.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </optgroup>
          )}

          <option value="NEW" className="text-gold font-bold">
            + Criar nova área...
          </option>
        </select>
      </div>

      {/* 🎯 FIX: featureKey e scenarioType adicionados (antes estavam ausentes) */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureName="Especialidades Personalizadas"
        featureKey="canCustomCategories"
        scenarioType="feature"
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
