'use client';

import { Loader2, Check } from 'lucide-react';
import { useFormStatus } from 'react-dom';

interface SubmitButtonProps {
  success: boolean;
  label?: string;
  form?: string;
  className?: string;
  disabled?: boolean;
  isPending?: boolean;
  icon?: React.ReactNode;
  disabledTooltip?: string;
}

export default function SubmitButton({
  success,
  label = 'Salvar',
  form,
  className = '',
  disabled = false,
  isPending: isPendingProp = false,
  icon,
  disabledTooltip,
}: SubmitButtonProps) {
  const { pending: formStatusPending } = useFormStatus();
  const isPending = isPendingProp || formStatusPending;
  const isDisabled = disabled || isPending || success;

  return (
    <button
      type="submit"
      form={form}
      disabled={isDisabled}
      title={disabled && !isPending ? disabledTooltip : ''}
      className={`btn-luxury-primary ${
        disabled && !isPending ? 'opacity-50 cursor-not-allowed' : ''
      } ${isPending ? 'cursor-wait' : ''} ${className}`}
    >
      <div className="relative z-10 flex items-center gap-2">
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
        ) : success ? (
          <Check
            className="h-3.5 w-3.5 animate-in zoom-in duration-500"
            strokeWidth={2.5}
          />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        <span>{isPending ? 'Salvando...' : success ? 'Salvo!' : label}</span>
      </div>
    </button>
  );
}