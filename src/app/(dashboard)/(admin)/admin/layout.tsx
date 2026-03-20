'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, Home, Settings, Users } from 'lucide-react';

const adminNav = [
  { href: '/admin', label: 'Visão geral', icon: Home },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/assinaturas', label: 'Assinaturas', icon: CreditCard },
  { href: '/admin/sistema', label: 'Sistema', icon: Settings },
];

export default function AdminPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-3 md:px-6 py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 md:gap-6">
          <aside className="bg-white border border-slate-200 rounded-xl shadow-sm h-fit lg:sticky lg:top-20">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[10px] uppercase tracking-wider font-bold text-petroleum/70">
                Painel admin
              </p>
            </div>
            <nav className="p-2 space-y-1">
              {adminNav.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
                      active
                        ? 'bg-petroleum text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <item.icon size={14} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </div>
  );
}
