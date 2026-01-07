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
    <main className="flex-grow flex items-center justify-center px-4 py-4 md:px-6 md:py-6">
      <section className="w-full max-w-7xl mx-auto">
        <div
          className={`grid grid-cols-1 gap-6 md:gap-4 ${
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
                className={`group flex gap-2 md:gap-4 p-2 md:p-6 bg-[#2A2D31] border border-white/5 shadow-2xl transition-all duration-300 ${
                  isTop
                    ? 'flex-col items-center text-center'
                    : 'flex-row items-center text-left'
                } ${
                  isFullWidth ? 'lg:col-span-full' : ''
                } rounded-[2rem] md:rounded-[3rem]`}
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
                        className: 'w-8 h-8 md:w-12 md:h-12',
                      })
                    : item.icon}
                </div>

                <div
                  className={`flex flex-col ${isTop ? 'items-center' : 'items-start'}`}
                >
                  <h3 className="text-white font-black uppercase tracking-[0.2em] text-[12px] md:text-[15px] mb-2 leading-tight">
                    {item.title}
                  </h3>
                  <div
                    className={`text-white/70 text-[12px] md:text-[14px] font-medium leading-relaxed transition-colors group-hover:text-white/90 ${
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
