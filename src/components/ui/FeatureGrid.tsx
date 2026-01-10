'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  desc: string | React.ReactNode;
}

interface FeatureGridProps {
  items: FeatureItemProps[];
  columns?: 2 | 3;
  iconPosition?: 'left' | 'top'; // Novo parâmetro para flexibilidade de layout
}

export default function FeatureGrid({
  items,
  columns = 2,
  iconPosition = 'left',
}: FeatureGridProps) {
  const isTop = iconPosition === 'top';

  return (
    <main className="flex-grow flex items-center justify-center px-4 py-4 md:px-4 md:py-4">
      <section className="w-full max-w-5xl mx-auto">
        <div
          className={`grid grid-cols-1 gap-4 md:gap-4 ${
            columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
          }`}
        >
          {items.map((item, index) => {
            const isFullWidth = items.length === 1;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ backgroundColor: '#32363b', scale: 1.01 }}
                /* Ajuste dinâmico de layout: flex-row (left) ou flex-col (top) */

                className={`group flex  bg-slate-800/80 gap-2 md:gap-4 p-3 backdrop-blur-md border border-white/10 text-white shadow-2xl transition-all duration-300 ${
                  isTop
                    ? 'flex-col items-center text-center md:p-4'
                    : 'flex-row items-center text-left  md:p-6'
                } ${
                  isFullWidth ? 'lg:col-span-full' : ''
                } rounded-[0.5rem] md:rounded-[1rem]`}
              >
                {/* Ícone Champanhe com Glow focado */}
                <div
                  className={`flex-shrink-0 text-[#D4AF37] group-hover:drop-shadow-[0_0_12px_rgba(212,175,55,0.6)] transition-all duration-300 ${
                    isTop ? 'mb-2' : ''
                  }`}
                >
                  {React.isValidElement(item.icon)
                    ? React.cloneElement(item.icon as React.ReactElement, {
                        // Usando className do Tailwind para controlar o tamanho por breakpoint
                        className: 'w-8 h-8 md:w-10 md:h-10',
                      })
                    : item.icon}
                </div>

                <div
                  className={`flex flex-col ${isTop ? 'items-center' : 'items-start'}`}
                >
                  <h3 className="text-white font-black uppercase tracking-[0.2em] text-[11px] md:text-[14px] mb-1 md:mb-2 leading-tight">
                    {item.title}
                  </h3>
                  <div
                    className={`text-white/70 text-[11px] md:text-[13px] font-medium leading-relaxed transition-colors group-hover:text-white/90 ${
                      isTop ? 'max-w-md' : ''
                    }`}
                  >
                    {item.desc}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
