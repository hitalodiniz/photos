'use client'; 

import { useEffect } from 'react';
// Não precisamos do useRouter para esta lógica, o que a torna mais simples.

export default function UrlCleaner(): null {
  useEffect(() => {
    // 1. O Supabase geralmente usa o URL Hash (#)
    const hasHash = window.location.hash.includes('access_token') || 
                    window.location.hash.includes('refresh_token');

    // 2. Verifica se há token na Query String (?)
    const hasQueryToken = window.location.search.includes('access_token');
    
    // Se houver qualquer indicação de token na URL
    if (hasHash || hasQueryToken) {
      
      // Obtém a URL base (protocolo, domínio e caminho, ex: http://localhost:3000/dashboard)
      // O replaceState usará esta URL base e removerá o restante.
      const cleanUrl = window.location.origin + window.location.pathname; 

      // Substitui o estado atual do histórico.
      // Usa uma array de dependências vazia ([]) para que rode apenas uma vez (no mount).
      window.history.replaceState(
        null, 
        document.title, 
        cleanUrl
      );
      
      console.log('Token de sessão e parâmetros removidos da URL.');
    }
  }, []); // A array vazia garante que rode apenas uma vez, assim que o componente monta.

  return null; 
}