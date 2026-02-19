'use client';

import { LeadCaptureFields } from './LeadCaptureFields';

import { LGPDPurposeField } from './LGPDPurposeField';

import {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';

import { PlanGuard } from '@/components/auth/PlanGuard';

import { Lock } from 'lucide-react';

import { usePlan } from '@/core/context/PlanContext';

import UpgradeModal from '@/components/ui/UpgradeModal';

import React from 'react';
import { div } from 'framer-motion/client';

interface LeadCaptureSectionProps {
  enabled: boolean;

  setEnabled: (enabled: boolean) => void;

  requiredFields: string[];

  setRequiredFields: (fields: string[]) => void;

  register: UseFormRegister<any>;

  setValue: UseFormSetValue<any>;

  watch: UseFormWatch<any>;

  purposeFieldName: string;

  initialPurposeValue?: string;

  toggleLabel?: string;

  description?: string;

  isEdit?: boolean;

  showLayout?: 'stacked' | 'grid';

  // No longer need to pass setUpsellFeature down from parent
  // setUpsellFeature: React.Dispatch<React.SetStateAction<{ label: string; feature: string; } | null>>;
}

export function LeadCaptureSection({
  enabled,

  setEnabled,

  requiredFields,

  setRequiredFields,

  register,

  setValue,

  watch,

  purposeFieldName,

  initialPurposeValue,

  toggleLabel = 'Habilitar cadastro de visitante',

  description,

  isEdit = false,

  showLayout = 'stacked',
}: LeadCaptureSectionProps) {
  const { permissions } = usePlan();

  const canCaptureLeads = permissions.canCaptureLeads;

  const isFeatureLocked = !canCaptureLeads;

  // 🎯 LÓGICA DE EXIBIÇÃO:
  // Se o plano está bloqueado, forçamos a visualização dos campos internos
  // para o usuário ver o que está perdendo (efeito vitrine).
  const shouldShowFields = !canCaptureLeads || enabled;

  return (
    <div className="flex flex-col gap-4">
      <PlanGuard feature="canCaptureLeads" label={toggleLabel}>
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-4">
            <label htmlFor="lead-capture-toggle">{toggleLabel}</label>

            <button
              id="lead-capture-toggle"
              type="button"
              onClick={() => {
                if (!isFeatureLocked) {
                  setEnabled(!enabled);
                }
              }}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${enabled ? 'bg-gold' : 'bg-slate-200'}`}
              disabled={isFeatureLocked}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>

          {!isEdit && description && (
            <p className="text-[10px] text-petroleum/60 dark:text-slate-400 italic">
              {description}
            </p>
          )}
        </div>

        {shouldShowFields && (
          <div
            className={
              showLayout === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 gap-6 items-start'
                : 'space-y-6'
            }
          >
            <div className="w-full">
              <LeadCaptureFields
                requiredFields={requiredFields}
                onChange={setRequiredFields}
                className={
                  showLayout === 'grid'
                    ? 'flex flex-wrap gap-4 p-3 h-11 items-center'
                    : undefined
                }
              />
            </div>

            <div className="w-full">
              <LGPDPurposeField
                register={register}
                setValue={setValue}
                watch={watch}
                fieldName={purposeFieldName}
                initialValue={initialPurposeValue}
                required={enabled}
              />
            </div>
          </div>
        )}
      </PlanGuard>
    </div>
  );
}
