// src/app/dashboard/ClientAdminWrapper/EditGaleriaModal.tsx
"use client";

import { useState, useEffect } from "react";
import { updateGaleria } from "@/actions/galeria";
import { maskPhone } from "@/utils/masks";
import GooglePickerButton from "@/components/GooglePickerButton";
import { X } from "lucide-react";
import type { Galeria } from "./types";

interface EditGaleriaModalProps {
  galeria: Galeria | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (success: boolean, data: any) => void;
}

export default function EditGaleriaModal({ galeria, isOpen, onClose, onSuccess }: EditGaleriaModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  // Estado para controlar campos que vêm do Google Picker
  const [formData, setFormData] = useState({
    drive_folder_id: "",
    drive_folder_name: "",
    cover_image_url: ""
  });

  // Sincroniza o estado local quando a galeria para editar é carregada
  useEffect(() => {
    if (galeria) {
      setIsPublic(galeria.is_public);
      setFormData({
        drive_folder_id: galeria.drive_folder_id || "",
        drive_folder_name: galeria.drive_folder_name || "",
        cover_image_url: galeria.cover_image_url || ""
      });
      setErrorMessage(null);
    }
  }, [galeria]);

  if (!isOpen || !galeria) return null;

  const handlePickerSuccess = (folderId: string, folderName: string, coverFileId: string) => {
    setFormData({
      drive_folder_id: folderId,
      folder_name: folderName, // Mantendo consistência com o que o Picker envia
      cover_image_url: coverFileId
    } as any);
    
    // Atualiza o nome da pasta especificamente para exibição
    setFormData(prev => ({ ...prev, drive_folder_name: folderName }));
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("1. Form submit disparado!"); 

    setLoading(true);
    setErrorMessage(null);

    try {
      const data = new FormData(e.currentTarget);
      
      // LOG para conferir o que está sendo enviado
      console.log("2. Dados extraídos do form:", Object.fromEntries(data.entries()));

      if (!galeria?.id) throw new Error("ID da galeria ausente.");

      const result = await updateGaleria(galeria.id, data);
      console.log("3. Resposta da Server Action:", result);

      if (result.success) {
        // Montamos o objeto de retorno para atualizar a lista no Index imediatamente
        const updatedData = {
          ...galeria,
          title: data.get("title") as string,
          client_name: data.get("clientName") as string,
          location: data.get("location") as string,
          date: data.get("date") as string,
          client_whatsapp: (data.get("clientWhatsapp") as string || "").replace(/\D/g, ""),
          is_public: isPublic,
          drive_folder_id: formData.drive_folder_id,
          drive_folder_name: formData.drive_folder_name,
          cover_image_url: formData.cover_image_url,
        };

        console.log("4. Sucesso! Enviando para o Index.");
        onSuccess(true, updatedData);
        onClose();
      } else {
        setErrorMessage(result.error || "Erro ao atualizar galeria.");
      }
    } catch (err: any) {
      console.error("Erro no handleSubmit:", err);
      setErrorMessage("Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-gray-900">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Editar Galeria</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* CAMPOS OCULTOS (Garantem que os dados do Picker e Privacidade cheguem na Action) */}
          <input type="hidden" name="is_public" value={String(isPublic)} />
          <input type="hidden" name="drive_folder_id" value={formData.drive_folder_id} />
          <input type="hidden" name="drive_folder_name" value={formData.drive_folder_name} />
          <input type="hidden" name="cover_image_url" value={formData.cover_image_url} />

          {/* Título e Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Título da Galeria</label>
              <input name="title" defaultValue={galeria.title} required className="w-full bg-gray-50 p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Nome do Cliente</label>
              <input name="clientName" defaultValue={galeria.client_name} required className="w-full bg-gray-50 p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
          </div>

          {/* Data, Local e WhatsApp */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Data</label>
              <input name="date" type="date" defaultValue={galeria.date?.split('T')[0]} required className="w-full bg-gray-50 p-3 rounded-xl border outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Local</label>
              <input name="location" defaultValue={galeria.location} className="w-full bg-gray-50 p-3 rounded-xl border outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">WhatsApp</label>
              <input
                name="clientWhatsapp"
                defaultValue={maskPhone({ target: { value: galeria.client_whatsapp } } as any)}
                onChange={(e) => { e.target.value = maskPhone(e) }}
                className="w-full bg-gray-50 p-3 rounded-xl border outline-none"
              />
            </div>
          </div>

          {/* Google Drive Section */}
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-white rounded-lg shadow-sm">
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              </div>
              <label className="text-xs font-bold text-blue-700 uppercase">Vínculo com Google Drive</label>
            </div>

            <GooglePickerButton
              onFolderSelect={handlePickerSuccess}
              currentDriveId={formData.drive_folder_id}
              onError={(msg) => setErrorMessage(msg)}
            />

            <p className="mt-3 text-[13px] text-blue-800 font-semibold bg-white/50 p-2 rounded-lg border border-blue-100 truncate">
              Pasta Atual: {formData.drive_folder_name || "Não selecionada"}
            </p>
          </div>

          {/* Exibição de Erros */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Opções de Acesso */}
          <div className="pt-2 border-t">
            <label className="text-[11px] font-bold text-gray-400 uppercase mb-3 block">Privacidade</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="w-4 h-4 text-blue-600" />
                <span className={`text-sm ${isPublic ? 'font-bold text-blue-600' : 'text-gray-500'}`}>Pública</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="w-4 h-4 text-red-600" />
                <span className={`text-sm ${!isPublic ? 'font-bold text-red-600' : 'text-gray-500'}`}>Privada</span>
              </label>
            </div>
          </div>

          {!isPublic && (
            <div className="animate-in slide-in-from-top-1">
              <input
                name="password"
                type="text"
                placeholder="Nova senha (deixe vazio para manter a atual)"
                className="w-full bg-red-50 p-3 rounded-xl border border-red-100 outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="flex justify-end gap-3 pt-6 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 font-semibold text-gray-500 hover:bg-gray-100 rounded-full transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-200 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}