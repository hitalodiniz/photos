'use client';

import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function PasswordInput({ label, error, className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-2">
          <ShieldCheck size={14} className="text-gold" />
          <span>{label}</span>
          
        </label>
      )}
      <div className="relative group">
        <input
          {...props}
          type={showPassword ? 'text' : 'password'}
          inputMode="numeric"
                    pattern="[0-9]*"
          className={`w-full bg-white border ${
            error ? 'border-red-500/50' : 'border-petroleum/20'
          } rounded-luxury px-4 pr-12 h-11 text-petroleum text-sm outline-none focus:border-gold transition-all placeholder:text-petroleum/30 ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-petroleum/40 hover:text-gold transition-colors p-1"
        >
          {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
      {error && (
        <p className="text-red-500/80 text-[9px] font-semibold tracking-wider uppercase">
          {error}
        </p>
      )}
    </div>
  );
}
