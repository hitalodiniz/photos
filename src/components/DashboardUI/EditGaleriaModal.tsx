// components/DashboardUI/EditGaleriaModal.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Galeria } from "@/app/dashboard/ClientAdminWrapper/types";
import GooglePickerButton from "@/components/GooglePickerButton";

interface EditGaleriaModalProps {
  galeriaToEdit: Galeria | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Galeria> & { isPublic: boolean }) => void;
}

export default function EditGaleriaModal({
  galeriaToEdit,
  isOpen,
  onClose,
  onUpdate,
}: EditGaleriaModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [driveFolderId, setDriveFolderId] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!galeriaToEdit) return;
    setTitle(galeriaToEdit.title ?? "");
    setDate(galeriaToEdit.date?.substring(0, 10) ?? "");
    setLocation(galeriaToEdit.location ?? "");
    setClientName(galeriaToEdit.client_name ?? "");
    setClientWhatsapp(galeriaToEdit.client_whatsapp ?? "");
    setDriveFolderId(galeriaToEdit.drive_folder_id ?? "");
    setIsPublic(galeriaToEdit.is_public ?? true);
    setPassword(galeriaToEdit.password ?? "");
  }, [galeriaToEdit]);

  const handleSave = () => {
    if (!galeriaToEdit) return;

    onUpdate(galeriaToEdit.id, {
      title,
      date,
      location,
      client_name: clientName,
      client_whatsapp: clientWhatsapp,
      drive_folder_id: driveFolderId,
      isPublic, // campo extra para o server decidir is_public/password
      password: isPublic ? null : password || galeriaToEdit.password,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && galeriaToEdit && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Editar galeria
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 ml-1">
                  Título
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-[#F0F4F9] p-2 text-sm outline-none ring-0 focus:ring-2 focus:ring-[#0B57D0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 ml-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-[#F0F4F9] p-2 text-sm outline-none ring-0 focus:ring-2 focus:ring-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 ml-1">
                    Local
                  </label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-[#F0F4F9] p-2 text-sm outline-none ring-0 focus:ring-2 focus:ring-[#0B57D0]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 ml-1">
                  Nome do cliente
                </label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-[#F0F4F9] p-2 text-sm outline-none ring-0 focus:ring-2 focus:ring-[#0B57D0]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 ml-1">
                  WhatsApp do cliente
                </label>
                <input
                  value={clientWhatsapp}
                  onChange={(e) => setClientWhatsapp(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-[#F0F4F9] p-2 text-sm outline-none ring-0 focus:ring-2 focus:ring-[#0B57D0]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 ml-1">
                  Pasta do Google Drive
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <GooglePickerButton
                    onFolderSelect={setDriveFolderId}
                    currentDriveId={driveFolderId}
                  />
                  {driveFolderId && (
                    <span className="truncate text-xs text-[#0B57D0]">
                      {driveFolderId}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 border-t border-gray-200 pt-3 space-y-2">
                <p className="text-xs font-medium text-gray-700">
                  Opções de acesso
                </p>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                  />
                  Galeria pública
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                  />
                  Galeria privada (com senha)
                </label>

                {!isPublic && (
                  <div>
                    <label className="text-xs font-medium text-gray-700 ml-1">
                      Senha (4–8 dígitos)
                    </label>
                    <input
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))
                      }
                      className="mt-1 w-full rounded-lg bg-[#F0F4F9] p-2 text-sm outline-none ring-0 focus:ring-2 focus:ring-[#0B57D0]"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="rounded-full bg-[#0B57D0] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#0842a4]"
              >
                Salvar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
