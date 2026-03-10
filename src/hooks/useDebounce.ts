'use client';

import { useState, useEffect } from 'react';

/**
 * Retorna um valor debounced: só atualiza após `delayMs` sem novas mudanças.
 * Útil para disparar buscas apenas quando o usuário para de digitar.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
