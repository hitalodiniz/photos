"use client"; // ESSENCIAL: Marca este arquivo como um Cliente Component

import { useState } from 'react';
// IMPORTAÇÃO REAL: Server Action para checar a senha
import { authenticateGaleriaAccess } from '@/actions/galeria'; 
import { redirect } from 'next/navigation';

// NOTA: Os estilos inputClass são definidos localmente para evitar importar o AdminUI no frontend da Galeria
const inputClass = "mt-1 block w-full rounded-lg border-none bg-[#F0F4F9] p-3 text-[#1F1F1F] placeholder-gray-500 focus:ring-2 focus:ring-[#0B57D0] focus:bg-white transition-all outline-none";

// Esta função deve ser renderizada APENAS se a galeria for privada
export function PasswordPrompt({ galeriaTitle, galeriaId, fullSlug }: { galeriaTitle: string, galeriaId: string, fullSlug: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  
  const handleCheckPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 4) {
      setError("A senha deve ter no mínimo 4 dígitos.");
      return;
    }

    setIsChecking(true);
    
    try {
        // --- CHAMADA REAL À SERVER ACTION ---
        // A Server Action irá definir o cookie E executar o redirect() se a senha estiver correta.
        const result = await authenticateGaleriaAccess(galeriaId, fullSlug, password);
        
        // Se a Server Action não fez o redirect (porque falhou na senha), ela retorna um objeto { success: false, ... }
        
        if (result && !result.success) {
            // Caso a Server Action retorne um erro (result.success === false)
            setError(result.error || "Erro de acesso desconhecido. Tente novamente.");
        }
        
    } catch (e) {
        // O redirect() no servidor LANÇA um erro interno que o Next.js captura,
        // mas que pode ser capturado aqui se algo der errado no fluxo.
        // Se o redirect foi BEM-SUCEDIDO, o código abaixo não deve ser alcançado.
        // Se a senha estiver correta, a navegação ocorre aqui.
        
        // Opcional: Se a Server Action FALHAR por motivo de rede/servidor
        console.error("Erro durante a autenticação:", e);
        setError("Erro de servidor ou rede. Tente mais tarde.");
    }
    
    // Se o redirect não ocorreu, limpamos o estado de checking.
    setIsChecking(false);
  };
  
  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-[16px] shadow-2xl text-center border border-[#E0E3E7]">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Privado</h2>
        <p className="text-gray-600 mb-6">Insira a senha para acessar a galeria: **{galeriaTitle}**</p>
        
        <form onSubmit={handleCheckPassword} className="space-y-4">
            <input 
                type="password"
                placeholder="Senha (4-8 dígitos)"
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 8))}
                maxLength={8}
                minLength={4}
                required
                className={inputClass}
            />
            
            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

            <button
                type="submit"
                disabled={isChecking}
                className="w-full bg-[#0B57D0] text-white font-medium py-3 rounded-full 
                           hover:bg-[#09429E] disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
                {isChecking ? 'Verificando...' : 'Acessar Galeria'}
            </button>
        </form>
    </div>
  );
}