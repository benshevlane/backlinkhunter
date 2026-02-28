'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase/client';

const navItems = [
  { href: '/projects', label: 'Projects' },
  { href: '/discover', label: 'Discover' },
  { href: '/link-exchange', label: 'Link Exchange' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr]">
      <aside className="flex flex-col border-r border-slate-200 bg-white p-4">
        <p className="mb-4 text-sm font-semibold text-slate-500">Backlink Hunter</p>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-slate-900 font-medium text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleSignOut}
          className="mt-auto rounded-md px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          Sign out
        </button>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
