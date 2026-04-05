'use client';

import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'pin' | 'compact';
  themeKey?: string; // extraído antes do spread — não vai para o DOM
}

export default function PasswordInput({
  label,
  error,
  className,
  value,
  onChange,
  variant = 'default',
  themeKey, // ← extraído aqui, fora do ...props
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

  // Cor de acento via CSS variable — responde ao data-theme do wrapper
  const accentColor = 'rgb(var(--pub-bar-accent, var(--color-gold)))';
  const accentColorLight =
    'rgb(var(--pub-bar-accent, var(--color-gold)) / 0.1)';
  const accentRing = 'rgb(var(--pub-bar-accent, var(--color-gold)) / 0.2)';

  // ── COMPACT ──
  if (variant === 'compact') {
    return (
      <div
        className="flex flex-col space-y-0 w-full"
        {...(themeKey ? { 'data-theme': themeKey } : {})}
      >
        <div
          className={`flex items-center justify-between px-4 py-2 rounded-xl border transition-all duration-300 ${
            error ? 'border-red-500/50 bg-red-500/5' : 'border-petroleum/10'
          }`}
        >
          <div className="flex items-center gap-2 shrink-0">
            <label>
              <ShieldCheck
                size={18}
                style={{ color: error ? undefined : accentColor }}
                className={error ? 'text-red-500' : ''}
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
              className={`absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer ${className}`}
            />

            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => {
                const char = pinValue[i];
                const isFocused = pinValue.length === i;
                return (
                  <div
                    key={i}
                    className={`w-10 h-12 flex items-center justify-center text-lg font-bold rounded-lg border-2 transition-all duration-200 relative ${
                      error
                        ? 'border-red-500 text-red-500'
                        : 'border-petroleum/20 bg-white'
                    }`}
                    style={
                      !error && char
                        ? {
                            borderColor: accentColor,
                            backgroundColor: accentColorLight,
                            color: 'rgb(var(--color-petroleum))',
                          }
                        : isFocused && hasFocus && !error
                          ? {
                              borderColor: accentColor,
                              boxShadow: `0 0 0 4px ${accentRing}`,
                              transform: 'scale(1.05)',
                            }
                          : {}
                    }
                  >
                    {char ? (showPassword ? char : '•') : null}
                    {isFocused && hasFocus && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="w-[2px] h-5 animate-cursor-blink"
                          style={{
                            backgroundColor: accentColor,
                            boxShadow: `0 0 5px ${accentColorLight}`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={props.disabled}
              className={`ml-2 p-2 z-20 text-petroleum/40 hover:text-gold transition-colors bg-white/5 rounded-md border border-white/10 ${props.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowPassword(!showPassword);
              }}
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

  // ── PIN (full luxo) ──
  if (variant === 'pin') {
    return (
      <div
        className="flex flex-col items-center space-y-4 md:space-y-8 w-full py-4 md:py-6"
        {...(themeKey ? { 'data-theme': themeKey } : {})}
      >
        {label && (
          <div className="flex flex-col items-center gap-2 md:gap-3">
            <ShieldCheck
              size={24}
              strokeWidth={1.5}
              style={{ color: error ? undefined : accentColor }}
              className={`md:w-8 md:h-8 ${error ? 'text-red-500' : ''}`}
            />
            <h2
              className={`text-base md:text-xl font-semibold tracking-[0.15em] md:tracking-[0.2em] uppercase text-center ${
                error ? 'text-red-500' : 'text-petroleum'
              }`}
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

          <div className="flex gap-2 md:gap-4">
            {[...Array(4)].map((_, i) => {
              const char = pinValue[i];
              const isFocused = pinValue.length === i;
              return (
                <div
                  key={i}
                  className={`w-11 h-14 md:w-16 md:h-20 flex items-center justify-center text-2xl md:text-3xl font-light border-2 rounded-lg transition-all duration-300 relative ${
                    error
                      ? 'border-red-500 text-red-500 bg-red-50/5'
                      : 'border-petroleum/10 bg-white/5'
                  }`}
                  style={
                    !error && char
                      ? {
                          borderColor: accentColor,
                          color: 'rgb(var(--color-petroleum))',
                          backgroundColor: 'rgb(var(--color-petroleum) / 0.02)',
                        }
                      : isFocused && hasFocus && !error
                        ? {
                            borderColor: accentColor,
                            transform: 'scale(1.05)',
                            boxShadow: `0 20px 25px -5px rgba(0,0,0,0.1), 0 0 0 1px ${accentRing}`,
                          }
                        : {}
                  }
                >
                  {char ? (showPassword ? char : '•') : null}
                  {isFocused && hasFocus && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className="w-[2px] h-6 md:h-8 animate-cursor-blink"
                        style={{
                          backgroundColor: accentColor,
                          boxShadow: `0 0 8px ${accentColor}`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p
          className={`text-[9px] md:text-[10px] px-4 uppercase tracking-[0.2em] md:tracking-[0.3em] font-medium text-center ${
            error ? 'text-red-500 font-bold' : 'text-petroleum/60'
          }`}
        >
          {error || 'Acesso Restrito • Digite o PIN'}
        </p>
      </div>
    );
  }

  // ── DEFAULT ──
  return (
    <div
      className="space-y-1.5 w-fit"
      {...(themeKey ? { 'data-theme': themeKey } : {})}
    >
      {label && (
        <label className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-petroleum/60 font-semibold">
          <ShieldCheck size={16} style={{ color: accentColor }} />
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
            className={`input-luxury text-center px-1 text-lg h-10 placeholder:text-petroleum tracking-wider ${className} ${error ? 'border-red-500/50' : ''}`}
            style={{ width: '64px', minWidth: '64px' }}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-petroleum/80 hover:text-gold transition-colors p-1.5 bg-white/5 rounded-md border border-white/10"
        >
          {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
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
