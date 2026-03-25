'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { ChevronRight, ArrowUpDown, ChevronLeft } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  icon?: React.ElementType;
  width?: string;
  align?: 'left' | 'right' | 'center';
  sortKey?: string;
}

interface RelatorioTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  onSort?: (key: string) => void;
  emptyMessage?: string;
  itemsPerPage?: number;
}

export function RelatorioTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  onSort,
  emptyMessage = 'Nenhum registro encontrado.',
  itemsPerPage = 10,
}: RelatorioTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset da página caso os dados mudem (filtro externo)
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Fatiamento dos dados para exibição
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [data, currentPage, itemsPerPage]);

  const tableRows = useMemo(() => {
    if (paginatedData.length === 0) {
      return (
        <tr>
          <td
            colSpan={columns.length + (onRowClick ? 1 : 0)}
            className="px-6 py-12 text-center text-[11px] text-slate-400 font-medium"
          >
            {emptyMessage}
          </td>
        </tr>
      );
    }

    return paginatedData.map((item) => (
      <tr
        key={item.id}
        onClick={() => onRowClick?.(item)}
        className={`group transition-all duration-150 odd:bg-white even:bg-slate-100 ${
          onRowClick ? 'cursor-pointer hover:bg-blue-50/50' : ''
        }`}
      >
        {columns.map((col, idx) => (
          <td
            key={idx}
            className={`px-4 py-3 border-b border-slate-100 text-[12px] text-slate-600 font-medium antialiased ${col.width || ''} ${
              col.align === 'right'
                ? 'text-right'
                : col.align === 'center'
                  ? 'text-center'
                  : ''
            }`}
          >
            {typeof col.accessor === 'function'
              ? col.accessor(item)
              : (item[col.accessor] as React.ReactNode)}
          </td>
        ))}
        {onRowClick && (
          <td className="px-4 py-3 border-b border-slate-100 w-12 text-right">
            <ChevronRight
              size={16}
              className="text-slate-300 group-hover:text-gold transition-colors ml-auto"
            />
          </td>
        )}
      </tr>
    ));
  }, [paginatedData, columns, onRowClick, emptyMessage]);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-luxury overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-auto min-w-[820px]">
          <thead>
            <tr className="bg-petroleum text-[9px] uppercase tracking-[0.12em] text-white font-semibold">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3.5 leading-tight whitespace-normal break-words align-middle border-r border-white/10 last:border-r-0 ${col.width || ''} ${
                    onSort && col.sortKey
                      ? 'cursor-pointer hover:bg-petroleum-light'
                      : ''
                  }`}
                  onClick={() => col.sortKey && onSort?.(col.sortKey)}
                >
                  <div
                    className={`flex items-center gap-2 ${col.align === 'right' ? 'justify-end' : ''}`}
                  >
                    {col.icon && <col.icon size={13} />}
                    {col.header}
                    {col.sortKey && (
                      <ArrowUpDown size={11} className="opacity-50" />
                    )}
                  </div>
                </th>
              ))}
              {onRowClick && <th className="w-12 border-r-0"></th>}
            </tr>
          </thead>
          <tbody className="bg-white min-h-[400px]">{tableRows}</tbody>
        </table>
      </div>

      {/* Footer com Paginação Compacta */}
      {totalPages > 1 && (
        <div className="px-6 py-3.5 bg-slate-50 border-t flex items-center justify-between gap-4">
          <span className="text-[10px] font-semibold text-slate-800 uppercase tracking-widest">
            Total: {data.length} registros
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                Página
              </span>
              <select
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="px-2 py-1 text-[11px] font-semibold text-petroleum bg-white border border-slate-200 rounded-lg outline-none cursor-pointer hover:border-slate-300 focus:border-gold transition-colors"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <option key={page} value={page}>
                      {page}
                    </option>
                  ),
                )}
              </select>
              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                de {totalPages}
              </span>
            </div>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
