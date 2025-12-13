"use client";

import { useState, useRef } from "react";
import { SubmitButton } from "@/components/DashboardUI";
import GooglePickerButton from "@/components/GooglePickerButton";
import { maskPhone } from "@/utils/masks";
import { createGaleria } from "@/actions/galeria";

export default function CreateGaleriaForm({ onSuccess }) {
  const formRef = useRef<HTMLFormElement>(null);

  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [driveFolderId, setDriveFolderId] = useState("");

  const handleSubmit = async (formData: FormData) => {
    if (!driveFolderId) {
      onSuccess(false, "Selecione uma pasta do Google Drive.");
      return;
    }

    formData.append("isPublic", isPublic.toString());
    formData.append("drive_folder_id", driveFolderId);

    if (!isPublic) {
      if (password.length < 4) {
        onSuccess(false, "A senha deve ter pelo menos 4 dígitos.");
        return;
      }
      formData.append("password", password);
    }

    const result = await createGaleria(formData);

    if (result.success) {
      formRef.current?.reset();
      setPassword("");
      setClientWhatsapp("");
      setDriveFolderId("");
      setIsPublic(true);
      onSuccess(true, "Galeria criada com sucesso!");
    } else {
      onSuccess(false, result.error || "Erro ao criar galeria.");
    }
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium ml-1">Nome do cliente</label>
        <input
          name="clientName"
          required
          className="w-full bg-[#F0F4F9] p-3 rounded-lg"
        />
      </div>

      <div>
        <label className="text-xs font-medium ml-1">WhatsApp</label>
        <input
          value={clientWhatsapp}
          onChange={(e) => setClientWhatsapp(maskPhone(e))}
          maxLength={15}
          className="w-full bg-[#F0F4F9] p-3 rounded-lg"
        />
        <input type="hidden" name="clientWhatsapp" value={clientWhatsapp} />
      </div>

      <div>
        <label className="text-xs font-medium ml-1">Título</label>
        <input name="title" required className="w-full bg-[#F0F4F9] p-3 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium ml-1">Data</label>
          <input name="date" type="date" required className="w-full bg-[#F0F4F9] p-3 rounded-lg" />
        </div>

        <div>
          <label className="text-xs font-medium ml-1">Local</label>
          <input name="location" className="w-full bg-[#F0F4F9] p-3 rounded-lg" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium ml-1">Pasta do Google Drive</label>
        <GooglePickerButton onFolderSelect={setDriveFolderId} currentDriveId={driveFolderId} />
      </div>

      <div className="pt-2 border-t space-y-3">
        <label className="flex items-center gap-2">
          <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} />
          Galeria Pública
        </label>

        <label className="flex items-center gap-2">
          <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} />
          Galeria Privada
        </label>

        {!isPublic && (
          <input
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="w-full bg-[#F0F4F9] p-3 rounded-lg"
            placeholder="Senha (4-8 dígitos)"
          />
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
