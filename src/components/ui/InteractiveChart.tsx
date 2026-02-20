'use client';

import { useState, useMemo } from 'react';
import { Maximize2, X, TrendingUp, Eye, Download, Share2 } from 'lucide-react';

export default function InteractiveChart({
  timelineData,
}: {
  timelineData: any[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const config = useMemo(() => {
    const width = isExpanded ? 1100 : 500;
    const height = isExpanded ? 400 : 180;
    const pLeft = 55;
    const pRight = 20;
    const pTop = 30;
    const pBottom = isExpanded ? 50 : 35;

    const maxVal = Math.max(
      ...timelineData.map((d) =>
        Math.max(d.views || 0, d.downloads || 0, d.shares || 0),
      ),
      1,
    );

    const getPoints = (key: string) =>
      timelineData.map((d, i) => ({
        x: (i / (timelineData.length - 1)) * (width - pLeft - pRight) + pLeft,
        y:
          height -
          pBottom -
          ((d[key] || 0) / maxVal) * (height - pTop - pBottom),
        val: d[key] || 0,
        date: d.date,
      }));

    return {
      vP: getPoints('views'),
      dP: getPoints('downloads'),
      sP: getPoints('shares'),
      width,
      height,
      pLeft,
      pRight,
      pTop,
      pBottom,
      maxVal,
    };
  }, [timelineData, isExpanded]);

  const generatePath = (pts: any[]) =>
    `M ${pts.map((p) => `${p.x},${p.y}`).join(' L ')}`;

  const ChartSVG = (full: boolean) => (
    <svg
      viewBox={`0 0 ${config.width} ${config.height}`}
      preserveAspectRatio="none"
      className="w-full h-full overflow-visible"
    >
      {[0, 0.5, 1].map((v) => {
        const yPos =
          config.height -
          config.pBottom -
          v * (config.height - config.pTop - config.pBottom);
        const label = Math.round(v * config.maxVal);
        return (
          <g key={v}>
            <line
              x1={config.pLeft}
              y1={yPos}
              x2={config.width - config.pRight}
              y2={yPos}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4"
            />
            <text
              x={config.pLeft - 12}
              y={yPos + 5}
              textAnchor="end"
              fontSize={full ? '14' : '11'}
              fontWeight="bold"
              className="fill-slate-600"
            >
              {label}
            </text>
          </g>
        );
      })}

      <path
        d={generatePath(config.vP)}
        fill="none"
        stroke="#D4AF37"
        strokeWidth={full ? '4' : '3'}
        strokeLinejoin="round"
      />
      <path
        d={generatePath(config.dP)}
        fill="none"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeDasharray="5"
      />
      <path
        d={generatePath(config.sP)}
        fill="none"
        stroke="#10B981"
        strokeWidth="2"
        strokeDasharray="3"
      />

      {timelineData.map((d, i) => {
        const isH = hoveredIndex === i;
        const p = config.vP[i];
        return (
          <g
            key={i}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <rect
              x={p.x - 15}
              y={0}
              width={30}
              height={config.height}
              fill="transparent"
              className="cursor-crosshair"
            />
            {isH && (
              <g className="pointer-events-none">
                <line
                  x1={p.x}
                  y1={config.pTop}
                  x2={p.x}
                  y2={config.height - config.pBottom}
                  stroke="#D4AF37"
                  strokeWidth="2"
                />
                <rect
                  x={p.x + (i > timelineData.length / 2 ? -110 : 15)}
                  y={config.pTop}
                  width="100"
                  height="70"
                  rx="8"
                  fill="#1A2E35"
                />
                <text
                  x={p.x + (i > timelineData.length / 2 ? -100 : 25)}
                  y={config.pTop + 20}
                  fill="#D4AF37"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Views: {d.views}
                </text>
                <text
                  x={p.x + (i > timelineData.length / 2 ? -100 : 25)}
                  y={config.pTop + 40}
                  fill="#60A5FA"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Downs: {d.downloads}
                </text>
                <text
                  x={p.x + (i > timelineData.length / 2 ? -100 : 25)}
                  y={config.pTop + 60}
                  fill="#34D399"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Shares: {d.shares}
                </text>
              </g>
            )}
            {(full || i % 2 === 0) && (
              <text
                x={p.x}
                y={config.height - 8}
                textAnchor="middle"
                fontSize={full ? '13' : '10'}
                className="fill-slate-700 font-semibold"
              >
                {d.date}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );

  return (
    <>
      <div className="bg-white border-2 border-slate-100 rounded-luxury p-5 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-gold" />
            <h3 className="text-xs font-semibold uppercase text-slate-700 tracking-tighter">
              Fluxo de ENGAJAMENTO
            </h3>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setIsExpanded(true);
            }}
            className="p-1.5 text-slate-400 hover:text-gold transition-colors"
          >
            <Maximize2 size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-5 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-700">
            <Eye size={12} className="text-gold" /> VISUALIZAÇÕES
          </div>
          <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-700">
            <Download size={12} className="text-blue-500" /> DOWNLOADS
          </div>
          <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-700">
            <Share2 size={12} className="text-emerald-500" /> COMPARTILHAMENTOS
          </div>
        </div>

        <div className="h-[140px] w-full">{ChartSVG(false)}</div>
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-6xl rounded-luxury shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex flex-col">
                <h2 className="text-xl font-semibold text-petroleum">
                  Histórico de engajamento dos visitantes da galeria
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  Visualização detalhada por período
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-3 hover:bg-slate-200 rounded-full text-slate-500 transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-12 h-[600px] flex flex-col">
              {/* Legenda na versão expandida */}
              <div className="flex gap-6 mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Eye size={14} className="text-gold" /> VISUALIZAÇÕES
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Download size={14} className="text-blue-500" /> DOWNLOADS
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Share2 size={14} className="text-emerald-500" />{' '}
                  COMPARTILHAMENTOS
                </div>
              </div>
              <div className="flex-1 bg-white border border-slate-100 rounded-xl p-8 shadow-inner">
                {ChartSVG(true)}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
