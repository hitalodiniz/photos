'use client';

import { supabase } from '../lib/supabase'; // Importe o cliente Supabase que você criou

async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Redirecione o fotógrafo para o Dashboard após o login.
      redirectTo: `${window.location.origin}/admin`, 
    },
  });

  if (error) {
    console.error('Erro ao iniciar o login com Google:', error.message);
    // Adicione um tratamento de erro visível para o usuário
    alert('Ocorreu um erro. Tente novamente.'); 
  }
}

export default function GoogleSignInButton() {
  return (
    <button 
      onClick={signInWithGoogle}   >
      Entrar com Google
    </button>
  );
}