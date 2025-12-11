'use client';

import { useState, useTransition, useEffect } from 'react';
import { upsertProfile } from '@/actions/profile';
import { maskPhone } from '@/utils/masks';
import Image from 'next/image';

interface OnboardingProps {
    initialData: any | null; // Dados do tb_profiles
    suggestedUsername: string;
    email: string;
    isEditMode: boolean; // Se for edição ou criação
}

export default function OnboardingForm({ initialData, suggestedUsername, email, isEditMode }: OnboardingProps) {
    const [isPending, startTransition] = useTransition();
    const [formError, setFormError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Novo Estado para o Arquivo
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    // Novo Estado para o Preview da Imagem (URL do blob ou URL existente)
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(initialData?.profile_picture_url || null);

    const [formData, setFormData] = useState({
        username: initialData?.username || suggestedUsername,
        full_name: initialData?.full_name || '',
        mini_bio: initialData?.mini_bio || '',
        phone_contact: initialData?.phone_contact || '',
        operating_cities_str: (initialData?.operating_cities || []).join(', '),
        instagram_link: initialData?.instagram_link || '',
    });

    // Estilos Material Design
    const inputClass = "mt-1 block w-full rounded-lg border-none bg-[#F0F4F9] p-2 text-[#1F1F1F] placeholder-gray-500 focus:ring-2 focus:ring-[#0B57D0] focus:bg-white transition-all outline-none";
    const labelClass = "block text-sm font-medium text-[#444746] ml-1";

    // Handler de Mudança para Inputs
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // Aplica a máscara de telefone
        if (name === 'phone_contact') {
            const maskedValue = maskPhone({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
            setFormData(prev => ({ ...prev, [name]: maskedValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // 🔑 NOVO: Handler para o input de arquivo
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePictureFile(file);
            // Cria uma URL local para preview
            setImagePreviewUrl(URL.createObjectURL(file));
        } else {
            setProfilePictureFile(null);
            // Volta para a URL existente se o arquivo for limpo
            setImagePreviewUrl(initialData?.profile_picture_url || null);
        }
        setFormError('');
    };

    // 🔑 NOVO: Handler de Submissão que usa FormData
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        console.log("--- 1. INICIANDO SUBMISSÃO (CLIENTE) ---");

        try {
            // 1. Criação do FormData (Ponto crítico que precisa ser 100% seguro)
            const formDataPayload = new FormData(e.currentTarget);

            console.log("--- 2. FormData criado. ---");

            // 2. Preparação dos dados complexos (Verifique se 'formData' existe e é correto)
            // Onde 'formData' vem? Assumo que é um estado que contém os dados a serem serializados.
            const operating_cities = formData.operating_cities_str.split(',').map(s => s.trim()).filter(s => s.length > 0);
            // ... (resto da preparação dos dados)
            console.log("--- 3. Dados complexos preparados. ---");

            // Adiciona dados complexos ao payload
            formDataPayload.set('operating_cities', JSON.stringify(operating_cities));

            // 3. Chamada ao Server Action
            startTransition(async () => {
                console.log("--- 4. EXECUTANDO startTransition/upsertProfile ---");

                const result = await upsertProfile(formDataPayload);

                console.log("--- 5. RETORNO DO SERVER ACTION ---", result);

                if (result.success) {
                    // ... (lógica de sucesso) ...
                } else {
                    // ... (lógica de erro) ...
                }
            });

        } catch (error) {
            // Captura qualquer erro síncrono antes do startTransition
            console.error("--- ERRO FATAL SÍNCRONO NO CLIENTE ---", error);
        }
    };

    // 🚨 O useEffect para sugerir username foi removido pois a sugestão ocorre no useState.

    return (
        <div className="w-full max-w-3xl bg-white p-6 md:p-10 rounded-xl shadow-xl border border-[#E0E3E7] relative z-10 gap-6">

            <h1 className="text-2xl font-extrabold text-[#1F1F1F] mb-2">
                {isEditMode ? 'Editar perfil profissional' : 'Finalize seu cadastro'}
            </h1>
            <p className="text-[#444746] mb-6">
                {isEditMode ? '' : `Seu e-mail foi confirmado. Por favor, preencha os dados abaixo para ativar sua conta.`}
            </p>

            {formError && <p className="text-[#B3261E] bg-[#FFDAD6] p-3 rounded-lg mb-4">{formError}</p>}
            {successMessage && <p className="text-[#00A651] bg-[#DCFCE7] p-3 rounded-lg mb-4">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    {/* 1. Nome de Usuário (Username) */}
                    <div>
                        <label className={labelClass} htmlFor="username">Nome de usuário (URL)</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            className={inputClass}
                            placeholder={suggestedUsername}
                            value={formData.username}
                            onChange={handleChange}
                            pattern="[a-zA-Z0-9_.]+"
                            title="Apenas letras, números, pontos e underscores."
                            disabled={isPending}
                        />
                        <p className="text-xs text-[#747775] mt-1">Seu link: /@**{formData.username || 'nome_aqui'}**</p>
                    </div>
                    {/* 2. Nome Completo */}
                    <div>
                        <label className={labelClass} htmlFor="full_name">Seu nome ou nome do estúdio</label>
                        <input
                            id="full_name"
                            name="full_name"
                            type="text"
                            required
                            className={inputClass}
                            placeholder="Ex: Estúdio Fotografia"
                            value={formData.full_name}
                            onChange={handleChange}
                            disabled={isPending}
                        />
                    </div>
                </div>

                {/* 3. Mini Bio/Currículo */}
                <div>
                    <label className={labelClass} htmlFor="mini_bio">Mini currículo/bio (para seu perfil público)</label>
                    <textarea
                        id="mini_bio"
                        name="mini_bio"
                        rows={3}
                        className={inputClass}
                        placeholder="Ex: Especialista em casamentos e eventos sociais."
                        value={formData.mini_bio}
                        onChange={handleChange}
                        disabled={isPending}
                    />
                </div>

                {/* 4. Cidades e Contato (Grid) */}

                <div>
                    <label className={labelClass} htmlFor="operating_cities_str">Cidades de atuação (separadas por vírgula)</label>
                    <input
                        id="operating_cities_str"
                        name="operating_cities_str"
                        type="text"
                        className={inputClass}
                        placeholder="Ex: Belo Horizonte, São Paulo, Rio"
                        value={formData.operating_cities_str}
                        onChange={handleChange}
                        disabled={isPending}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass} htmlFor="phone_contact">WhatsApp</label>
                        <input
                            id="phone_contact"
                            name="phone_contact"
                            type="tel"
                            className={inputClass}
                            placeholder="(XX) XXXXX-XXXX"
                            value={formData.phone_contact}
                            onChange={handleChange}
                            disabled={isPending}
                        />
                    </div>


                    {/* 5. Links e Foto */}
                    <div>
                        <label className={labelClass} htmlFor="instagram_link">Instagram</label>
                        <input
                            id="instagram_link"
                            name="instagram_link"
                            type="url"
                            className={inputClass}
                            placeholder="https://instagram.com/seuusuario"
                            value={formData.instagram_link}
                            onChange={handleChange}
                            disabled={isPending}
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-[#E0E3E7]">
                    <label className={labelClass} htmlFor="profile_picture_file">Foto de perfil</label>
                    <div className="flex items-center space-x-4 mt-2">

                        {/* Preview da Imagem */}
                        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#DADCE0] bg-[#F1F3F4] flex-shrink-0">
                            {imagePreviewUrl ? (
                                <Image
                                    src={imagePreviewUrl}
                                    alt="Preview"
                                    layout="fill"
                                    objectFit="cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#747775] text-sm">
                                    Foto
                                </div>
                            )}
                        </div>

                        {/* Input de Arquivo */}
                        <label htmlFor="profile_picture_file" className="cursor-pointer bg-[#0B57D0] text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#0849B3] transition-colors">
                            {imagePreviewUrl ? 'Trocar Foto' : 'Selecionar Foto'}
                        </label>
                        <input
                            id="profile_picture_file"
                            name="profile_picture_file"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileChange}
                            className="hidden" // Esconde o input nativo
                            disabled={isPending}
                        />

                        {profilePictureFile && (
                            <span className="text-sm text-[#444746] truncate max-w-[150px]">
                                {profilePictureFile.name}
                            </span>
                        )}

                        {/* Campo Hidden para a URL Antiga */}
                        <input
                            type="hidden"
                            name="profile_picture_url_existing"
                            value={initialData?.profile_picture_url || ''}
                        />
                    </div>
                    <p className="text-xs text-[#747775] mt-2">Formatos: JPG, PNG, WEBP. Máx. 1MB.</p>
                </div>


                {/* Botão de Submissão */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-[#0B57D0] text-white font-medium text-sm py-3 px-6 rounded-full hover:bg-[#09429E] hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"                    >
                        {isPending ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Criar Meu Perfil')}
                    </button>
                </div>
            </form>
        </div>
    );
}