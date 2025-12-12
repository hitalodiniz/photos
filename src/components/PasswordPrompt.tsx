
'use client';

interface PasswordPromptProps {
  galeriaTitle: string;
  formAction: (formData: FormData) => Promise<any>; // Server Action bindada
}

export function PasswordPrompt({ galeriaTitle, formAction }: PasswordPromptProps) {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm border border-gray-200">
        <div className="text-center mb-6 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-2 text-center text-gray-800">Acesso Restrito</h2>
        <p className="text-center text-gray-600 mb-6">
          Para visualizar a galeria: <strong className="font-semibold">{`"${galeriaTitle}"`}</strong>, insira a senha.
        </p>

        {/* FORMULÁRIO COM ACTION VINCULADO À SERVER ACTION */}
        <form action={formAction}>
          <div className="mb-4">
            <input
              type="password"
              name="password" // ← ESSENCIAL para o servidor ler via FormData
              placeholder="Senha de Acesso (Mock)"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold shadow-md"
          >
            Acessar Galeria
          </button>
        </form>
      </div>
       </main>
  );
}