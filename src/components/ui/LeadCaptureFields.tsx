'use client';

import { CheckCircle2 } from 'lucide-react';

interface LeadCaptureFieldsProps {
  requiredFields: string[];
  onChange: (fields: string[]) => void;
  title?: string;
  className?: string;
  labelClassName?: string;
}

export const LeadCaptureFields = ({
  requiredFields,
  onChange,
  title = 'Campos para captura',
  className = 'grid grid-cols-1 sm:grid-cols-3 gap-4 p-4',
  labelClassName = 'text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum',
}: LeadCaptureFieldsProps) => {
  const fields = [
    { id: 'name', label: 'Nome' },
    { id: 'email', label: 'E-mail' },
    { id: 'whatsapp', label: 'WhatsApp' },
  ];

  const toggleField = (fieldId: string) => {
    const isCurrentlyRequired = requiredFields.includes(fieldId);
    let newRequiredFields: string[];

    if (isCurrentlyRequired) {
      // 🛡️ Não permite desativar se for o último campo ativo
      if (requiredFields.length <= 1) return;
      newRequiredFields = requiredFields.filter((id) => id !== fieldId);
    } else {
      newRequiredFields = [...requiredFields, fieldId];
    }

    onChange(newRequiredFields);
  };

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 w-full">
      {title && <label className={labelClassName}>{title}</label>}
      <div
        className={`${className} bg-slate-50 rounded-luxury border border-petroleum/20 shadow-sm`}
      >
        {fields.map((field) => {
          const isRequired = requiredFields.includes(field.id);
          return (
            <div
              key={field.id}
              onClick={() => toggleField(field.id)}
              className="flex items-center gap-2 cursor-pointer group select-none"
            >
              <div
                className={`w-4 h-4 rounded border transition-all duration-300 flex items-center justify-center ${
                  isRequired
                    ? 'bg-gold border-gold scale-110 shadow-sm'
                    : 'bg-white border-petroleum/40 group-hover:border-gold/60'
                }`}
              >
                {isRequired && (
                  <CheckCircle2
                    size={10}
                    className="text-white animate-in zoom-in-50 duration-300"
                  />
                )}
              </div>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider transition-colors duration-300 ${
                  isRequired
                    ? 'text-petroleum'
                    : 'text-petroleum/60 group-hover:text-petroleum/80'
                }`}
              >
                {field.id === 'whatsapp'
                  ? 'Exigir WhatsApp'
                  : `Exigir ${field.label}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
