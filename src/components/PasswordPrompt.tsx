// components/PasswordPrompt.tsx
"use client";

import { useState } from "react";
import { authenticateGaleriaAccess } from "@/actions/galeria";

const inputClass =
  "mt-1 block w-full rounded-lg border-none bg-[#F0F4F9] p-3 text-[#1F1F1F] placeholder-gray-500 focus:ring-2 focus:ring-[#0B57D0] focus:bg-white transition-all outline-none";

export function PasswordPrompt({
  galeriaTitle,
  galeriaId,
  fullSlug,
}: {
  galeriaTitle: string;
  galeriaId: string;
  fullSlug: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 4) {
      setError("A senha deve ter no mínimo 4 dígitos.");
      return;
    }

    setIsChecking(true);

    try {
      const result = await authenticateGaleriaAccess(
        galeriaId,
        fullSlug,
        password
      );

      if (result && !result.success) {
        setError(
          result.error || "Erro de acesso desconhecido. Tente novamente."
        );
      }
      // Se a server action der redirect() correto, a navegação acontece e daqui pra baixo nem roda.
    } catch (e) {
      console.error("Erro durante a autenticação:", e);
      setError("Erro de servidor ou rede. Tente mais tarde.");
    }

    setIsChecking(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFD] p-4">
      <div className="max-w-md mx-auto p-8 bg-white rounded-[16px] shadow-2xl text-center border border-[#E0E3E7]">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso privado</h2>
        <p className="text-gray-600 mb-6">
          Insira a senha para acessar a galeria: <strong>{galeriaTitle}</strong>
        </p>

        <form onSubmit={handleCheckPassword} className="space-y-4">
          <input
            type="password"
            placeholder="Senha (4-8 dígitos)"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))
            }
            maxLength={8}
            minLength={4}
            required
            className={inputClass}
          />

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={isChecking}
            className="w-full bg-[#0B57D0] text-white font-medium py-3 rounded-full hover:bg-[#09429E] disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {isChecking ? "Verificando..." : "Acessar galeria"}
          </button>
        </form>
      </div>
    </div>
  );
}
