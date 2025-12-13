"use client";

import GaleriaCard from "./GaleriaCard";
import { Galeria } from "./types";

export default function GaleriaList({
  galerias,
  onEdit,
  onDelete,
  isDeleting,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {galerias.map((g) => (
        <GaleriaCard
          key={g.id}
          galeria={g}
          onEdit={onEdit}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
}
