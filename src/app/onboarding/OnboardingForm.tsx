// app/onboarding/OnboardingForm.tsx (CLIENT COMPONENT)

'use client'; // ESSENCIAL: no topo do arquivo

import { useState, useTransition, useEffect } from 'react';
import { upsertProfile } from '@/actions/profile';
import { maskPhone } from '@/utils/masks';
import AuthGuard from '../../components/AuthGuard';

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

    const [formData, setFormData] = useState({
        username: initialData?.username || suggestedUsername,
        full_name: initialData?.full_name || '',
        mini_bio: initialData?.mini_bio || '',
        phone_contact: initialData?.phone_contact || '',
        instagram_link: initialData?.instagram_link || '',
        operating_cities_str: (initialData?.operating_cities || []).join(', '), // Converte array para string para o input
        profile_picture_url: initialData?.profile_picture_url || '',
    });

    // Classes de Estilo
    const inputClass = "mt-1 block w-full rounded-lg border border-[#DADCE0] bg-white p-3 text-[#1F1F1F] placeholder-gray-500 focus:ring-2 focus:ring-[#0B57D0] focus:border-[#0B57D0] transition-all outline-none shadow-sm";
    const labelClass = "block text-sm font-medium text-[#444746] mb-1";


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

    // Handler de Submissão
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setSuccessMessage('');

        const { operating_cities_str, ...rest } = formData;

        // Finaliza os dados para o Server Action
        const finalData = {
            ...rest,
            // Converte a string de cidades separadas por vírgula para um array (para o Postgres)
            operating_cities: operating_cities_str.split(',').map(s => s.trim()).filter(s => s.length > 0)
        }

        startTransition(async () => {
            const result = await upsertProfile(finalData);

            if (result.success) {
                setSuccessMessage(isEditMode ? "Perfil atualizado com sucesso!" : "Perfil criado! Redirecionando...");
                // O Server Action fará o redirect para /dashboard
            } else {
                setFormError(result.error || "Erro desconhecido ao salvar o perfil.");
            }
        });
    };

    // Efeito para sugerir username apenas na primeira vez
    useEffect(() => {
        if (!isEditMode && !formData.username) {
            setFormData(prev => ({ ...prev, username: suggestedUsername }));
        }
    }, [isEditMode, suggestedUsername]);

    return (
        <AuthGuard>AuthGuard
            <div className="w-full max-w-2xl bg-white p-8 md:p-10 rounded-xl shadow-2xl border border-[#E0E3E7] relative z-10">

                <h1 className="text-3xl font-extrabold text-[#1F1F1F] mb-2">
                    {isEditMode ? 'Editar Perfil Profissional' : 'Finalize Seu Cadastro'}
                </h1>
                <p className="text-[#444746] mb-6">
                    {isEditMode ? 'Atualize seus dados, bio e links.' : `Seu e-mail (${email}) foi confirmado. Por favor, preencha os dados abaixo para ativar sua conta.`}
                </p>

                {formError && <p className="text-[#B3261E] bg-[#FFDAD6] p-3 rounded-lg mb-4">{formError}</p>}
                {successMessage && <p className="text-[#00A651] bg-[#DCFCE7] p-3 rounded-lg mb-4">{successMessage}</p>}


                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* 1. Nome de Usuário (Username) */}
                    <div>
                        <label className={labelClass} htmlFor="username">Nome de Usuário (URL)</label>
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
                        <label className={labelClass} htmlFor="full_name">Seu Nome/Nome do Estúdio</label>
                        <input
                            id="full_name"
                            name="full_name"
                            type="text"
                            required
                            className={inputClass}
                            placeholder="Ex: Hitalo Diniz Fotografia"
                            value={formData.full_name}
                            onChange={handleChange}
                            disabled={isPending}
                        />
                    </div>

                    {/* 3. Mini Bio/Currículo */}
                    <div>
                        <label className={labelClass} htmlFor="mini_bio">Mini Currículo/Bio (Para seu perfil público)</label>
                        <textarea
                            id="mini_bio"
                            name="mini_bio"
                            rows={3}
                            className={inputClass}
                            placeholder="Ex: Especialista em casamentos e eventos sociais no Sudeste."
                            value={formData.mini_bio}
                            onChange={handleChange}
                            disabled={isPending}
                        />
                    </div>

                    {/* 4. Cidades e Contato (Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass} htmlFor="operating_cities_str">Cidades de Atuação (separadas por vírgula)</label>
                            <input
                                id="operating_cities_str"
                                name="operating_cities_str"
                                type="text"
                                className={inputClass}
                                placeholder="Ex: São Paulo, Rio, Belo Horizonte"
                                value={formData.operating_cities_str}
                                onChange={handleChange}
                                disabled={isPending}
                            />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="phone_contact">Telefone de Contato (WhatsApp)</label>
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
                    </div>

                    {/* 5. Links e Foto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass} htmlFor="instagram_link">Link do Instagram</label>
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
                        <div>
                            <label className={labelClass} htmlFor="profile_picture_url">URL da Foto de Perfil (Opcional)</label>
                            <input
                                id="profile_picture_url"
                                name="profile_picture_url"
                                type="url"
                                className={inputClass}
                                placeholder="Link para a sua foto (Ex: Supabase Storage)"
                                value={formData.profile_picture_url}
                                onChange={handleChange}
                                disabled={isPending}
                            />
                        </div>
                    </div>


                    {/* Botão de Submissão */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-[#0B57D0] text-white py-3 rounded-lg text-lg font-semibold hover:bg-[#0849B3] transition-colors shadow-md disabled:bg-[#A8C7FA]"
                        >
                            {isPending ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Criar Meu Perfil')}
                        </button>
                    </div>

                </form>
            </div>
        </AuthGuard>
    );
}