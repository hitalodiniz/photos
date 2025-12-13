// components/GaleriaView.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface DrivePhoto {
  id: string;
  name: string;
  thumbnailUrl: string;
  webViewUrl: string;
}

interface Galeria {
  id: string;
  title: string;
  client_name: string;
  date: string;
  cover_image_url: string | null;
  drive_folder_id: string | null;
}

interface GaleriaViewProps {
  galeria: Galeria;
  photos: DrivePhoto[];
}

export default function GaleriaView({ galeria, photos }: GaleriaViewProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  return (
    <div className="min-h-screen bg-[#F8FAFD] p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg border border-[#E0E3E7] p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#1F1F1F] mb-1">
            {galeria.title}
          </h1>

          <p className="text-sm text-[#444746]">
            Cliente: <span className="font-medium">{galeria.client_name}</span> •{" "}
            {new Date(galeria.date).toLocaleDateString("pt-BR")}
          </p>
        </header>

        {(!photos || photos.length === 0) ? (
          <div className="rounded-xl border border-dashed border-[#E0E3E7] p-10 text-center text-[#444746]">
            Nenhuma foto encontrada nesta galeria.
            <br />
            (Verifique a pasta do Google Drive configurada)
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                className="relative cursor-pointer group overflow-hidden rounded-xl"
                whileHover={{ scale: 1.02 }}
                onClick={() => openLightbox(index)}
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {lightboxIndex !== null && photos[lightboxIndex] && (
            <motion.div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.img
                src={photos[lightboxIndex].webViewUrl || photos[lightboxIndex].thumbnailUrl}
                alt={photos[lightboxIndex].name}
                className="max-w-[90%] max-h-[90%] rounded-xl shadow-2xl"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
              />

              <button
                onClick={closeLightbox}
                className="absolute top-6 right-6 text-white text-3xl font-light hover:opacity-80"
              >
                ×
              </button>

              {lightboxIndex > 0 && (
                <button
                  onClick={() => setLightboxIndex((i) => (i! - 1))}
                  className="absolute left-6 text-white text-4xl hover:opacity-80"
                >
                  ‹
                </button>
              )}

              {lightboxIndex < photos.length - 1 && (
                <button
                  onClick={() => setLightboxIndex((i) => (i! + 1))}
                  className="absolute right-6 text-white text-4xl hover:opacity-80"
                >
                  ›
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
