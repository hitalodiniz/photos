'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase.client';
import { useRouter } from 'next/navigation';

interface Profile {
  full_name: string | null;
  username: string | null;
  mini_bio: string | null;
}

export default function OnboardingForm({
  initialData,
  email,
  suggestedUsername,
  isEditMode,
}: {
  initialData: Profile | null;
  email: string;
  suggestedUsername: string;
  isEditMode: boolean;
}) {
  const router = useRouter();

  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [username, setUsername] = useState(
    initialData?.username || suggestedUsername
  );
  const [miniBio, setMiniBio] = useState(initialData?.mini_bio || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/');
      return;
    }

    const { error } = await supabase
      .from('tb_profiles')
      .update({
        full_name: fullName,
        username,
        mini_bio: miniBio,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      console.error('Erro ao salvar perfil:', error);
      alert('Erro ao salvar. Tente novamente.');
      return;
    }

    router.replace('/dashboard');
  };

  return (
    <div className="max-w-md w-full bg-white shadow-sm rounded-lg p-6">
      <h1 className="text-xl font-semibold mb-4">
        {isEditMode ? 'Atualize seu perfil' : 'Bem-vindo! Vamos começar'}
      </h1>

      <label className="block mb-3">
        <span className="text-sm text-gray-700">Nome completo</span>
        <input
          className="mt-1 w-full border rounded px-3 py-2 text-sm"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </label>

      <label className="block mb-3">
        <span className="text-sm text-gray-700">Username</span>
        <input
          className="mt-1 w-full border rounded px-3 py-2 text-sm"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>

      <label className="block mb-4">
        <span className="text-sm text-gray-700">Mini bio</span>
        <textarea
          className="mt-1 w-full border rounded px-3 py-2 text-sm"
          rows={3}
          value={miniBio}
          onChange={(e) => setMiniBio(e.target.value)}
        />
      </label>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-black text-white py-2 rounded hover:bg-gray-900 disabled:opacity-50"
      >
        {saving ? 'Salvando...' : 'Salvar e continuar'}
      </button>
    </div>
  );
}
