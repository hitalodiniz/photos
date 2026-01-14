'use client';

import { useState, useEffect } from 'react';
import { updateGaleria } from '@/core/services/galeria.service';
import GalleryFormContent, { prepareGalleryData } from './GalleryFormContent';
import { SubmitButton } from '@/components/ui';
import GalleryModalLayout from './GalleryModal';

export default function EditGaleriaModal({
  galeria,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // ESTADOS DE CUSTOMIZAÇÃO ELEVADOS (Inicializados com os dados da galeria)
  const [showCoverInGrid, setShowCoverInGrid] = useState(true);
  const [gridBgColor, setGridBgColor] = useState('#FFF9F0');
  const [columns, setColumns] = useState({ mobile: 2, tablet: 3, desktop: 4 });

  // SINCRONIZA ESTADOS QUANDO A GALERIA MUDA (Ao abrir o modal)
  useEffect(() => {
    if (galeria) {
      setShowCoverInGrid(galeria.show_cover_in_grid ?? true);
      setGridBgColor(galeria.grid_bg_color ?? '#FFF9F0');
      setColumns({
        mobile: galeria.columns_mobile ?? 2,
        tablet: galeria.columns_tablet ?? 3,
        desktop: galeria.columns_desktop ?? 4,
      });
    }
  }, [galeria]);

  if (!isOpen || !galeria) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const rawFormData = new FormData(e.currentTarget);
      const data = prepareGalleryData(rawFormData, {
        showCoverInGrid,
        gridBgColor,
        columns,
      });

      const result = await updateGaleria(galeria.id, data);

      if (result.success) {
        setIsSuccess(true);

        // CORREÇÃO: Use 'data.get' e mapeie para as colunas do banco
        const updatedData = {
          ...galeria,
          title: data.get('title') as string,
          client_name: data.get('client_name') as string,
          location: data.get('location') as string,
          date: data.get('date') as string,
          client_whatsapp: data.get('client_whatsapp') as string,
          is_public: data.get('is_public') === 'true',
          drive_folder_id: data.get('drive_folder_id') as string,
          drive_folder_name: data.get('drive_folder_name') as string,
          cover_image_url: data.get('cover_image_url') as string,
          category: data.get('category') as string,
          has_contracting_client: data.get('has_contracting_client') === 'true',
          show_cover_in_grid: showCoverInGrid,
          grid_bg_color: gridBgColor,
          columns_mobile: columns.mobile,
          columns_tablet: columns.tablet,
          columns_desktop: columns.desktop,
        };

        setTimeout(() => {
          onSuccess(true, updatedData);
          onClose();
          setIsSuccess(false);
        }, 1200);
      } else {
        onSuccess(false, result.error || 'Erro ao atualizar');
      }
    } catch (e) {
      onSuccess(false, 'Erro interno na atualização');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GalleryModalLayout
      isEdit={true}
      title="Editar Galeria"
      subtitle={galeria.title}
      onClose={onClose}
      submitButton={
        <SubmitButton
          form="edit-form"
          success={isSuccess}
          label={loading ? 'PROCESSANDO...' : 'SALVAR ALTERAÇÕES'}
        />
      }
    >
      <form id="edit-form" onSubmit={handleSubmit}>
        <GalleryFormContent
          key={galeria.id}
          initialData={galeria}
          isEdit={true}
          customization={{ showCoverInGrid, gridBgColor, columns }}
          setCustomization={{ setShowCoverInGrid, setGridBgColor, setColumns }}
          onPickerError={(msg) => onSuccess(false, msg)}
        />
      </form>
    </GalleryModalLayout>
  );
}
