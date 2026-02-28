import Link from 'next/link';
import { requireAuth } from '@/src/lib/auth';
import { createServerSupabase } from '@/src/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { orgId } = await requireAuth();
  const supabase = createServerSupabase();
  const { data: org } = await supabase
    .from('organisations')
    .select('*')
    .eq('id', orgId)
    .single();

  const settingsLinks = [
    { href: '/settings/team', label: 'Team', description: 'Manage members and roles' },
    { href: '/settings/billing', label: 'Billing', description: 'Subscription and payment details' },
    { href: '/settings/integrations', label: 'Integrations', description: 'Email provider connections' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600">Manage your organisation and account settings.</p>
      </header>

      {org && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Organisation</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p><span className="text-slate-500">Name:</span> <span className="text-slate-900">{org.name}</span></p>
            <p><span className="text-slate-500">Plan:</span> <span className="text-slate-900 capitalize">{org.plan}</span></p>
            <p><span className="text-slate-500">Prospects used this month:</span> <span className="text-slate-900">{org.prospects_used_this_month} / {org.monthly_prospect_limit}</span></p>
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {settingsLinks.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <p className="text-sm font-medium text-slate-900">{item.label}</p>
            <p className="mt-1 text-xs text-slate-600">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
