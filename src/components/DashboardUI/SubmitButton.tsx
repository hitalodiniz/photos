// components/DashboardUI/SubmitButton.tsx
"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  label?: string;
}

export default function SubmitButton({ label = "Salvar" }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition-colors ${
        pending ? "bg-gray-500 cursor-not-allowed" : "bg-[#0B57D0] hover:bg-[#0842a4]"
      }`}
    >
      {pending && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      )}
      <span>{pending ? "Salvando..." : label}</span>
    </button>
  );
}
