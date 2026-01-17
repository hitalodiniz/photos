'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  AtSign,
  FileText,
  Loader2,
  MessageCircle,
  Instagram,
  Upload,
  Save,
  Pencil,
  Globe,
  ImageIcon,
  MapPin,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

import {
  getPublicProfile,
  upsertProfile,
} from '@/core/services/profile.service';
import { maskPhone, normalizePhoneNumber } from '@/core/utils/masks-helpers';
import ProfilePreview from './ProfilePreview';
import { Toast } from '@/components/ui';
import { useFormStatus } from 'react-dom';
import { fetchStates, fetchCitiesByState } from '@/core/utils/cidades-helpers';
import { compressImage } from '@/core/utils/user-helpers';
import router from 'next/router';

// 🎯 BOTÃO MANTIDO NO TAMANHO ORIGINAL (60%)
export function SubmitOnboarding({ isSaving }: { isSaving: boolean }) {
  const { pending } = useFormStatus();
  const isLoading = pending || isSaving;
  return (
    <button
      type="submit"
      disabled={isLoading}
      className={`w-[60%] h-12 rounded-[0.5rem] font-semibold uppercase text-[11px] tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 border ${
        isLoading
          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
          : 'bg-[#F3E5AB] text-black border-[#F3E5AB] hover:bg-white shadow-[#D4AF37]/10'
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" size={16} /> Consolidando...
        </>
      ) : (
        <>
          <Save size={16} /> Salvar perfil
        </>
      )}
    </button>
  );
}

export default function OnboardingForm({
  initialData,
  suggestedUsername,
  isEditMode,
}: any) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [username, setUsername] = useState(
    initialData?.username || suggestedUsername,
  );
  const [miniBio, setMiniBio] = useState(initialData?.mini_bio || '');

  const [phone, setPhone] = useState(() =>
    normalizePhoneNumber(initialData?.phone_contact),
  );
  const [instagram, setInstagram] = useState(initialData?.instagram_link || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const [selectedCities, setSelectedCities] = useState<string[]>(
    initialData?.operating_cities || [],
  );

  const [states, setStates] = useState<{ sigla: string; nome: string }[]>([]);
  const [selectedUF, setSelectedUF] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // 📸 FOTOS (RESTAURADO)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.profile_picture_url || null,
  );
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(
    initialData?.background_url || null,
  );

  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastConfig, setToastConfig] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    fetchStates().then(setStates);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (cityInput.length >= 2 && selectedUF) {
        const results = await fetchCitiesByState(selectedUF, cityInput);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cityInput, selectedUF]);

  useEffect(() => {
    if (!username || username === initialData?.username) {
      setIsAvailable(null);
      return;
    }
    const check = async () => {
      setIsChecking(true);
      const { data } = await getPublicProfile(username);
      setIsAvailable(!data);
      setIsChecking(false);
    };
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, [username, initialData?.username]);

  const handleSelectCity = (city: string) => {
    if (!selectedCities.includes(city))
      setSelectedCities((prev) => [...prev, city]);
    setCityInput('');
    setSuggestions([]);
  };

  const clientAction = async (formData: FormData) => {
    // 🛡️ TRAVA DE SEGURANÇA
    if (!fullName.trim() || !username.trim()) {
      setToastConfig({
        message: 'Nome e Username são obrigatórios.',
        type: 'error',
      });
      return;
    }

    if (!isEditMode && isAvailable === false) {
      setToastConfig({
        message: 'Este username já está em uso.',
        type: 'error',
      });
      return;
    }

    setIsSaving(true);

    formData.set('full_name', fullName.trim());
    formData.set('username', username.trim().toLowerCase());
    formData.set('mini_bio', miniBio);
    formData.set('phone_contact', phone.replace(/\D/g, ''));
    formData.set('instagram_link', instagram);
    formData.set('website', website);
    formData.set('operating_cities', JSON.stringify(selectedCities));

    try {
      if (photoFile) {
        const compressed = await compressImage(photoFile);
        formData.set('profile_picture', compressed);
      }
      if (bgFile) {
        formData.set('background_image', bgFile);
      }

      const result = await upsertProfile(formData);
      if (result?.success) {
        setShowSuccessModal(true);
      } else {
        setToastConfig({
          message: result?.error || 'Erro ao salvar perfil.',
          type: 'error',
        });
      }
    } catch (err) {
      setToastConfig({ message: 'Falha na conexão.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="relative min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row w-full z-[99]">
        <aside className="w-full md:w-[35%] bg-white border-r border-slate-100 p-6 pt-4 flex flex-col h-auto md:h-screen md:sticky md:top-0 z-20 md:overflow-y-auto no-scrollbar shadow-xl">
          <div className="flex items-center gap-3 shrink-0">
            <User size={20} />
            <h1 className="font-black text-slate-900 text-[14px] tracking-[0.1em] uppercase">
              {isEditMode ? 'Editar Perfil' : 'Onboarding Profissional'}
            </h1>
          </div>

          <form action={clientAction} className="space-y-6">
            {/* PARA MANTER A FOTO ATUAL */}
            <input
              type="hidden"
              name="profile_picture_url_existing"
              value={initialData?.profile_picture_url || ''}
            />
            {/* AVATAR UPLOAD (RESTAURADO) */}
            <div className="flex flex-col items-center mb-4">
              <div className="relative group">
                <input
                  type="file"
                  name="profile_picture"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full p-[2px] bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] shadow-xl cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-white p-1">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-center justify-center relative">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          className="w-full h-full object-cover scale-110"
                          alt="Preview"
                        />
                      ) : (
                        <Upload size={24} className="text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-white border border-slate-200 p-2 rounded-full shadow-lg text-[#D4AF37] z-10 hover:bg-[#F3E5AB] transition-colors"
                >
                  <Pencil size={12} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label>
                  <User size={12} /> Nome Completo{' '}
                  <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  className="w-full bg-white border border-slate-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:border-[#D4AF37] outline-none"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label>
                  <AtSign size={12} /> Username{' '}
                  <span className="text-[#D4AF37]">*</span>
                </label>
                <div className="relative">
                  <input
                    readOnly={isEditMode}
                    className={`w-full bg-white border border-slate-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium outline-none ${isEditMode ? 'bg-slate-50 text-slate-400 italic' : ''}`}
                    value={username}
                    onChange={(e) =>
                      !isEditMode &&
                      setUsername(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9._]/g, ''),
                      )
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* CAMPO WEBSITE E FUNDO (ALINHADOS) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label>
                  <Globe size={12} /> Website
                </label>
                <input
                  className="w-full bg-white border border-slate-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:border-[#D4AF37] outline-none"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="seusite.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2">
                  <ImageIcon size={12} /> Fundo do Perfil
                </label>

                {/* 1. INPUT OCULTO PARA MANTER A IMAGEM ATUAL NO BANCO */}
                <input
                  type="hidden"
                  name="background_url_existing"
                  value={initialData?.background_url || ''}
                />

                <input
                  type="file"
                  name="background_image" // 🎯 IMPORTANTE: Nome que bate com o seu Server Action
                  ref={bgInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setBgFile(file);
                      setBgPreview(URL.createObjectURL(file));
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => bgInputRef.current?.click()}
                  className="w-full bg-white border border-slate-200 border-dashed rounded-[0.5rem] px-4 h-11 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest truncate w-full">
                      {bgFile ? bgFile.name : 'Alterar Imagem de Fundo'}
                    </span>
                    {!bgFile && (
                      <span className="text-[9px] text-slate-400">
                        Recomendado: 1920x1080px
                      </span>
                    )}
                  </div>

                  {bgPreview && (
                    <div className="w-8 h-8 rounded-[0.3rem] overflow-hidden border border-slate-200 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                      <img
                        src={bgPreview}
                        alt="Preview fundo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label>
                  <MessageCircle size={12} /> WhatsApp
                </label>
                <input
                  className="w-full bg-white border border-slate-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:border-[#D4AF37]"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-1.5">
                <label>
                  <Instagram size={12} /> Instagram
                </label>
                <input
                  className="w-full bg-white border border-slate-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:border-[#D4AF37]"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@seu.perfil"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2">
                  <FileText size={12} /> Mini-currículo / Bio
                </label>
                {/* Contador de caracteres refinado */}
                <span
                  className={`text-[9px] font-bold uppercase tracking-widest ${
                    miniBio.length >= 380 ? 'text-[#D4AF37]' : 'text-slate-400'
                  }`}
                >
                  {miniBio.length} / 400
                </span>
              </div>

              <textarea
                className="w-full bg-white border border-slate-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:border-[#D4AF37] outline-none min-h-[100px] transition-all"
                value={miniBio}
                maxLength={400}
                onChange={(e) => setMiniBio(e.target.value)}
                required
                rows={4}
                placeholder="Conte um pouco sobre sua trajetória autor..."
              />
            </div>
            {/* 📍 SEÇÃO ÁREA DE ATUAÇÃO (RESTAURADA) */}
            <div className="rounded-xl border border-[#D4AF37]/20 p-5 bg-[#F3E5AB]/5 space-y-4">
              <div className="flex items-center">
                <label className="flex items-center gap-2">
                  <MapPin size={14} /> Área de Atuação ({selectedCities.length})
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCities.map((city) => (
                  <span
                    key={city}
                    className="bg-white border border-[#D4AF37]/20 text-slate-900 text-[9px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-2 shadow-sm uppercase tracking-wider"
                  >
                    {city}{' '}
                    <X
                      size={12}
                      className="cursor-pointer text-slate-400 hover:text-red-500"
                      onClick={() =>
                        setSelectedCities(
                          selectedCities.filter((c) => c !== city),
                        )
                      }
                    />
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedUF}
                  onChange={(e) => {
                    setSelectedUF(e.target.value);
                    setCityInput('');
                    setSuggestions([]);
                  }}
                  className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-2 text-[11px] font-bold outline-none focus:border-[#D4AF37]"
                >
                  <option value="">UF</option>
                  {states.map((uf) => (
                    <option key={uf.sigla} value={uf.sigla}>
                      {uf.sigla}
                    </option>
                  ))}
                </select>
                <div className="relative flex-grow">
                  <input
                    disabled={!selectedUF}
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-[11px] font-bold outline-none focus:border-[#D4AF37]"
                    placeholder="Digite a cidade..."
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute z-[100] w-full bg-white border border-slate-100 rounded-xl mt-2 shadow-2xl max-h-48 overflow-y-auto no-scrollbar">
                      {suggestions.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => handleSelectCity(city)}
                          className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#F3E5AB]/20 border-b border-slate-50 last:border-0 transition-colors"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center w-full">
              <SubmitOnboarding isSaving={isSaving} />
            </div>
          </form>
        </aside>

        <main className="w-full md:w-[65%] min-h-[600px] md:h-screen bg-black relative flex-grow overflow-y-auto">
          <ProfilePreview
            initialData={{
              full_name: fullName,
              username,
              mini_bio: miniBio,
              phone_contact: phone,
              instagram_link: instagram,
              avatar_url: photoPreview,
              cities: selectedCities,
              website,
              background_url: bgPreview,
            }}
          />
        </main>
      </div>
      {/* 🎯 MODAL DE SUCESSO RESTAURADO */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#1E293B]/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white rounded-[2rem] p-10 max-w-sm w-full shadow-[0_20px_50px_rgba(212,175,55,0.2)] text-center border border-[#D4AF37]/20 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-[#F3E5AB]/30 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 size={40} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-widest">
              Perfil Atualizado
            </h2>
            <p className="text-slate-500 mb-8 text-xs font-medium leading-relaxed">
              O seu perfil atualizado está disponível para o acesso público.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href={`/${username}`}
                target="_blank"
                className="w-full h-12 flex items-center justify-center gap-2 bg-slate-900 text-[#F3E5AB] rounded-xl font-semibold text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-lg"
              >
                <Sparkles size={14} /> Ver Perfil Público
              </a>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full h-12 bg-[#F3E5AB] text-black rounded-xl font-semibold text-[10px] uppercase tracking-[0.2em] hover:bg-white border border-[#F3E5AB] transition-all shadow-sm"
              >
                Ir para o Dashboard
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full text-slate-400 py-2 text-[9px] font-bold uppercase tracking-[0.3em] hover:text-[#D4AF37] transition-colors"
              >
                Continuar Editando
              </button>
            </div>
          </div>
        </div>
      )}

      {toastConfig && (
        <Toast
          message={toastConfig.message}
          type={toastConfig.type}
          onClose={() => setToastConfig(null)}
        />
      )}
    </>
  );
}
