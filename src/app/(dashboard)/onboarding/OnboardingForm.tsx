'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  User,
  AtSign,
  FileText,
  Sparkles,
  Loader2,
  MessageCircle,
  Instagram,
  Upload,
  MapPin,
  X,
  CheckCircle2,
  Save,
  AlertCircle,
  Pencil,
  LayoutDashboard,
  Globe,
  ImageIcon,
} from 'lucide-react';

import {
  getPublicProfile,
  upsertProfile,
} from '@/core/services/profile.service';
import { maskPhone } from '@/core/utils/masks-helpers';
import ProfilePreview from './ProfilePreview';
import { Toast } from '@/components/ui';
import { useFormStatus } from 'react-dom';
import { fetchStates, fetchCitiesByState } from '@/core/utils/cidades-helpers';
import { compressImage } from '@/core/utils/user-helpers';
import SecondaryButton from '@/components/ui/SecondaryButton';

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
          <Save size={16} /> Salvar perfil profissional
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
  const [phone, setPhone] = useState(initialData?.phone_contact || '');
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
        const compressedBg = await compressImage(bgFile);
        formData.set('background_image', compressedBg);
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
        <aside className="w-full md:w-[35%] bg-white border-r border-slate-100 p-6 pt-8 flex flex-col h-auto md:h-screen md:sticky md:top-0 z-20 md:overflow-y-auto no-scrollbar shadow-xl">
          <div className="flex items-center gap-3 shrink-0 mb-8">
            <User size={20} />
            <h1 className="font-black text-slate-900 text-[14px] tracking-[0.1em] uppercase">
              {isEditMode ? 'Editar Perfil' : 'Onboarding Profissional'}
            </h1>
          </div>

          <form action={clientAction} className="space-y-6 pb-10">
            {/* AVATAR UPLOAD (RESTAURADO) */}
            <div className="flex flex-col items-center mb-4">
              <div className="relative group">
                <input
                  type="file"
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
                <label>
                  <ImageIcon size={12} /> Fundo do Perfil
                </label>
                <input
                  type="file"
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
                  className="w-full bg-white border border-slate-200 border-dashed rounded-[0.5rem] px-4 h-11 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <span className="text-[10px] text-slate-400 truncate max-w-[70px]">
                    {bgFile ? bgFile.name : 'Selecionar...'}
                  </span>
                  {bgPreview && (
                    <div className="w-5 h-5 rounded overflow-hidden border border-slate-200 shrink-0">
                      <img
                        src={bgPreview}
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
              <label>
                <FileText size={12} /> Mini-currículo / Bio
              </label>
              <textarea
                className="w-full bg-white border border-slate-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:border-[#D4AF37] outline-none min-h-[100px]"
                value={miniBio}
                onChange={(e) => setMiniBio(e.target.value)}
                required
                rows={4}
              />
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
