'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createGaleria, updateGaleria } from '@/core/services/galeria.service';
import { SubmitButton } from '@/components/ui';
import SecondaryButton from '@/components/ui/SecondaryButton';
import GaleriaFormContent from '../GaleriaFormContent';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
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
  const [showConsentAlert, setShowConsentAlert] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // 🎯 ESTADOS DE CUSTOMIZAÇÃO COM VALORES PADRÃO
  const [isPublic, setIsPublic] = useState(() => {
    if (galeria) {
      return galeria.is_public === true || galeria.is_public === 'true';
    }
    return true;
  });
  const [showCoverInGrid, setShowCoverInGrid] = useState(() => {
    if (galeria) {
      return (
        galeria.show_cover_in_grid === true ||
        galeria.show_cover_in_grid === 'true'
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

  const breadcrumbs = isEdit
    ? [
        { label: 'Galerias', href: '/dashboard' },
        {
          label: galeria?.title || 'Galeria',
          href: `/dashboard/galerias/${galeria?.id}/edit`,
        },
        { label: 'Editar' },
      ]
    : [
        { label: 'Galerias', href: '/dashboard' },
        { label: 'Nova Galeria' },
      ];

  return (
    <div className="min-h-screen bg-luxury-bg">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
          {/* Sidebar com Breadcrumbs */}
          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <Breadcrumbs items={breadcrumbs} />
              <button
                onClick={() => router.back()}
                className="mt-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors w-full flex items-center justify-center gap-2"
                aria-label="Voltar"
              >
                <ArrowLeft size={16} />
                <span className="text-xs font-medium">Voltar</span>
              </button>
            </div>
          </aside>

          {/* Conteúdo Principal */}
          <div className="flex-1">
            {/* Breadcrumbs Mobile */}
            <div className="lg:hidden mb-4 flex items-center justify-between">
              <Breadcrumbs items={breadcrumbs} />
              <button
                onClick={() => router.back()}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} />
              </button>
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 md:p-6">
              <form ref={formRef} id="galeria-form" onSubmit={handleSubmit}>
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
                />
              </form>
            </div>

            {/* Footer com Botões */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-end gap-3">
                <SecondaryButton
                  label="Cancelar"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="min-w-[120px]"
                />
                <SubmitButton
                  form="galeria-form"
                  success={isSuccess}
                  disabled={loading}
                  className="min-w-[120px]"
                  label={
                    loading
                      ? 'Salvando...'
                      : isEdit
                        ? 'Salvar'
                        : 'Criar'
                  }
                />
              </div>
            </div>
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
