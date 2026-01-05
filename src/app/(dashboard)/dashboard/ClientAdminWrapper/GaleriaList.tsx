// src/app/dashboard/ClientAdminWrapper/GaleriaList.tsx
'use client';

import GaleriaCard from './GaleriaCard';
import type { Galeria } from '@/core/types/galeria';

interface GaleriaListProps {
  galerias: Galeria[];
  onEdit: (g: Galeria) => void;
  onDelete: (g: Galeria) => void;
  isDeleting: boolean;
  updatingId: string | null;
}

export default function GaleriaList({
  galerias,
  onEdit,
  onDelete,
  isDeleting,
  updatingId,
}: GaleriaListProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {galerias.map((g) => (
          <GaleriaCard
            key={g.id}
            galeria={g}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={isDeleting}
            isUpdating={updatingId === g.id}
          />
        ))}
      </div>{' '}
    </div>
  );
}
