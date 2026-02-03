'use client';

import { GitBranch, Calendar, Hash, Package } from 'lucide-react';

interface VersionInfoProps {
  isCollapsed?: boolean;
  showFullDetails?: boolean; // Controla se mostra todas as informações ou apenas a versão
}

export default function VersionInfo({
  isCollapsed = false,
  showFullDetails = true,
}: VersionInfoProps) {
  // Obtém informações de versão das variáveis de ambiente
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';
  const commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH || 'unknown';
  const commitDate =
    process.env.NEXT_PUBLIC_COMMIT_DATE || new Date().toISOString();
  const branch = process.env.NEXT_PUBLIC_BRANCH || 'unknown';
  const buildTime =
    process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

  // Formata a data do commit
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return dateString;
    }
  };

  const formattedCommitDate = formatDate(commitDate);
  const formattedBuildTime = formatDate(buildTime);

  if (isCollapsed) {
    return (
      <div className="group relative">
        <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-[7px] font-bold text-white/90">
          v
        </div>
        {showFullDetails && (
          <div className="absolute left-full ml-4 px-3 py-2 bg-slate-950 text-white text-[9px] font-mono rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-[999] shadow-2xl whitespace-nowrap border border-white/10">
            <div className="font-bold mb-1.5 text-[10px] text-gold">
              v{version}
            </div>
            <div className="text-[8px] text-white/60 space-y-1">
              <div className="flex items-center gap-1.5">
                <Hash size={10} className="text-white/90" />
                <span>{commitHash}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GitBranch size={10} className="text-white/90" />
                <span>{branch}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={10} className="text-white/90" />
                <span>{formattedCommitDate}</span>
              </div>
              <div className="border-t border-white/5 pt-1 mt-1 text-white/90 text-[7px]">
                Build: {formattedBuildTime}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Versão - Sempre visível para todos */}
      <div className="w-full text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Package size={10} className="text-white/90" />
          <span className="text-editorial-label text-white/90">Versão</span>
        </div>
        <span className="text-[10px] font-bold text-gold font-mono">
          v{version}
        </span>
      </div>

      {/* Demais informações - Apenas se showFullDetails for true */}
      {showFullDetails && (
        <>
          {/* Hash do Commit */}
          <div className="w-full text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Hash size={10} className="text-white/90" />
              <span className="text-editorial-label text-white/90">Commit</span>
            </div>
            <span className="text-[9px] font-medium text-white/60 font-mono">
              {commitHash}
            </span>
          </div>

          {/* Branch */}
          {branch !== 'unknown' && (
            <div className="w-full text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <GitBranch size={10} className="text-white/90" />
                <span className="text-editorial-label text-white/90">
                  Branch
                </span>
              </div>
              <span className="text-[9px] font-medium text-white/60 font-mono">
                {branch}
              </span>
            </div>
          )}

          {/* Data do Commit */}
          <div className="w-full text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Calendar size={10} className="text-white/90" />
              <span className="text-editorial-label text-white/90">Deploy</span>
            </div>
            <span className="text-[9px] font-medium text-white/60 font-mono">
              {formattedCommitDate}
            </span>
          </div>

          {/* Build Time (pequeno, discreto) */}
          <div className="w-full text-center pt-1 border-t border-white/5">
            <span className="text-[7px] text-white/20 font-mono uppercase">
              Build: {formattedBuildTime.split(' ')[1]?.substring(0, 5)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
