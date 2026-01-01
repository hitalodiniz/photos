'use client';

import { useState, useRef } from 'react';
import { SubmitButton } from '@/components/sections/DashboardUI';
import { GooglePickerButton } from '@/components/google-drive';
import { CategorySelect } from '@/components/gallery';
import { maskPhone } from '@/utils/masks';
import { createGaleria } from '@/actions/galeria';
import {
  Lock,
  Unlock,
  Calendar,
  MapPin,
  User,
  Type,
  FolderSync,
  Briefcase,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

export default function CreateGaleriaForm({ onSuccess }) {
  const formRef = useRef<HTMLFormElement>(null);

  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [coverFileId, setCoverFileId] = useState('');
  const [driveFolderName, setDriveFolderName] = useState(
    'Nenhuma pasta selecionada',
  );
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [hasContractingClient, setHasContractingClient] = useState(true);

  const handleFolderSelect = (
    folderId: string,
    folderName: string,
    coverFileId: string,
  ) => {
    setDriveFolderId(folderId);
    setDriveFolderName(folderName);
    setCoverFileId(coverFileId);
    setError(null);
  };

  const handlePickerError = (message: string) => {
    setError(message);
    setDriveFolderId('');
    setCoverFileId('');
    setDriveFolderName('Nenhuma pasta selecionada');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!driveFolderId) {
      onSuccess(false, 'Por favor, selecione uma pasta no Google Drive.');
      return;
    }

    if (!isPublic && password.length < 4) {
      onSuccess(false, 'A senha deve ter pelo menos 4 dígitos.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set('is_public', String(isPublic));
    formData.set('drive_folder_id', driveFolderId);
    formData.set('drive_folder_name', driveFolderName);
    formData.set('cover_image_url', coverFileId || driveFolderId);
    formData.set('client_whatsapp', clientWhatsapp.replace(/\D/g, ''));
    formData.set('category', category);
    formData.set('has_contracting_client', String(hasContractingClient));

    // Lógica condicional para Venda de Fotos
    if (!hasContractingClient) {
      formData.set('clientName', 'Venda Direta'); // Preenche o banco para evitar erro de null
      formData.set('client_whatsapp', '');
    } else {
      formData.set('client_whatsapp', clientWhatsapp.replace(/\D/g, ''));
    }
    if (!isPublic && password) {
      formData.set('password', password);
    }

    try {
      const result = await createGaleria(formData);
      if (result.success) {
        formRef.current?.reset();
        setPassword('');
        setClientWhatsapp('');
        setDriveFolderId('');
        setCoverFileId('');
        setDriveFolderName('Nenhuma pasta selecionada');
        setIsPublic(true);
        setCategory('');
        setHasContractingClient(true);
        onSuccess(true, 'Galeria criada com sucesso!');
      } else {
        onSuccess(false, result.error || 'Erro ao criar galeria.');
      }
    } catch (err) {
      onSuccess(false, 'Erro de conexão. Verifique sua internet.');
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="drive_folder_id" value={driveFolderId} />
      <input type="hidden" name="drive_folder_name" value={driveFolderName} />
      <input
        type="hidden"
        name="cover_image_url"
        value={coverFileId || driveFolderId}
      />
      <input type="hidden" name="is_public" value={String(isPublic)} />
      {/* Modelo de Negócio */}

      <div className="relative flex w-full p-1 bg-slate-100 rounded-xl border border-slate-200/50">
        {/* Fundo Deslizante Colorido (Ativo) */}
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out border ${
            hasContractingClient
              ? 'left-1 bg-[#F3E5AB] border-[#D4AF37]/30'
              : 'left-[calc(50%+2px)] bg-[#F3E5AB] border-[#D4AF37]/30'
          }`}
        />

        {/* Opção 1 */}
        <button
          type="button"
          onClick={() => setHasContractingClient(true)}
          className={`relative z-10 flex-1 py-2 text-[10px] md:text-[12px] font-semibold  tracking-tighter transition-colors duration-300 ${
            hasContractingClient ? 'text-slate-900' : 'text-slate-400'
          }`}
        >
          Serviço Contratado
        </button>

        {/* Opção 2 */}
        <button
          type="button"
          onClick={() => {
            setHasContractingClient(false);
            setIsPublic(true);
          }}
          className={`relative z-10 flex-1 py-2 text-[10px] md:text-[12px] font-semibold  tracking-tighter transition-colors duration-300 ${
            !hasContractingClient ? 'text-slate-900' : 'text-slate-400'
          }`}
        >
          Venda de Fotos
        </button>
      </div>

      {/* Campos de Cliente: Só aparecem se for Contratado */}
      {hasContractingClient && (
        <>
          <div>
            <label>
              <User size={14} className="text-[#D4AF37]" /> Nome do cliente
            </label>
            <input
              name="clientName"
              required={hasContractingClient}
              placeholder="Ex: Maria Silva"
              className="w-full p-4 bg-slate-100 border-none rounded-2xl text-slate-900"
            />
          </div>
          <div>
            <label>
              <MessageCircle size={14} className="text-[#D4AF37]" />
              WhatsApp
            </label>
            <input
              value={clientWhatsapp}
              required={hasContractingClient}
              onChange={(e) => setClientWhatsapp(maskPhone(e))}
              maxLength={15}
              placeholder="(00) 00000-0000"
              className="w-full p-4 bg-slate-100 border-none rounded-2xl text-slate-900"
            />
          </div>
        </>
      )}
      {/* Título da Galeria */}
      <div>
        <label>
          <Type size={14} className="text-[#D4AF37]" /> Título da galeria
        </label>
        <input name="title" required placeholder="Ex: Ensaio Pré-Wedding" />
      </div>

      {/* Categoria */}
      <CategorySelect value={category} onChange={(val) => setCategory(val)} />

      {/* Data */}
      <div>
        <label>
          <Calendar size={14} className="text-[#D4AF37]" /> Data
        </label>
        <input name="date" type="date" required />
      </div>

      {/* Local (Agora abaixo da data) */}
      <div>
        <label>
          <MapPin size={14} className="text-[#D4AF37]" /> Local
        </label>
        <input name="location" placeholder="Cidade/UF" />
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
          <p className="mt-3 text-[11px] text-gray-400 italic font-medium">
            Nenhuma pasta vinculada.
          </p>
        )}
      </div>

      {/* Opções de Privacidade */}
      <div className="pt-2 border-t border-gray-50">
        {/* DIVISOR EDITORIAL CENTRALIZADO */}
        <div className="flex items-center gap-4 pt-2 pb-2">
          {' '}
          {/* Reduzi pt-6 para pt-2 */}
          <div className="h-[1px] flex-grow bg-slate-100"></div>
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] whitespace-nowrap">
            Privacidade
          </span>
          <div className="h-[1px] flex-grow bg-slate-100"></div>{' '}
          {/* Mudei w-10 para flex-grow para centralizar */}
        </div>

        <div className="flex gap-8 mt-2 mb-8 ml-1 items-start">
          {/* OPÇÃO PÚBLICA */}
          <div className="relative group/tooltip whitespace-nowrap">
            {' '}
            {/* whitespace-nowrap evita a quebra */}
            <label
              className={`group !mb-0 !ml-0 flex items-center gap-3 cursor-pointer transition-all ${isPublic ? 'text-[#D4AF37]' : ''}`}
            >
              <input
                type="radio"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="hidden"
              />
              <div
                className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 shrink-0 ${isPublic ? 'border-[#D4AF37] bg-[#F3E5AB]/10 shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'border-slate-200 bg-slate-50 group-hover:border-slate-300'}`}
              >
                <div
                  className={`w-2 h-2 rounded-full bg-[#D4AF37] transition-all duration-300 ${isPublic ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                />
              </div>

              <div className="flex items-center gap-2">
                <Unlock
                  size={14}
                  className={`transition-colors shrink-0 ${isPublic ? 'text-[#D4AF37]' : 'text-slate-300'}`}
                />
                <span className="tracking-[0.1em]">Pública</span>
              </div>
            </label>
            {/* TOOLTIP */}
            <div className="absolute bottom-full left-0 mb-2 w-56 p-3 bg-[#FAF7ED] border border-[#F3E5AB] rounded-xl shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-50 pointer-events-none -translate-y-1">
              <p className="text-[10px] text-slate-500 italic leading-snug whitespace-normal">
                Seu portfólio estará visível para todos os visitantes e motores
                de busca.
              </p>
              <div className="absolute top-full left-6 w-2 h-2 bg-[#FAF7ED] border-r border-b border-[#F3E5AB] rotate-45 -mt-1"></div>
            </div>
          </div>

          {/* OPÇÃO PRIVADA */}
          <div className="relative group/tooltip whitespace-nowrap">
            <label
              className={`group !mb-0 !ml-0 flex items-center gap-3 cursor-pointer transition-all ${!isPublic ? 'text-[#D4AF37]' : ''}`}
            >
              <input
                type="radio"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="hidden"
              />
              <div
                className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 shrink-0 ${!isPublic ? 'border-[#D4AF37] bg-[#F3E5AB]/10 shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'border-slate-200 bg-slate-50 group-hover:border-slate-300'}`}
              >
                <div
                  className={`w-2 h-2 rounded-full bg-[#D4AF37] transition-all duration-300 ${!isPublic ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                />
              </div>

              <div className="flex items-center gap-2">
                <Lock
                  size={14}
                  className={`transition-colors shrink-0 ${!isPublic ? 'text-[#D4AF37]' : 'text-slate-300'}`}
                />
                <span className="tracking-[0.1em]">Privada</span>
              </div>
            </label>

            {/* TOOLTIP */}
            <div className="absolute bottom-full left-0 mb-2 w-56 p-3 bg-[#FAF7ED] border border-[#F3E5AB] rounded-xl shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-50 pointer-events-none -translate-y-1">
              <p className="text-[10px] text-slate-500 italic leading-snug whitespace-normal">
                Apenas pessoas com o link direto poderão visualizar seu
                trabalho.
              </p>
              <div className="absolute top-full left-6 w-2 h-2 bg-[#FAF7ED] border-r border-b border-[#F3E5AB] rotate-45 -mt-1"></div>
            </div>
          </div>
        </div>

        {!isPublic && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label>Senha de acesso</label>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value.replace(/\D/g, '').slice(0, 8))
              }
              placeholder="Mínimo 4 dígitos"
              required={!isPublic}
            />
          </div>
        )}
      </div>

      {/* Botão Salvar Champanhe */}
      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
