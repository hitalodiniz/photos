'use client';

// Assumindo que '../lib/supabase' exporta o cliente supabase configurado.
import { supabase } from '../lib/supabase';

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
      redirectTo: `${window.location.origin}/dashboard`
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
        // O Botão (Seguindo as diretrizes de Branding do Google)
        <button 
            onClick={signInWithGoogle} 
            className="flex items-center justify-center 
                       bg-white text-[#3C4043] font-medium 
                       border border-[#DADCE0] rounded-lg 
                       shadow-sm hover:bg-[#F8F9FA] /* Efeito sutil de hover */
                       py-2 px-4 transition-all duration-150 
                       max-w-sm w-full mx-auto" 
            title="Continue com sua Conta Google"
        >
            {/* Ícone SVG do Google (O Logo 'G' colorido) */}
            <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M44.5 20H24v8h11.3c-1.1 3.4-3.8 7-9.3 7-5.5 0-10-4.5-10-10s4.5-10 10-10c3.5 0 6.1 1.5 7.4 2.6l4.4-4.2C37.2 6.9 31.7 4 24 4 13.9 4 5.2 11.7 5.2 22s8.7 18 18.8 18c11.7 0 19.3-8.2 19.3-17.7 0-1.1-.1-2.1-.3-3.1z" fill="#4285F4"/>
                <path d="M5.2 22s8.7 18 18.8 18c11.7 0 19.3-8.2 19.3-17.7 0-1.1-.1-2.1-.3-3.1L24 28v-8h20.5A24 24 0 0 1 44.8 24C44.8 34.2 37.5 44 24 44 13.9 44 5.2 36.3 5.2 26z" fill="#34A853"/>
                <path d="M4 24a20 20 0 0 1 20-20c5.7 0 10.7 2.1 14.6 6L33 13C30.6 11 27.6 10 24 10c-5.5 0-10 4.5-10 10s4.5 10 10 10c4.7 0 8.3-2.5 9.7-6.8L44.8 24C44.8 13.8 37.5 4 24 4 13.9 4 5.2 11.7 5.2 22z" fill="#FBBC05"/>
                <path d="M4 24a20 20 0 0 1 20-20c5.7 0 10.7 2.1 14.6 6L33 13C30.6 11 27.6 10 24 10c-5.5 0-10 4.5-10 10s4.5 10 10 10c4.7 0 8.3-2.5 9.7-6.8L44.8 24C44.8 13.8 37.5 4 24 4 13.9 4 5.2 11.7 5.2 22z" fill="#EA4335"/>
            </svg>
            Continue com Google
        </button>
    );
}

// Nota: Se você for para produção, Lembre-se de mudar 'http://localhost:3000'
// para o seu domínio real (ex: https://suagaleria.com.br/auth/callback)