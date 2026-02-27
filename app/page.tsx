import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold tracking-tight">Backlink Hunter</h1>
      <p className="mt-3 text-slate-600">Core app scaffold is now in place. Use the dashboard route group to continue implementation.</p>
      <div className="mt-6 flex gap-3">
        <Link className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white" href="/login">
          Login
        </Link>
        <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/projects">
          Open Dashboard
        </Link>
      </div>
    </main>
  );
}
