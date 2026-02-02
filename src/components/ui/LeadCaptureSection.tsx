'use client';

import { LeadCaptureFields } from './LeadCaptureFields';
import { LGPDPurposeField } from './LGPDPurposeField';
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';

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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-4">
          <label className="text-[11px] font-semibold uppercase tracking-luxury-widest text-petroleum">
            {toggleLabel}
          </label>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${enabled ? 'bg-gold' : 'bg-slate-200'}`}
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

      {enabled && (
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
              labelClassName={
                showLayout === 'grid'
                  ? 'text-[11px] font-bold uppercase tracking-luxury-widest text-petroleum mb-0'
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
    </div>
  );
}
