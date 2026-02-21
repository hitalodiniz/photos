'use client';

import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'pin' | 'compact';
}

export default function PasswordInput({
  label,
  error,
  className,
  value,
  onChange,
  variant = 'default',
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pinValue = String(value || '');

  const focusInput = () => inputRef.current?.focus();

  useEffect(() => {
    if (props.autoFocus) focusInput();
  }, [props.autoFocus]);

  useEffect(() => {
    if (error) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 400);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Variante COMPACT PIN (Para quando há Leads)
  if (variant === 'compact') {
    return (
      <div className="flex flex-col space-y-0 w-full">
        <div
          className={`flex items-center justify-between px-4 py-2 rounded-xl border transition-all duration-300 ${error ? 'border-red-500/50 bg-red-500/5' : 'border-petroleum/10'}`}
        >
          <div className="flex items-center gap-2 shrink-0">
            <label>
              <ShieldCheck
                size={18}
                className={error ? 'text-red-500' : 'text-gold'}
              />
              Senha PIN
            </label>
          </div>

          <div
            className={`relative flex items-center gap-2 cursor-pointer ${isShaking ? 'animate-shake' : ''}`}
            onClick={focusInput}
          >
            <input
              {...props}
              id="pin-hidden-input"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={value}
              onChange={onChange}
              onFocus={() => setHasFocus(true)}
              onBlur={() => setHasFocus(false)}
              className="absolute inset-0 opacity-0 z-10 cursor-pointer"
            />

            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => {
                const char = pinValue[i];
                const isFocused = pinValue.length === i;
                return (
                  <div
                    key={i}
                    className={`w-10 h-12 flex items-center justify-center text-lg font-bold rounded-lg border-2 transition-all duration-200 relative
                      ${error ? 'border-red-500 text-red-500' : char ? 'border-gold bg-gold/5 text-petroleum' : 'border-petroleum/20 bg-white'}
                      ${isFocused && hasFocus && !error ? 'border-gold ring-4 ring-gold/10 scale-105' : ''}`}
                  >
                    {char ? (showPassword ? char : '•') : null}

                    {/* CURSOR PISCANTE CENTRALIZADO */}
                    {isFocused && hasFocus && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[2px] h-5 bg-gold animate-cursor-blink shadow-[0_0_5px_rgba(212,175,55,0.5)]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPassword(!showPassword);
              }}
              className="ml-2 p-2 text-petroleum/30 hover:text-gold z-20"
            >
              {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>
        {error && (
          <p className="text-red-500 text-[10px] font-bold text-right uppercase tracking-tighter">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Variante PIN (Luxo - Full)
  if (variant === 'pin') {
    return (
      <div className="flex flex-col items-center space-y-8 w-full py-6">
        {label && (
          <div className="flex flex-col items-center gap-3">
            <ShieldCheck
              size={32}
              strokeWidth={1}
              className={`${error ? 'text-red-500' : 'text-gold'}`}
            />
            <h2
              className={`text-xl font-semibold tracking-[0.2em] uppercase text-center ${error ? 'text-red-500' : 'text-petroleum'}`}
            >
              {label}
            </h2>
          </div>
        )}

        <div
          className={`relative cursor-pointer ${isShaking ? 'animate-shake' : ''}`}
          onClick={focusInput}
        >
          <input
            {...props}
            id="pin-hidden-input"
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={value}
            onChange={onChange}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setHasFocus(false)}
            className="absolute inset-0 opacity-0 z-10 cursor-pointer"
            autoFocus
          />

          <div className="flex gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => {
              const char = pinValue[i];
              const isFocused = pinValue.length === i;

              return (
                <div
                  key={i}
                  className={`w-12 h-16 md:w-16 md:h-20 flex items-center justify-center text-3xl font-light border-2 rounded-lg transition-all duration-300 relative
                  ${
                    error
                      ? 'border-red-500 text-red-500 bg-red-50/5'
                      : char
                        ? 'border-gold text-petroleum bg-petroleum/[0.02]'
                        : 'border-petroleum/10 bg-white/5'
                  }
                  ${isFocused && hasFocus && !error ? 'border-gold scale-105 shadow-xl ring-1 ring-gold/20' : ''}`}
                >
                  {char ? (showPassword ? char : '•') : null}

                  {/* CURSOR PISCANTE */}
                  {isFocused && hasFocus && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[2px] h-8 bg-gold animate-cursor-blink shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p
          className={`text-[10px] uppercase tracking-[0.3em] font-medium text-center ${error ? 'text-red-500 font-bold' : 'text-petroleum/80'}`}
        >
          {error || 'Acesso Restrito • Insira o PIN de 4 dígitos'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-fit">
      {label && (
        <label className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-petroleum/60 font-semibold">
          <ShieldCheck size={14} className="text-gold" />
          <span>{label}</span>
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            {...props}
            type={showPassword ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={value}
            onChange={onChange}
            className={`input-luxury w-[32px] text-center px-0 tracking-widest ${className} ${error ? 'border-red-500/50' : ''}`}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-petroleum/40 hover:text-gold transition-colors p-1.5 bg-white/5 rounded-md border border-white/10"
        >
          {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>
      {error && (
        <p className="text-red-500/80 text-[9px] font-bold tracking-wider uppercase max-w-[150px]">
          {error}
        </p>
      )}
    </div>
  );
}
