'use client';

import React, { useMemo } from 'react';
import { ChevronRight, ArrowUpDown } from 'lucide-react';

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
}

export function RelatorioTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  onSort,
  emptyMessage = 'Nenhum registro encontrado.',
}: RelatorioTableProps<T>) {
  const tableRows = useMemo(() => {
    if (data.length === 0) {
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

    return data.map((item) => (
      <tr
        key={item.id}
        onClick={() => onRowClick?.(item)}
        className={`group transition-all duration-200 ${
          onRowClick ? 'cursor-pointer hover:bg-slate-50/50' : ''
        }`}
      >
        {columns.map((col, idx) => (
          <td
            key={idx}
            className={`px-6 py-4 border-b border-slate-50 ${col.width || ''} ${
              col.align === 'right' ? 'text-right' : ''
            }`}
          >
            {typeof col.accessor === 'function'
              ? col.accessor(item)
              : (item[col.accessor] as React.ReactNode)}
          </td>
        ))}
        {onRowClick && (
          <td className="px-6 py-4 border-b border-slate-50 w-12 text-right">
            <ChevronRight
              size={14}
              className="text-slate-200 group-hover:text-champagne transition-colors ml-auto"
            />
          </td>
        )}
      </tr>
    ));
  }, [data, columns, onRowClick, emptyMessage]);

  return (
    <div className="w-full bg-white border border-slate-100 rounded-luxury overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
          <thead>
            {/* CABEÇALHO TEMA PETRÓLEO + GOLD/CHAMPAGNE */}
            <tr className="bg-petroleum/90 text-[9px] uppercase tracking-[0.2em] text-white font-medium border-b border-petroleum-light/10">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-4 ${col.width || ''} ${
                    onSort && col.sortKey
                      ? 'cursor-pointer hover:text-white transition-colors'
                      : ''
                  }`}
                  onClick={() => col.sortKey && onSort?.(col.sortKey)}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      col.align === 'right' ? 'justify-end' : ''
                    }`}
                  >
                    {col.icon && <col.icon size={14} className="text-white" />}
                    {col.header}
                    {col.sortKey && (
                      <ArrowUpDown size={10} className="text-white" />
                    )}
                  </div>
                </th>
              ))}
              {onRowClick && (
                <th className="w-12 border-b border-petroleum-light/10"></th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white">{tableRows}</tbody>
        </table>
      </div>
    </div>
  );
}
