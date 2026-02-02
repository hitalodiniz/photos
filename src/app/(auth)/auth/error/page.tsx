'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-luxury-bg px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 max-w-md w-full text-center"
      >
        {/* Ícone */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="h-12 w-12 text-red-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </motion.div>

        {/* Título */}
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Ocorreu um erro ao autenticar
        </h1>

        {/* Mensagem */}
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Não foi possível completar o processo de login. Isso pode acontecer
          por expiração do código, janela fechada ou erro temporário.
        </p>

        {/* Botão voltar */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/"
            className="inline-block w-full bg-gold text-black py-3 rounded-lg text-[10px] font-semibold uppercase tracking-luxury-widest hover:bg-gold/90 transition-colors"
          >
            Tentar novamente
          </Link>
        </motion.div>

        {/* Link para home */}
        <Link
          href="/"
          className="block mt-4 text-[10px] text-slate-600 uppercase tracking-luxury-widest hover:text-gold transition-colors"
        >
          Voltar para a página inicial
        </Link>
      </motion.div>
    </div>
  );
}
