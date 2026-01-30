'use client';

import { useState, useEffect } from 'react';
import { Database } from 'lucide-react';
import { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';

interface LGPDPurposeFieldProps {
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  fieldName: string; // Ex: 'settings.defaults.data_treatment_purpose'
  initialValue?: string;
  required?: boolean;
}

const FINALIDADES_PADRAO = [
    "Identificação para acesso à galeria",
    "Envio de link das fotos via whatsapp/e-mail",
    "Comunicações sobre a seleção e prova de fotos",
    "Envio de ofertas de novos ensaios e promoções do organizador",
    "segurança e controle de acesso ao conteúdo",
  ];

  export function LGPDPurposeField({ register, setValue, watch, fieldName, initialValue, required = false }: LGPDPurposeFieldProps) {
    // Inicialização inteligente do estado baseada no valor existente
    const [isCustomPurpose, setIsCustomPurpose] = useState(() => {
      if (!initialValue) return false;
      return !FINALIDADES_PADRAO.includes(initialValue);
    });
  
    const leadPurpose = watch(fieldName);
  
    return (
      <div className="space-y-1.5 animate-in fade-in duration-500">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-2 mb-0 font-sans">
            <Database size={12} className="text-gold" /> finalidade do tratamento
          </label>
  
          {/* Tooltip de Informação */}
          <div className="group relative flex items-center">
            <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-petroleum/40 text-petroleum/60 hover:border-gold transition-colors cursor-help">
              <span className="text-[10px] font-semibold font-sans">?</span>
            </div>
            <div className="absolute bottom-full left-0 mb-3 w-72 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] border border-white/10 font-sans">
              <p>
                Conforme a <strong className="text-gold">LGPD</strong>, você deve informar a finalidade específica do tratamento dos dados ao visitante.
              </p>
              <div className="absolute top-full left-2 border-8 border-transparent border-t-slate-900" />
            </div>
          </div>
        </div>
  
        <select
          className="w-full bg-white border border-petroleum/20 rounded-luxury px-3 h-11 text-[13px] text-petroleum outline-none focus:border-gold transition-all appearance-none cursor-pointer font-sans"
          value={isCustomPurpose ? 'custom' : leadPurpose}
          required={required}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'custom') {
              setIsCustomPurpose(true);
              setValue(fieldName, '', { shouldDirty: true });
            } else {
              setIsCustomPurpose(false);
              setValue(fieldName, val, { shouldDirty: true });
            }
          }}
        >
          <option value="" disabled>selecione uma opção...</option>
          {FINALIDADES_PADRAO.map((item, idx) => (
            <option key={idx} value={item}>{item}</option>
          ))}
          <option value="custom" className="font-bold">outra finalidade (digitar texto)...</option>
        </select>
  
        {isCustomPurpose && (
          <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
            <p className="text-[11px] text-petroleum italic mb-1 font-semibold font-sans">
              Descreva a finalidade personalizada:
            </p>
            <textarea
              {...register(fieldName)}
              placeholder="ex: coleta para fins de sorteio durante o evento..."
              className="w-full bg-white border border-petroleum/20 rounded-luxury p-3 text-[13px] text-petroleum outline-none focus:border-gold transition-all min-h-[80px] resize-none font-sans"
              required={required && isCustomPurpose}
            />
          </div>
        )}
      </div>
    );
  }