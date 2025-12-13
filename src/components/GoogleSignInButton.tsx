'use client';

// Assumindo que '../lib/supabase' exporta o cliente supabase configurado.
import { supabase } from '@/lib/supabase.client'

// 1. A função signInWithGoogle deve ser declarada como uma arrow function ou ter o corpo corrigido.
// Removi o 'export' desnecessário, pois ela é uma função interna do componente.
async function signInWithGoogle() {
  // A chamada de função deve ser feita com a sintaxe correta:
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Utilizamos a rota de callback explícita (http://localhost:3000/auth/callback)
      // se o ambiente for local. Caso contrário, você deve usar o domínio de produção.
      // Para o desenvolvimento local, esta URL é mais segura.
      scopes: 'email profile openid https://www.googleapis.com/auth/drive.readonly',
      redirectTo: `${window.location.origin}/api/auth/callback`,
      queryParams: {
        access_type: "offline", // <-- AGORA ESTÁ DENTRO DE queryParams
        prompt: "consent",      // <-- RECOMENDADO: Garante que o usuário veja a tela de permissão
      },
      // Opcional (Recomendado): Força o Google a mostrar a seleção de contas
      //queryParams: {
      //  prompt: 'select_account',
      // }
    },

  }); // <-- A sintaxe de fechamento do objeto e da função está correta aqui.


  if (error) {
    console.error('Erro ao iniciar o login com Google:', error.message);
    alert('Ocorreu um erro. Tente novamente: ' + error.message);
  }
}

// 2. O componente principal é exportado
export default function GoogleSignInButton() {
  return (
    <button
      onClick={signInWithGoogle}
      // Aplica o novo estilo GSI Customizado
      className="flex items-center justify-start 
                       bg-white text-[#3C4043] font-medium 
                       border border-[#DADCE0] rounded-lg 
                       shadow-sm hover:bg-[#F8F9FA] 
                       py-2 px-4 transition-all duration-150 
                       max-w-smflex items-center justify-center 
                       bg-white text-[#3C4043] font-medium 
                       border border-[#DADCE0] rounded-lg 
                       shadow-sm hover:bg-[#F8F9FA] 
                       py-2 px-4 transition-all duration-150 
                       max-w-sm w-full mx-auto w-full mx-auto"
      title="Entrar com sua conta do Google"
    >
      {/* Ícone SVG do Google (Mantenha o SVG que já temos) */}
      <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">

        {/* 1. Path Azul (Primário) */}
        <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />

        {/* 2. Path Verde */}
        <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />

        {/* 3. Path Amarelo */}
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />

        {/* 4. Path Vermelho */}
        <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />

      </svg>
      <div className='justify-center'>
        Entrar com sua conta do Google</div>
    </button>
  );
}

// Nota: Se você for para produção, Lembre-se de mudar 'http://localhost:3000'
// para o seu domínio real (ex: https://suagaleria.com.br/auth/callback)