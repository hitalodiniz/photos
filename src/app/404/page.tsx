"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFD] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-2xl shadow-lg border border-[#E0E3E7] p-10 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <div className="h-20 w-20 rounded-full bg-[#E9EEF6] flex items-center justify-center">
            <span className="text-3xl">😕</span>
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold text-[#1F1F1F] mb-2">
          Página não encontrada
        </h1>
        <p className="text-sm text-[#444746] mb-6 leading-relaxed">
          Não encontramos o conteúdo que você está procurando.  
          O link pode estar incorreto ou a galeria não está mais disponível.
        </p>

        <div className="space-y-2">
          <Link
            href="/"
            className="inline-block w-full bg-[#0B57D0] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0842a4] transition-colors"
          >
            Voltar para a página inicial
          </Link>
          <Link
            href="/"
            className="inline-block w-full text-xs text-[#444746] hover:text-[#0B57D0] transition-colors"
          >
            Ir para a área de login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
