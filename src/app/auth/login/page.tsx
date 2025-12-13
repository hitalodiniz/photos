"use client";

import { motion } from "framer-motion";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 bg-[#F8FAFD] font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-[#E9EEF6] opacity-50 transform skew-y-3 origin-top-left"></div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="max-w-lg w-full text-center p-8 lg:p-10 bg-white rounded-2xl shadow-2xl border border-[#E0E3E7] relative z-10 mt-20"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center mb-6"
        >
          <svg className="w-12 h-12 text-[#0B57D0] mb-3" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M7 10l5 5 5-5"></path>
          </svg>

          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#1F1F1F] mb-3">
            Bem-vindo de volta
          </h1>
          <p className="text-[#444746] text-base lg:text-md">
            Acesse sua conta para gerenciar suas galerias.
          </p>
        </motion.div>

        <GoogleSignInButton />

        <div className="mt-8 border-t border-[#E0E3E7] pt-4">
          <p className="text-xs text-[#444746]">
            Ao continuar, você concorda com nossos termos de uso e política de privacidade.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
