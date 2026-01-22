'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  AtSign,
  FileText,
  MessageCircle,
  Instagram,
  Upload,
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
import { Toast, SubmitButton, LoadingScreen } from '@/components/ui';
import BaseModal from '@/components/ui/BaseModal';
import { fetchStates, fetchCitiesByState } from '@/core/utils/cidades-helpers';
import { compressImage } from '@/core/utils/user-helpers';

// 🎯 Componente de seção simples - Estilo Editorial
const FormSection = ({ 
  title, 
  icon, 
  children 
}: { 
  title: string; 
  icon?: React.ReactNode; 
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-luxury border border-petroleum/40 p-4 space-y-3">
    <div className="flex items-center gap-2 pb-2 border-b border-petroleum/40">
      {icon && <div className="text-gold">{icon}</div>}
      <h3 className="text-[10px] font-bold uppercase tracking-luxury text-petroleum dark:text-slate-700">
        {title}
      </h3>
    </div>
    <div className="pl-0">
      {children}
    </div>
  </div>
);

export default function OnboardingForm({
  initialData,
  suggestedUsername,
  isEditMode,
}: {
  initialData?: any;
  suggestedUsername?: string;
  isEditMode?: boolean;
}) {
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
  const [isRedirecting, setIsRedirecting] = useState(false);
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
        formData.set('profile_picture', compressed, 'avatar.webp');
      }
      if (bgFile) {
        const compressedBg = await compressImage(bgFile);
        formData.set('background_image', compressedBg, 'background.webp');
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
    } catch (err: any) {
      console.error('[OnboardingForm] Erro ao salvar:', err);
      let errorMsg = 'Falha na conexão.';
      
      // 🎯 Tratamento amigável para erro de tamanho de arquivo do Next.js
      if (err.message?.includes('Body exceeded')) {
        errorMsg = 'A foto é muito grande para o servidor. Tente uma imagem com menos de 2MB.';
      } else if (err.message) {
        errorMsg = `Falha na conexão: ${err.message}`;
      }
      
      setToastConfig({ 
        message: errorMsg, 
        type: 'error' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {isRedirecting && (
        <LoadingScreen message="Redirecionando para o Dashboard..." fadeOut={false} />
      )}
      <div className="relative min-h-screen bg-luxury-bg flex flex-col md:flex-row w-full z-[99]">
        <aside className="w-full md:w-[35%] bg-white border-r border-slate-100 flex flex-col h-screen md:sticky md:top-0 z-20 shadow-xl overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 no-scrollbar -mt-4">
            <form id="onboarding-form" action={clientAction} className="space-y-4">
              {/* PARA MANTER A FOTO ATUAL */}
              <input
                type="hidden"
                name="profile_picture_url_existing"
                value={initialData?.profile_picture_url || ''}
              />

              {/* SEÇÃO 1: IDENTIFICAÇÃO */}
              <FormSection title="Identificação" icon={<User size={14} />}>
                <div className="space-y-4">
                  {/* AVATAR + USERNAME EM LINHA */}
                  <div className="flex items-center gap-6">
                    {/* AVATAR UPLOAD */}
                    <div className="relative group shrink-0">
                      <input
                        type="file"
                        name="profile_picture"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // 🎯 Validação de tamanho: Máximo 5MB antes da compressão
                            if (file.size > 2 * 1024 * 1024) {
                              setToastConfig({
                                message: 'A foto de perfil é muito grande. Máximo 2MB.',
                                type: 'error',
                              });
                              e.target.value = '';
                              return;
                            }
                            setPhotoFile(file);
                            setPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-gold to-champagne shadow-xl cursor-pointer transition-all hover:scale-105 active:scale-95"
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
                              <Upload size={20} className="text-slate-300" />
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-white border border-slate-200 p-1.5 rounded-full shadow-lg text-gold z-10 hover:bg-champagne transition-colors"
                      >
                        <Pencil size={10} />
                      </button>
                    </div>

                    {/* USERNAME */}
                    <div className="flex-grow space-y-1.5">
                      <label className="text-editorial-label text-petroleum">
                        <AtSign size={12} strokeWidth={2} className="inline mr-1.5" /> Username <span className="text-gold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          readOnly={isEditMode}
                          className={`w-full px-3 h-10 bg-white border border-petroleum/40 rounded-luxury text-editorial-ink text-[13px] font-medium outline-none transition-all ${isEditMode ? 'bg-slate-50 text-editorial-gray italic' : 'focus:border-gold'}`}
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

                  {/* NOME + WHATSAPP EM LINHA */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-editorial-label text-petroleum">
                        <User size={12} strokeWidth={2} className="inline mr-1.5" /> Nome Completo <span className="text-gold">*</span>
                      </label>
                      <input
                        className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-luxury text-editorial-ink text-[13px] font-medium outline-none focus:border-gold transition-all"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-editorial-label text-petroleum">
                        <MessageCircle size={12} strokeWidth={2} className="inline mr-1.5" /> WhatsApp
                      </label>
                      <input
                        className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-luxury text-editorial-ink text-[13px] font-medium outline-none focus:border-gold transition-all"
                        value={phone}
                        onChange={(e) => setPhone(maskPhone(e))}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* SEÇÃO 2: PRESENÇA DIGITAL */}
              <FormSection title="Presença Digital" icon={<Globe size={14} />}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-editorial-label text-petroleum">
                        <Globe size={12} strokeWidth={2} className="inline mr-1.5" /> Website
                      </label>
                      <input
                        className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-luxury text-editorial-ink text-[13px] font-medium outline-none focus:border-gold transition-all"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="seusite.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-editorial-label text-petroleum">
                        <Instagram size={12} strokeWidth={2} className="inline mr-1.5" /> Instagram
                      </label>
                      <input
                        className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-luxury text-editorial-ink text-[13px] font-medium outline-none focus:border-gold transition-all"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@seu.perfil"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-editorial-label text-petroleum">
                      <ImageIcon size={12} strokeWidth={2} className="inline mr-1.5" /> Foto de capa do Perfil
                    </label>
                    <input
                      type="hidden"
                      name="background_url_existing"
                      value={initialData?.background_url || ''}
                    />
                    <input
                      type="file"
                      name="background_image"
                      ref={bgInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // 🎯 Validação de tamanho: Máximo 5MB antes da compressão
                          // O sistema irá comprimir, mas evitamos arquivos gigantescos que travam o browser
                          if (file.size > 2 * 1024 * 1024) {
                            setToastConfig({
                              message: 'A foto de fundo é muito grande. Máximo 2MB.',
                              type: 'error',
                            });
                            e.target.value = '';
                            return;
                          }
                          setBgFile(file);
                          setBgPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => bgInputRef.current?.click()}
                      className="w-full bg-slate-50 border border-petroleum/40 border-dashed rounded-luxury px-4 h-11 flex items-center justify-between hover:bg-white transition-colors group"
                    >
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-editorial-label text-petroleum truncate w-full">
                          {bgFile ? bgFile.name : 'Alterar Imagem de Fundo'}
                        </span>
                        {!bgFile && (
                          <span className="text-[9px] text-editorial-gray uppercase tracking-luxury">
                            Recomendado: 1920x1080px (Máx 2MB)
                          </span>
                        )}
                      </div>
                      {bgPreview && (
                        <div className="w-8 h-8 rounded-[0.3rem] overflow-hidden border border-petroleum/40 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
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
              </FormSection>

              {/* SEÇÃO 3: BIO & CONTATO */}
              <FormSection title="Mini Biografia" icon={<FileText size={14} />}>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    
                    <textarea
                      className="w-full px-3 py-2 bg-white border border-petroleum/40 rounded-luxury text-editorial-ink text-[13px] font-medium outline-none focus:border-gold transition-all resize-none"
                      value={miniBio}
                      maxLength={400}
                      onChange={(e) => setMiniBio(e.target.value)}
                      required
                      rows={4}
                      placeholder="Conte um pouco sobre sua trajetória profissional..."
                    />
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[9px] font-bold uppercase tracking-luxury ${miniBio.length >= 380 ? 'text-gold' : 'text-editorial-gray'}`}>
                        {miniBio.length} / 400
                      </span>
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* SEÇÃO 4: ÁREA DE ATUAÇÃO */}
              <FormSection title="Área de Atuação" icon={<MapPin size={14} />}>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedCities.map((city) => (
                      <span
                        key={city}
                        className="bg-slate-50 border border-petroleum/40 text-petroleum text-[9px] font-bold px-2.5 py-1.5 rounded-luxury flex items-center gap-2 shadow-sm uppercase tracking-luxury"
                      >
                        {city}
                        <X
                          size={12}
                          className="cursor-pointer text-editorial-gray hover:text-red-500 transition-colors"
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
                      className="w-20 bg-slate-50 border border-petroleum/40 rounded-luxury px-2 h-10 text-xs font-bold outline-none focus:border-gold transition-all"
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
                        className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-luxury text-editorial-ink text-[13px] font-medium outline-none focus:border-gold transition-all"
                        placeholder="Digite a cidade..."
                      />
                      {suggestions.length > 0 && (
                        <div className="absolute z-[100] w-full bg-white border border-petroleum/40 rounded-luxury bottom-full mb-2 shadow-2xl max-h-48 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-200">
                          {suggestions.map((city) => (
                            <button
                              key={city}
                              type="button"
                              onClick={() => handleSelectCity(city)}
                              className="w-full text-left px-4 py-3 text-editorial-label hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors text-petroleum"
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* BOTÕES DE AÇÃO - Integrados ao formulário */}
              <div className="flex items-center justify-between gap-4 pt-4 pb-8">
                <button
                  type="button"
                  onClick={() => (isEditMode ? router.push('/dashboard') : router.back())}
                  disabled={isSaving}
                  className="flex items-center justify-center rounded-luxury h-10 border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all px-6 text-editorial-label disabled:opacity-50"
                >
                  CANCELAR
                </button>
                <SubmitButton
                  form="onboarding-form"
                  success={showSuccessModal}
                  disabled={isSaving}
                  className="px-8 flex-1 rounded-luxury"
                  label={isSaving ? 'SALVANDO...' : 'SALVAR PERFIL'}
                />
              </div>
            </form>
          </div>
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
      {/* 🎯 MODAL DE SUCESSO PADRONIZADO */}
      <BaseModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Perfil Atualizado"
        subtitle="Sua presença digital foi salva"
        maxWidth="lg"
        headerIcon={
          <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/5">
            <CheckCircle2 size={24} strokeWidth={2.5} />
          </div>
        }
        footer={
          <div className="flex flex-col gap-3">
            <a
              href={`/${username}`}
              target="_blank"
              className="w-full h-12 flex items-center justify-center gap-2 bg-champagne text-petroleum rounded-luxury font-bold text-[10px] uppercase tracking-luxury hover:bg-white transition-all shadow-xl active:scale-[0.98]"
            >
              <Sparkles size={14} /> Ver Perfil Público
            </a>
            <button
              onClick={() => {
                setIsRedirecting(true);
                router.push('/dashboard');
              }}
              className="w-full h-11 text-white font-bold uppercase text-[10px] tracking-luxury hover:text-gold transition-all"
            >
              Ir para o Espaço de Galerias
            </button>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full text-white/40 py-2 text-[9px] font-bold uppercase tracking-widest hover:text-gold transition-colors"
            >
              Continuar Editando
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] md:text-[14px] leading-relaxed text-petroleum/80 font-medium text-center">
            O seu perfil atualizado agora está configurado e pronto para ser acessado pelo seu público.
          </p>
          <div className="p-4 bg-slate-50 border border-petroleum/10 rounded-luxury">
            <p className="text-[10px] font-bold text-gold/80 text-center uppercase tracking-luxury">
              Dica: Você pode alterar sua foto de capa e mini bio a qualquer momento.
            </p>
          </div>
        </div>
      </BaseModal>

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
