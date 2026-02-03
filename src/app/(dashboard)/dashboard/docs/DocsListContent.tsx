'use client';

import Link from 'next/link';
import { FileText, BookOpen } from 'lucide-react';

interface DocsFile {
  name: string;
  slug: string;
}

interface DocsListContentProps {
  docsFiles: DocsFile[];
}

export default function DocsListContent({ docsFiles }: DocsListContentProps) {
  return (
    <div className="min-h-screen bg-black dark:bg-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="text-champagne" size={32} strokeWidth={2} />
            <h1 className="text-3xl md:text-4xl font-bold text-champagne">
              Documentação Técnica
            </h1>
          </div>
          <p className="text-white/90 text-sm md:text-base">
            Documentação técnica completa do projeto
          </p>
        </div>

        {/* Lista de Documentos */}
        {docsFiles.length === 0 ? (
          <div className="bg-black/90 dark:bg-black/90 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
            <FileText className="text-champagne/50 mx-auto mb-4" size={48} />
            <p className="text-white/50">Nenhum documento encontrado</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {docsFiles.map((file) => (
              <Link
                key={file.slug}
                href={`/dashboard/docs/${file.slug}`}
                className="group bg-black/90 dark:bg-black/90 backdrop-blur-md border border-white/10 dark:border-white/10 rounded-xl p-6 hover:border-champagne/50 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-champagne/10 dark:bg-champagne/10 rounded-lg flex items-center justify-center border border-champagne/20 group-hover:border-champagne/50 transition-colors duration-300">
                    <FileText
                      className="text-champagne"
                      size={24}
                      strokeWidth={2}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-champagne font-semibold text-lg mb-1 group-hover:text-champagne transition-colors duration-300">
                      {file.name.replace('.md', '')}
                    </h3>
                    <p className="text-white/50 text-sm truncate">
                      {file.name}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-8 h-8 rounded-full bg-champagne/10 flex items-center justify-center">
                      <span className="text-champagne text-xs">→</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
