"use client";

import { useState, useRef } from "react";
import { SubmitButton } from "@/components/sections/DashboardUI";
import {GooglePickerButton} from "@/components/google-drive";
import { maskPhone } from "@/utils/masks";
import { createGaleria } from "@/actions/galeria";
import { Lock, Unlock, Calendar, MapPin, User, Type, FolderSync } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!driveFolderId) {
      onSuccess(false, "Por favor, selecione uma pasta no Google Drive.");
      return;
    }

    if (!isPublic && password.length < 4) {
      onSuccess(false, "A senha deve ter pelo menos 4 dígitos.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("is_public", String(isPublic));
    formData.set("drive_folder_id", driveFolderId);
    formData.set("drive_folder_name", driveFolderName);
    formData.set("cover_image_url", coverFileId || driveFolderId);
    formData.set("client_whatsapp", clientWhatsapp.replace(/\D/g, ""));

    if (!isPublic && password) {
      formData.set("password", password);
    }

    try {
      const result = await createGaleria(formData);
      if (result.success) {
        formRef.current?.reset();
        setPassword("");
        setClientWhatsapp("");
        setDriveFolderId("");
        setCoverFileId("");
        setDriveFolderName('Nenhuma pasta selecionada');
        setIsPublic(true);
        onSuccess(true, "Galeria criada com sucesso!");
      } else {
        onSuccess(false, result.error || "Erro ao criar galeria.");
      }
    } catch (err) {
      onSuccess(false, "Erro de conexão. Verifique sua internet.");
    }
  };

  // Estilos padronizados
  const inputStyle = "w-full bg-[#F8F9FA] border border-gray-200 p-3 rounded-xl outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-sm text-[#4F5B66] font-medium transition-all placeholder:text-gray-300";
  const labelStyle = "text-sm font-bold text-[#4F5B66] mb-1.5 flex items-center gap-2 ml-1";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="drive_folder_id" value={driveFolderId} />
      <input type="hidden" name="drive_folder_name" value={driveFolderName} />
      <input type="hidden" name="cover_image_url" value={coverFileId || driveFolderId} />
      <input type="hidden" name="is_public" value={String(isPublic)} />

      {/* Nome do Cliente */}
      <div>
        <label className={labelStyle}><User size={14} className="text-[#D4AF37]" /> Nome do cliente</label>
        <input name="clientName" required className={inputStyle} placeholder="Ex: Maria Silva" />
      </div>

      {/* WhatsApp */}
      <div>
        <label className={labelStyle}>WhatsApp</label>
        <input
          value={clientWhatsapp}
          onChange={(e) => setClientWhatsapp(maskPhone(e))}
          maxLength={15}
          className={inputStyle}
          placeholder="(00) 00000-0000"
        />
      </div>

      {/* Título da Galeria */}
      <div>
        <label className={labelStyle}><Type size={14} className="text-[#D4AF37]" /> Título da galeria</label>
        <input name="title" required className={inputStyle} placeholder="Ex: Ensaio Pré-Wedding" />
      </div>

      {/* Data */}
      <div>
        <label className={labelStyle}><Calendar size={14} className="text-[#D4AF37]" /> Data</label>
        <input name="date" type="date" required className={inputStyle} />
      </div>

      {/* Local (Agora abaixo da data) */}
      <div>
        <label className={labelStyle}><MapPin size={14} className="text-[#D4AF37]" /> Local</label>
        <input name="location" className={inputStyle} placeholder="Cidade/UF" />
      </div>

      {/* SEÇÃO GOOGLE DRIVE */}
      
      <div className="rounded-2xl border border-[#D4AF37]/20 p-3 bg-[#FAF7ED]">
        <div className="flex items-center gap-2 mb-2 text-[#D4AF37]">
          <FolderSync size={16} />
          <label className="text-sm font-bold tracking-wider">
            Google Drive
          </label>
        </div>

        <GooglePickerButton
          onFolderSelect={handleFolderSelect}
          onError={handlePickerError}
          currentDriveId={driveFolderId}
        />

        {driveFolderId ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#4F5B66] bg-white/60 p-3 rounded-lg border border-[#D4AF37]/10">
            <div className="h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span className="font-bold truncate">{driveFolderName}</span>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-gray-400 italic font-medium">Nenhuma pasta vinculada.</p>
        )}
      </div>

      {/* Opções de Privacidade */}
      <div className="pt-2 border-t border-gray-50">
        <div className="flex gap-8 mb-2">
          <label className={`flex items-center gap-3 cursor-pointer text-sm font-bold tracking-widest transition-all ${isPublic ? 'text-[#D4AF37]' : 'text-slate-300'}`}>
            <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="hidden" />
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isPublic ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-slate-200'}`}>
              {isPublic && <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />}
            </div>
            <Unlock size={16} /> Pública
          </label>

          <label className={`flex items-center gap-3 cursor-pointer text-sm font-bold tracking-widest transition-all ${!isPublic ? 'text-[#D4AF37]' : 'text-slate-300'}`}>
            <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="hidden" />
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${!isPublic ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-slate-200'}`}>
              {!isPublic && <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />}
            </div>
            <Lock size={16} /> Privada
          </label>
        </div>

        {!isPublic && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className={labelStyle}>Senha de acesso</label>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className={inputStyle}
              placeholder="Mínimo 4 dígitos"
              required={!isPublic}
            />
          </div>
        )}
      </div>

      {/* Botão Salvar Champanhe */}
      <div className="pt-2">
        <SubmitButton
        />
      </div>
    </form>
  );
}