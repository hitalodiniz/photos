'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createGaleria, updateGaleria } from '@/core/services/galeria.service';
import { SubmitButton } from '@/components/ui';
import GaleriaFormContent from '../GaleriaFormContent';
import type { Galeria } from '@/core/types/galeria';
import { Toast } from '@/components/ui';
import GoogleConsentAlert from '@/components/auth/GoogleConsentAlert';

interface PhotographerProfile {
  id: string;
  username: string;
  full_name: string;
  google_refresh_token?: string | null;
}

interface GaleriaFormPageProps {
  galeria: Galeria | null;
  isEdit: boolean;
  initialProfile: PhotographerProfile;
}

export default function GaleriaFormPage({
  galeria,
  isEdit,
  initialProfile,
}: GaleriaFormPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formTitle, setFormTitle] = useState(galeria?.title || '');
  const [showConsentAlert, setShowConsentAlert] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // 🎯 ESTADOS DE CUSTOMIZAÇÃO COM VALORES PADRÃO
  const [showCoverInGrid, setShowCoverInGrid] = useState(() => {
    if (galeria) {
      return (
        galeria.show_cover_in_grid === true ||
        String(galeria.show_cover_in_grid) === 'true'
      );
    }
    return false;
  });
  const [gridBgColor, setGridBgColor] = useState(
    galeria?.grid_bg_color || '#FFFFFF',
  );
  const [columns, setColumns] = useState({
    mobile: galeria?.columns_mobile || 2,
    tablet: galeria?.columns_tablet || 3,
    desktop: galeria?.columns_desktop || 4,
  });

  // 🎯 UX: Auto-focus no primeiro campo
  useEffect(() => {
    setTimeout(() => {
      const firstInput = formRef.current?.querySelector(
        'input[type="text"], input[type="date"], select',
      ) as HTMLInputElement;
      firstInput?.focus();
    }, 100);
  }, []);

  // 🎯 UX: Trava scroll do body quando página está ativa
  useEffect(() => {
    document.body.style.overflow = 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const driveId = formData.get('drive_folder_id') as string;
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const selectedCategory = formData.get('category') as string;
    const hasClient = formData.get('has_contracting_client') === 'true';
    const clientName = formData.get('client_name') as string;
    const password = formData.get('password') as string;
    const isPublicValue = formData.get('is_public') === 'true';

    // Validações
    if (!title?.trim()) {
      setToast({ message: 'O título é obrigatório.', type: 'error' });
      return;
    }
    if (!date) {
      setToast({ message: 'A data é obrigatória.', type: 'error' });
      return;
    }
    if (!selectedCategory || selectedCategory === 'undefined') {
      setToast({ message: 'Selecione uma categoria.', type: 'error' });
      return;
    }
    if (!driveId || driveId === '' || driveId === 'null') {
      setToast({ message: 'Selecione uma pasta do Drive.', type: 'error' });
      return;
    }
    if (hasClient && !clientName?.trim()) {
      setToast({ message: 'Nome do cliente é obrigatório.', type: 'error' });
      return;
    }
    if (!isPublicValue) {
      const hasExistingPassword = isEdit && galeria?.password;
      if (!hasExistingPassword && !password) {
        setToast({
          message: 'Defina uma senha para a galeria privada.',
          type: 'error',
        });
        return;
      }
      if (!password || password.length < 4 || password.length > 8) {
        setToast({
          message: 'A senha privada deve ter entre 4 e 8 números.',
          type: 'error',
        });
        return;
      }
    }

    setLoading(true);

    formData.set('is_public', String(isPublicValue));
    formData.set('show_cover_in_grid', String(showCoverInGrid));
    formData.set('grid_bg_color', gridBgColor);
    formData.set('columns_mobile', String(columns.mobile));
    formData.set('columns_tablet', String(columns.tablet));
    formData.set('columns_desktop', String(columns.desktop));

    const whatsappRaw = formData.get('client_whatsapp') as string;
    if (whatsappRaw) formData.set('client_whatsapp', whatsappRaw.replace(/\D/g, ''));

    if (!hasClient) {
      formData.set('client_name', 'Cobertura');
      formData.set('client_whatsapp', '');
    }

    try {
      const result = isEdit
        ? await updateGaleria(galeria!.id, formData)
        : await createGaleria(formData);

      if (result.success) {
        setIsSuccess(true);
        setHasUnsavedChanges(false);
        setToast({
          message: isEdit ? 'Galeria atualizada com sucesso!' : 'Galeria criada com sucesso!',
          type: 'success',
        });
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 1500);
      } else {
        setToast({
          message: result.error || 'Falha ao salvar.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Erro no handleSubmit:', error);
      setToast({ message: 'Erro de conexão.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* FORM CONTENT - Layout Duas Colunas (65/35) */}
      <div className="flex-1 overflow-hidden">
        <div className="w-full max-w-7xl mx-auto h-full">
          <form
            ref={formRef}
            id="galeria-form"
            onSubmit={handleSubmit}
            className="h-full"
            onChange={() => setHasUnsavedChanges(true)}
          >
            <GaleriaFormContent
              initialData={galeria}
              isEdit={isEdit}
              customization={{ showCoverInGrid, gridBgColor, columns }}
              setCustomization={{
                setShowCoverInGrid,
                setGridBgColor,
                setColumns,
              }}
              onPickerError={(msg: string) =>
                setToast({ message: msg, type: 'error' })
              }
              onTokenExpired={() => setShowConsentAlert(true)}
              onTitleChange={setFormTitle}
            />
          </form>
        </div>
      </div>

      {/* STICKY FOOTER - Azul Petróleo Profundo */}
      <div className="sticky bottom-0 z-50 bg-petroleum border-t border-white/10">
        <div className="flex items-center justify-between px-6">
          {/* Status de Salvamento - Esquerda */}
          <div className="text-[10px] text-white/70 uppercase tracking-widest">
            {hasUnsavedChanges ? 'Alterações não salvas' : 'Tudo salvo'}
          </div>

          {/* Botões - Direita */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="text-[10px] font-bold uppercase tracking-widest text-white hover:text-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
            >
              CANCELAR
            </button>
            <SubmitButton
              form="galeria-form"
              success={isSuccess}
              className="px-6"
              label={
                loading
                  ? 'Salvando...'
                  : isEdit
                    ? 'SALVAR ALTERAÇÕES'
                    : 'CRIAR GALERIA'
              }
            />
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <GoogleConsentAlert
        isOpen={showConsentAlert}
        onClose={() => setShowConsentAlert(false)}
        onConfirm={() => {
          setShowConsentAlert(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
