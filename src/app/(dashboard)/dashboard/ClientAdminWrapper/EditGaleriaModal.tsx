'use client';

import { useState, useEffect } from 'react';
import { updateGaleria } from '@/actions/galeria';
import { maskPhone } from '@/utils/masks';
import { GooglePickerButton } from '@/components/google-drive';
import { CategorySelect } from '@/components/gallery'; // Importação do novo componente
import Toast from '@/components/ui/Toast';
import {
  X,
  Camera,
  User,
  Type,
  Calendar,
  MapPin,
  FolderSync,
  Lock,
  Unlock,
  Loader2,
  Briefcase,
  MessageCircle,
} from 'lucide-react';
import type { Galeria } from '@/types/galeria';

interface EditGaleriaModalProps {
  galeria: Galeria | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (success: boolean, data: any) => void;
}

export default function EditGaleriaModal({
  galeria,
  isOpen,
  onClose,
  onSuccess,
}: EditGaleriaModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [category, setCategory] = useState('');
  const [hasContractingClient, setHasContractingClient] = useState(true);

  const [formData, setFormData] = useState({
    drive_folder_id: '',
    drive_folder_name: '',
    cover_image_url: '',
  });

  useEffect(() => {
    if (galeria) {
      setIsPublic(galeria.is_public);
      const initialPhone = galeria.client_whatsapp || '';
      setClientWhatsapp(maskPhone({ target: { value: initialPhone } } as any));
      setCategory(galeria.category || '');
      setHasContractingClient(galeria.has_contracting_client ?? true);

      setFormData({
        drive_folder_id: galeria.drive_folder_id || '',
        drive_folder_name: galeria.drive_folder_name || '',
        cover_image_url: galeria.cover_image_url || '',
      });
      setErrorMessage(null);
    }
  }, [galeria]);

  // BLOQUEIO DO SCROLL DO DASHBOARD
  useEffect(() => {
    if (isOpen) {
      // Salva a posição atual e remove o scroll do fundo
      document.body.style.overflow = 'hidden';
    } else {
      // Restaura o scroll quando o modal fecha
      document.body.style.overflow = 'unset';
    }

    // Cleanup function para garantir que o scroll volte se o componente for desmontado inesperadamente
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !galeria) return null;

  const handlePickerSuccess = (
    folderId: string,
    folderName: string,
    coverFileId: string,
  ) => {
    setFormData({
      drive_folder_id: folderId,
      drive_folder_name: folderName,
      cover_image_url: coverFileId,
    });

    setErrorMessage(null);

    // Dispara o Toast unificado (visto na imagem de sucesso)
    setToastConfig({
      message: 'Pasta vinculada com sucesso!',
      type: 'success',
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null); // Limpa o erro do modal

    try {
      const data = new FormData(e.currentTarget);

      // 1. Ajuste de Modelo de Negócio
      if (!hasContractingClient) {
        data.set('clientName', 'Venda Direta');
        data.set('client_whatsapp', '');
      } else {
        data.set('client_whatsapp', clientWhatsapp.replace(/\D/g, ''));
      }

      // 2. Sincronização usando o estado formData (Corrigindo os 'current')
      data.set('drive_folder_id', formData.drive_folder_id);
      data.set('drive_folder_name', formData.drive_folder_name);
      data.set('cover_image_url', formData.cover_image_url);
      data.set('is_public', String(isPublic));
      data.set('category', category);
      data.set('has_contracting_client', String(hasContractingClient));

      if (!formData.drive_folder_id) {
        setErrorMessage('Selecione uma pasta do Google Drive.');
        setLoading(false);
        return;
      }

      // 3. Lógica de senha
      const passwordValue = data.get('password') as string;
      if (isPublic || !passwordValue || passwordValue.trim() === '') {
        data.delete('password');
      }

      const result = await updateGaleria(galeria.id, data);

      if (result.success) {
        // Criando o objeto atualizado com os dados corretos para o Dashboard
        const updatedData = {
          ...galeria,
          title: data.get('title') as string,
          client_name: data.get('clientName') as string,
          location: data.get('location') as string,
          date: data.get('date') as string,
          client_whatsapp: data.get('client_whatsapp') as string,
          is_public: isPublic,
          drive_folder_id: formData.drive_folder_id,
          drive_folder_name: formData.drive_folder_name,
          cover_image_url: formData.cover_image_url,
          category: category,
          has_contracting_client: hasContractingClient,
        };

        // Verifique se updatedData existe antes de passar
        if (updatedData && updatedData.id) {
          // PASSAGEM DE DADOS CORRIGIDA:
          // Passamos 'true' para o status e o objeto 'updatedData' para atualizar a lista.
          onSuccess(true, updatedData);
          onClose();
        }
      } else {
        // Para erros, passamos 'false' e a mensagem.
        onSuccess(false, result.error || 'Erro ao atualizar');
      }
    } catch (e) {
      onSuccess(false, e.error || 'Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center 
        bg-slate-900/40 backdrop-blur-md p-4 md:p-6 animate-in fade-in duration-300"
      >
        {/* Modal ajustado para ocupar 90% da altura da tela */}
        <div
          className="w-full max-w-2xl h-[90vh] max-h-[850px] bg-white rounded-[40px] 
            shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 
            duration-300 flex flex-col"
        >
          {/* Header Otimizado - Fixo no topo (shrink-0) */}
          <div className="flex items-center justify-between py-5 px-8 border-b border-slate-50 bg-[#FAF7ED]/50 shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2.5 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37]">
                <Camera size={22} />
              </div>
              <div className="flex items-baseline gap-2 min-w-0">
                <h2 className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  Editar Galeria
                </h2>
                <span className="text-slate-300">|</span>
                <p className="text-base text-slate-500 font-medium truncate tracking-wide">
                  {galeria.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-full transition-all text-slate-400"
            >
              <X size={22} />
            </button>
          </div>

          {/* FORMULÁRIO: Ocupa o espaço central (flex-1) com scroll interno se necessário */}
          <form
            id="edit-gallery-form"
            onSubmit={handleSubmit}
            className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar"
          >
            <input
              type="hidden"
              name="drive_folder_id"
              value={formData.drive_folder_id}
            />
            <input
              type="hidden"
              name="drive_folder_name"
              value={formData.drive_folder_name}
            />
            <input
              type="hidden"
              name="cover_image_url"
              value={formData.cover_image_url}
            />

            {/* Modelo de Negócio com Fundo Deslizante */}
            <div className="space-y-3">
              <label className="text-slate-700 text-sm font-bold flex items-center gap-2">
                <Briefcase size={14} className="text-[#D4AF37]" /> Modelo de
                Negócio
              </label>

              <div className="relative flex w-full p-1 bg-slate-100 rounded-xl border border-slate-200/50">
                {/* Fundo Deslizante Colorido (Ativo) */}
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out border ${
                    hasContractingClient
                      ? 'left-1 bg-[#F3E5AB] border-[#D4AF37]/30'
                      : 'left-[calc(50%+2px)] bg-[#F3E5AB] border-[#D4AF37]/30'
                  }`}
                />

                {/* Opção 1: Serviço Contratado */}
                <button
                  type="button"
                  onClick={() => setHasContractingClient(true)}
                  className={`relative z-10 flex-1 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-colors duration-300 ${
                    hasContractingClient ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  Serviço Contratado
                </button>

                {/* Opção 2: Venda de Fotos */}
                <button
                  type="button"
                  onClick={() => {
                    setHasContractingClient(false);
                    setIsPublic(true); // Venda de fotos geralmente requer acesso público
                  }}
                  className={`relative z-10 flex-1 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-colors duration-300 ${
                    !hasContractingClient ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  Venda de Fotos
                </button>
              </div>
            </div>

            {/* EXIBIÇÃO CONDICIONAL: Apenas se for serviço contratado */}
            {hasContractingClient && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <label>
                    <User size={12} /> Nome do cliente
                  </label>
                  <input
                    name="clientName"
                    defaultValue={galeria.client_name}
                    required={hasContractingClient}
                  />
                </div>
                <div className="space-y-1.5">
                  <label>
                    {' '}
                    <MessageCircle size={14} className="text-[#D4AF37]" />
                    WhatsApp
                  </label>
                  <input
                    value={clientWhatsapp}
                    onChange={(e) => setClientWhatsapp(maskPhone(e))}
                    required={hasContractingClient}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            )}

            {/* Título */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5">
                <label>
                  <Type size={12} /> Título da galeria
                </label>
                <input name="title" defaultValue={galeria.title} required />
              </div>
              {/* Categoria Padronizada */}
              <CategorySelect
                value={category}
                onChange={(val) => setCategory(val)}
              />
            </div>
            {/* Data e Localização */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label>
                  <Calendar size={12} /> Data
                </label>
                <input
                  name="date"
                  type="date"
                  defaultValue={galeria.date?.substring(0, 10)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label>
                  <MapPin size={12} /> Localização
                </label>
                <input name="location" defaultValue={galeria.location || ''} />
              </div>
            </div>

            {/* Google Drive Section */}
            <div
              className={`rounded-[28px] border p-4 transition-all ${errorMessage ? 'border-red-200 bg-red-50' : 'border-[#D4AF37]/20 bg-[#FAF7ED]'}`}
            >
              <div className="flex flex-row items-center gap-2">
                <div className="flex items-center gap-2 text-[#D4AF37] shrink-0">
                  <FolderSync size={18} />
                  <label className="text-xs font-bold tracking-widest whitespace-nowrap uppercase">
                    Google Drive
                  </label>
                </div>

                <div className="shrink-0">
                  <GooglePickerButton
                    onFolderSelect={handlePickerSuccess}
                    currentDriveId={formData.drive_folder_id}
                    onError={(msg) => {
                      const isPrivate =
                        msg.includes('permission') ||
                        msg.includes('Privada') ||
                        msg.includes('access');

                      const userMessage = isPrivate
                        ? "Acesso Negado: No seu Google Drive, mude o acesso para 'Qualquer pessoa com o link' para continuar."
                        : msg;

                      // EM VEZ DE setToastConfig, use o onSuccess que vem do pai:
                      onSuccess(false, userMessage);

                      setErrorMessage(null); // Limpa o erro em vermelho do modal
                    }}
                  />
                </div>

                <div className="flex-1 flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-[#D4AF37]/10 shadow-sm min-w-0 h-[42px]">
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${formData.drive_folder_id ? 'bg-[#D4AF37] animate-pulse' : 'bg-slate-200'}`}
                  />
                  <span
                    className={`text-sm font-bold truncate ${formData.drive_folder_id ? 'text-slate-700' : 'text-slate-400 italic'}`}
                  >
                    {formData.drive_folder_name ||
                      'Selecione uma nova pasta...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Privacidade */}
            <div className="pt-4 border-t border-slate-50 flex flex-col gap-4">
              <div className="flex gap-10">
                <label
                  className={`flex items-center gap-3 cursor-pointer text-xs font-black uppercase tracking-[0.2em] transition-all ${isPublic ? 'text-[#D4AF37]' : 'text-slate-300'}`}
                >
                  <input
                    type="radio"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                    className="hidden"
                  />
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isPublic ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-slate-200'}`}
                  >
                    {isPublic && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                    )}
                  </div>
                  <Unlock size={16} /> Pública
                </label>

                <label
                  className={`flex items-center gap-3 cursor-pointer text-xs font-black uppercase tracking-[0.2em] transition-all ${!isPublic ? 'text-[#D4AF37]' : 'text-slate-300'}`}
                >
                  <input
                    type="radio"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    className="hidden"
                  />
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${!isPublic ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-slate-200'}`}
                  >
                    {!isPublic && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                    )}
                  </div>
                  <Lock size={16} /> Privada
                </label>
              </div>

              {!isPublic && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label>Nova senha de acesso</label>
                  <input
                    name="password"
                    type="password"
                    placeholder="Deixe em branco para manter a atual"
                  />
                </div>
              )}
            </div>
          </form>

          {/* Footer Fixo na Base (shrink-0) */}
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 shrink-0">
            <div className="flex flex-col md:flex-row gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 text-[11px] font-black uppercase tracking-[0.2em] transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-gallery-form"
                disabled={loading}
                className="flex-[2] bg-[#F3E5AB] hover:bg-[#D4AF37] hover:text-white text-slate-900 font-black py-4 rounded-2xl shadow-xl shadow-[#D4AF37]/10 text-[11px] tracking-[0.3em] uppercase flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  'Salvar Alterações'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
