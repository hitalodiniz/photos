'use client';
import { useState, useEffect } from 'react';
import { X, Camera, Plus } from 'lucide-react';
import { createGaleria, updateGaleria } from '@/core/services/galeria.service';
import { SubmitButton } from '@/components/ui';
import GalleryFormContent, { prepareGalleryData } from './GalleryFormContent';
import SecondaryButton from '@/components/ui/SecondaryButton';

export default function GalleryModal({
  galeria = null,
  isOpen,
  onClose,
  onSuccess,
}) {
  const isEdit = !!galeria;
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Estados de customização (Unificados aqui)
  const [showCoverInGrid, setShowCoverInGrid] = useState(true);
  const [gridBgColor, setGridBgColor] = useState('#FFF9F0');
  const [columns, setColumns] = useState({ mobile: 2, tablet: 3, desktop: 4 });

  useEffect(() => {
    if (isOpen) {
      if (galeria) {
        // Modo Edição: Carrega do banco
        setShowCoverInGrid(
          galeria.show_cover_in_grid === true ||
            galeria.show_cover_in_grid === 'true',
        );
        setGridBgColor(galeria.grid_bg_color || '#FFF9F0');
        setColumns({
          mobile: Number(galeria.columns_mobile) || 2,
          tablet: Number(galeria.columns_tablet) || 3,
          desktop: Number(galeria.columns_desktop) || 4,
        });
      } else {
        // ✅ IMPORTANTE: Se for NOVA galeria, só resetamos se os estados estiverem
        // diferentes do padrão inicial, mas evite resetar se o usuário já estiver mexendo.
        // Uma forma segura é resetar apenas quando isOpen muda de false para true.
      }
    }
  }, [galeria, isOpen]); // Remova dependências desnecessárias aqui

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Aqui usamos diretamente os estados do GalleryModal
    const data = prepareGalleryData(new FormData(e.currentTarget), {
      showCoverInGrid, // Estado do Pai
      gridBgColor, // Estado do Pai
      columns, // Estado do Pai
    });

    // LOG DE DEBUG: Verifique no console se os dados estão corretos antes de enviar
    console.log('Dados sendo enviados:', Object.fromEntries(data));

    try {
      const result = isEdit
        ? await updateGaleria(galeria.id, data)
        : await createGaleria(data);
      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess(true, { ...galeria, ...Object.fromEntries(data) }); // Retorno simplificado
          onClose();
          setIsSuccess(false);
        }, 1200);
      } else {
        onSuccess(false, result.error);
      }
    } catch {
      onSuccess(false, 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
      <div className="w-full max-w-4xl max-h-[95vh] bg-white rounded-[24px] shadow-2xl flex flex-col border border-white/20 overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between py-3 px-8 border-b bg-[#FAF7ED]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37]">
              {isEdit ? <Camera size={18} /> : <Plus size={18} />}
            </div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isEdit ? 'Editar Galeria' : 'Nova Galeria'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORM CONTENT */}
        <div className="p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
          <form id="master-gallery-form" onSubmit={handleSubmit}>
            <GalleryFormContent
              initialData={galeria}
              isEdit={isEdit}
              customization={{ showCoverInGrid, gridBgColor, columns }}
              setCustomization={{
                setShowCoverInGrid,
                setGridBgColor,
                setColumns,
              }}
              onPickerError={(msg: string) => onSuccess(false, msg)}
            />
          </form>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50/50 border-t flex justify-between px-8">
          <SecondaryButton label="Cancelar" onClick={onClose} />
          <div className="w-[240px]">
            <SubmitButton
              form="master-gallery-form"
              success={isSuccess}
              label={
                loading
                  ? 'PROCESSANDO...'
                  : isEdit
                    ? 'SALVAR ALTERAÇÕES'
                    : 'CRIAR GALERIA'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
