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
  const [coverFileId, setCoverFileId] = useState("");
  const [driveFolderName, setDriveFolderName] = useState('Nenhuma pasta selecionada');
  const [error, setError] = useState<string | null>(null);

  const handleFolderSelect = (folderId: string, folderName: string, coverFileId: string) => {
    setDriveFolderId(folderId);
    setDriveFolderName(folderName);
    setCoverFileId(coverFileId);
    setError(null);
  };

  const handlePickerError = (message: string) => {
    setError(message);
    setDriveFolderId("");
    setCoverFileId("");
    setDriveFolderName('Nenhuma pasta selecionada');
  };

  // FUNÇÃO CORRIGIDA: Agora vinculada ao onSubmit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 1. Validação prévia (impede o envio se faltar a pasta)
    if (!driveFolderId) {
      onSuccess(false, "Por favor, selecione uma pasta no Google Drive.");
      return;
    }

    // 2. Validação de senha para galerias privadas
    if (!isPublic && password.length < 4) {
      onSuccess(false, "A senha deve ter pelo menos 4 dígitos.");
      return;
    }

    // 3. Captura os dados dos inputs (Título, Nome, Data, etc.)
    const formData = new FormData(e.currentTarget);

    // 4. Injeta os estados manuais (Google Drive e Privacidade)
    // Usamos .set() para garantir que o valor seja único e substitua qualquer lixo
    formData.set("is_public", String(isPublic));
    formData.set("drive_folder_id", driveFolderId);
    formData.set("drive_folder_name", driveFolderName);
    formData.set("cover_image_url", coverFileId || driveFolderId);

    // Garante que o WhatsApp vá sem máscara para o banco
    formData.set("client_whatsapp", clientWhatsapp.replace(/\D/g, ""));

    // Se for privada, garante que a senha vá no FormData
    if (!isPublic && password) {
      formData.set("password", password);
    }

    // LOG DE DEBUG: Abra o console do navegador e veja se os dados aparecem aqui
    console.log("Dados que estão saindo para o servidor:", Object.fromEntries(formData.entries()));

    try {
      const result = await createGaleria(formData);

      if (result.success) {
        // 5. LIMPEZA: Só ocorre se o servidor responder sucesso
        formRef.current?.reset();
        setPassword("");
        setClientWhatsapp("");
        setDriveFolderId("");
        setCoverFileId("");
        setDriveFolderName('Nenhuma pasta selecionada');
        setIsPublic(true);

        onSuccess(true, "Galeria criada com sucesso!");
      } else {
        // O erro do servidor aparece no Toast, mas o formulário NÃO reseta
        onSuccess(false, result.error || "Erro ao criar galeria no banco de dados.");
      }
    } catch (err) {
      console.error("Erro na comunicação com a Action:", err);
      onSuccess(false, "Erro de conexão. Verifique sua internet.");
    }
  };

  return (
    // IMPORTANTE: Mudamos de 'action' para 'onSubmit'
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="drive_folder_id" value={driveFolderId} />
      <input type="hidden" name="drive_folder_name" value={driveFolderName} />
      <input type="hidden" name="cover_image_url" value={coverFileId || driveFolderId} />
      <input type="hidden" name="is_public" value={String(isPublic)} />
      <div>
        <label className="text-xs font-medium ml-1 text-gray-700">Nome do cliente</label>
        <input
          name="clientName"
          required
          className="w-full bg-[#F0F4F9] p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium ml-1 text-gray-700">WhatsApp</label>
        <input
          value={clientWhatsapp}
          onChange={(e) => setClientWhatsapp(maskPhone(e))}
          maxLength={15}
          className="w-full bg-[#F0F4F9] p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="(00) 00000-0000"
        />
      </div>

      <div>
        <label className="text-xs font-medium ml-1 text-gray-700">Título da Galeria</label>
        <input name="title" required className="w-full bg-[#F0F4F9] p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium ml-1 text-gray-700">Data</label>
          <input name="date" type="date" required className="w-full bg-[#F0F4F9] p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="text-xs font-medium ml-1 text-gray-700">Local</label>
          <input name="location" className="w-full bg-[#F0F4F9] p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* SEÇÃO GOOGLE DRIVE */}
      <div className="rounded-xl border border-dashed border-gray-300 p-4 bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          <label className="text-xs font-bold tracking-wider text-gray-600 uppercase">
            Conteúdo do Google Drive
          </label>
        </div>

        <GooglePickerButton
          onFolderSelect={handleFolderSelect}
          onError={handlePickerError}
          currentDriveId={driveFolderId}
        />

        {driveFolderId ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-medium truncate">Pasta vinculada: {driveFolderName}</span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-400 italic">Nenhuma pasta vinculada ainda.</p>
        )}
      </div>

      {error && (
        <div className="mt-2 p-3 bg-red-100 text-sm border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
          <span className="font-bold">!</span> {error}
        </div>
      )}

      {/* Opções de Privacidade */}
      <div className="pt-2 border-t space-y-3">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="w-4 h-4 text-blue-600" />
            Galeria Pública
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="w-4 h-4 text-blue-600" />
            Galeria Privada
          </label>
        </div>

        {!isPublic && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="text-[10px] font-bold text-gray-500 ml-1 uppercase">Senha de Acesso</label>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="w-full bg-[#F0F4F9] p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="4 a 8 dígitos"
              required={!isPublic}
            />
          </div>
        )}
      </div>
      <SubmitButton />
    </form>
  );
}