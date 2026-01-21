'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      {/* Mobile: Horizontal */}
      <ol className="flex flex-wrap items-center gap-1 text-[11px] lg:hidden">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center text-slate-400 hover:text-gold transition-colors"
            aria-label="Dashboard"
          >
            <Home size={13} />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-1">
              <ChevronRight size={11} className="text-slate-300" />
              {isLast ? (
                <span className="text-slate-900 font-semibold">{item.label}</span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="text-slate-500 hover:text-gold transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-500">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Desktop: Vertical Sidebar */}
      <ol className="hidden lg:flex lg:flex-col lg:gap-1 text-xs">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-gold hover:bg-slate-50 rounded-md transition-colors"
            aria-label="Dashboard"
          >
            <Home size={16} />
            <span>Dashboard</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index}>
              {isLast ? (
                <span className="flex items-center gap-2 px-3 py-2 text-slate-900 font-semibold bg-champagne/20 rounded-md border-l-2 border-gold">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-gold hover:bg-slate-50 rounded-md transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="flex items-center gap-2 px-3 py-2 text-slate-500">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
