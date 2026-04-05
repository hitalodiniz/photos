'use client';

import { useState } from 'react';
import { Toast } from '@/components/ui';

interface ToastState {
  message: string;
  type: 'success' | 'error';
  position?: 'left' | 'right';
}

/**
 * 🍞 useToast
 *
 * Centraliza o padrão de toast que estava duplicado em ~8 componentes.
 *
 * Uso:
 * ```tsx
 * const { showToast, ToastElement } = useToast();
 *
 * // Disparar:
 * showToast('Salvo com sucesso!');
 * showToast('Erro ao salvar.', 'error');
 * showToast('Arquivo removido.', 'success', 'left');
 *
 * // Renderizar (no final do JSX):
 * return <div>...{ToastElement}</div>
 * ```
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (
    message: string,
    type: 'success' | 'error' = 'success',
    position?: 'left' | 'right',
  ) => setToast({ message, type, position });

  const hideToast = () => setToast(null);

  const ToastElement = toast ? (
    <Toast
      message={toast.message}
      type={toast.type}
      position={toast.position}
      onClose={hideToast}
    />
  ) : null;

  return { showToast, hideToast, ToastElement };
}
