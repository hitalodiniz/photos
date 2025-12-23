// components/DashboardUI/Toast.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  const color =
    type === "success"
      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
      : "bg-red-50 border-red-300 text-red-900";

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed bottom-4 right-4 z-50"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-sm ${color}`}
          >
            <span className="text-sm">{message}</span>
            <button
              onClick={onClose}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              fechar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
