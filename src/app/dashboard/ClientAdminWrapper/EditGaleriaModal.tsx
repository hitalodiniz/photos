"use client";

import { useState, useEffect } from "react";
import { updateGaleria } from "@/actions/galeria";
import { maskPhone } from "@/utils/masks";
import GooglePickerButton from "@/components/GooglePickerButton";
import { X } from "lucide-react";

export default function EditGaleriaModal({ galeria, isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ ...galeria });
    const [isPublic, setIsPublic] = useState(galeria?.is_public ?? true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Sincroniza o estado quando a galeria mudar
    useEffect(() => {
        if (galeria) {
            setFormData({ ...galeria });
            setIsPublic(galeria.is_public);
        }
    }, [galeria]);

    if (!isOpen || !galeria) return null;

    const handlePickerSuccess = (folderId: string, folderName: string, coverFileId: string) => {
        setFormData(prev => ({
            ...prev,
            drive_folder_id: folderId,
            drive_folder_name: folderName,
            cover_image_url: coverFileId
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData(e.currentTarget);
        data.append("isPublic", isPublic.toString());
        data.append("driveFolderId", formData.drive_folder_id);
        data.append("driveFolderName", formData.drive_folder_name);
        data.append("coverFileId", formData.cover_image_url);

        const result = await updateGaleria(galeria.id, data);
        setLoading(false);

        if (result.success) {
            onSuccess(true, result.message);
            onClose();
        } else {
            onSuccess(false, result.error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Editar Galeria: {galeria.title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Título</label>
                            <input name="title" defaultValue={galeria.title} required className="w-full bg-gray-50 p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nome do Cliente</label>
                            <input name="clientName" defaultValue={galeria.client_name} required className="w-full bg-gray-50 p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Data</label>
                            <input name="date" type="date" defaultValue={galeria.date?.split('T')[0]} required className="w-full bg-gray-50 p-3 rounded-xl border" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">WhatsApp</label>
                            <input
                                name="clientWhatsapp"
                                defaultValue={maskPhone({ target: { value: galeria.client_whatsapp } } as any)}
                                onChange={(e) => e.target.value = maskPhone(e)}
                                className="w-full bg-gray-50 p-3 rounded-xl border"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <label className="text-xs font-bold text-blue-600 uppercase mb-2 block">Vínculo com Google Drive</label>
                        <GooglePickerButton
                            onFolderSelect={handlePickerSuccess}
                            currentDriveId={formData.drive_folder_id}
                            onError={(msg) => setErrorMessage(msg)}
                        />
                        {/* 2. ADICIONE ESTE BLOCO PARA EXIBIR O ERRO */}
                        {errorMessage && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex flex-col gap-1">
                                <p className="font-bold">Atenção:</p>
                                <p>{errorMessage}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="text-blue-600 underline text-left mt-1"
                                >
                                    Clique aqui para tentar fazer login novamente
                                </button>
                            </div>
                        )}
                        <p className="mt-2 text-sm text-blue-800 font-medium">
                            Pasta Atual: {formData.drive_folder_name || galeria.drive_folder_name}
                        </p>
                    </div>

                    <div className="flex gap-6 py-2">
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                            <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="w-4 h-4 text-blue-600" />
                            Pública
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-red-600">
                            <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="w-4 h-4" />
                            Privada
                        </label>
                    </div>

                    {!isPublic && (
                        <input
                            name="password"
                            placeholder="Nova senha (deixe vazio para manter)"
                            className="w-full bg-red-50 p-3 rounded-xl border border-red-100"
                        />
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 font-semibold text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                            Cancelar
                        </button>
                        <button disabled={loading} type="submit" className="px-10 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg disabled:opacity-50 transition-all">
                            {loading ? "Salvando..." : "Salvar Alterações"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}