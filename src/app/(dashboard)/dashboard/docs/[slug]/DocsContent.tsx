'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

interface DocsContentProps {
  content: string;
  slug: string;
}

export default function DocsContent({ content, slug }: DocsContentProps) {
  const fileName = useMemo(() => {
    return `${slug}.md`;
  }, [slug]);

  return (
    <div className="min-h-screen bg-black dark:bg-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header com botão de voltar */}
        <div className="mb-8">
          <Link
            href="/dashboard/docs"
            className="inline-flex items-center gap-2 text-champagne/80 hover:text-champagne transition-colors duration-300 mb-6 group"
          >
            <ArrowLeft
              className="group-hover:-translate-x-1 transition-transform duration-300"
              size={20}
            />
            <span className="text-sm font-medium">Voltar para documentação</span>
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-champagne/10 rounded-lg flex items-center justify-center border border-champagne/20">
              <FileText className="text-champagne" size={20} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-champagne">
                {slug}
              </h1>
              <p className="text-white/50 text-sm mt-1">{fileName}</p>
            </div>
          </div>
        </div>

        {/* Conteúdo Markdown */}
        <div className="bg-black/90 dark:bg-black/90 backdrop-blur-md border border-white/10 dark:border-white/10 rounded-2xl p-8 md:p-12">
          <div className="prose prose-invert prose-lg max-w-none prose-headings:text-champagne prose-a:text-champagne prose-a:hover:text-champagne/80 prose-strong:text-champagne prose-code:text-champagne prose-code:bg-champagne/10 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-blockquote:border-l-champagne/50 prose-blockquote:text-white/70 prose-hr:border-white/10 prose-th:bg-champagne/10 prose-th:text-champagne prose-th:border-white/10 prose-td:border-white/10 prose-td:text-white/80">
            <ReactMarkdown
              components={{
                // Customizações específicas para manter cores douradas e melhorar visualização
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-champagne/10 text-champagne px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-champagne hover:text-champagne/80 underline transition-colors duration-300"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-white/10">
                      {children}
                    </table>
                  </div>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
