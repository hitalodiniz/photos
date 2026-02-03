'use client';

import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function PasswordInput({
  label,
  error,
  className,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <label>
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
          className={`input-luxury ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-petroleum hover:text-gold transition-colors p-1"
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
