import Link from 'next/link';

const navItems = [
  { href: '/projects', label: 'Projects' },
  { href: '/discover', label: 'Discover' },
  { href: '/link-exchange', label: 'Link Exchange' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr]">
      <aside className="border-r border-slate-200 bg-white p-4">
        <p className="mb-4 text-sm font-semibold text-slate-500">Backlink Hunter</p>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
