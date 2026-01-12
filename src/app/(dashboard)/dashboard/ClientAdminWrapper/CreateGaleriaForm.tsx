'use client';

import { useState } from 'react';
import SubmitButton from '@/components/ui/SubmitButton';
import { createGaleria } from '@/core/services/galeria.service';
import GalleryFormContent, { prepareGalleryData } from './GalleryFormContent';
import GalleryModalLayout from './GalleryModalLayout';

export default function CreateGaleriaForm({ onSuccess, onClose }) {
  const [isSuccess, setIsSuccess] = useState(false);

  // ESTADOS ELEVADOS PARA O PAI
  const [showCoverInGrid, setShowCoverInGrid] = useState(true);
  const [gridBgColor, setGridBgColor] = useState('#FFF9F0'); // Cor champagne
  const [columns, setColumns] = useState({ mobile: 2, tablet: 3, desktop: 4 });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Agora as variáveis existem neste escopo!
    const data = prepareGalleryData(new FormData(e.currentTarget), {
      showCoverInGrid,
      gridBgColor,
      columns,
    });

    try {
      const result = await createGaleria(data);
      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess(true, 'Galeria criada com sucesso!');
          onClose();
          setIsSuccess(false);
        }, 1500);
      } else {
        onSuccess(false, result.error || 'Erro ao criar galeria.');
      }
    } catch (err) {
      onSuccess(false, 'Erro de conexão.');
    }
  };

  return (
    <GalleryModalLayout
      isEdit={false}
      title="Nova Galeria"
      onClose={onClose}
      submitButton={
        <SubmitButton
          form="create-form"
          success={isSuccess}
          label="Salvar Alterações"
        />
      }
    >
      <form id="create-form" onSubmit={handleSubmit}>
        <GalleryFormContent
          isEdit={false}
          // PASSANDO ESTADOS E SETTERS PARA O CONTEÚDO
          customization={{ showCoverInGrid, gridBgColor, columns }}
          setCustomization={{ setShowCoverInGrid, setGridBgColor, setColumns }}
          onPickerError={(msg) => onSuccess(false, msg)}
        />
      </form>
    </GalleryModalLayout>
  );
}
