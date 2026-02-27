import { requireAuth } from '@/src/lib/auth';
import { createServerSupabase } from '@/src/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const { orgId } = await requireAuth();
  const supabase = createServerSupabase();
  const { data: org } = await supabase
    .from('organisations')
    .select('name, plan, stripe_customer_id, stripe_subscription_id, monthly_prospect_limit, prospects_used_this_month')
    .eq('id', orgId)
    .single();

  const plans = [
    { name: 'Starter', limit: 200, price: 'Free' },
    { name: 'Growth', limit: 1000, price: '$49/mo' },
    { name: 'Agency', limit: 5000, price: '$149/mo' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-600">Manage your subscription and view usage.</p>
      </header>

      {org && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Current plan</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p><span className="text-slate-500">Plan:</span> <span className="text-slate-900 font-medium capitalize">{org.plan}</span></p>
            <p><span className="text-slate-500">Usage:</span> <span className="text-slate-900">{org.prospects_used_this_month} / {org.monthly_prospect_limit} prospects this month</span></p>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-slate-900"
                style={{ width: `${Math.min(100, (org.prospects_used_this_month / org.monthly_prospect_limit) * 100)}%` }}
              />
            </div>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Available plans</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-md border p-4 ${org?.plan === plan.name.toLowerCase() ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
              <p className="text-sm font-medium text-slate-900">{plan.name}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{plan.price}</p>
              <p className="mt-1 text-xs text-slate-600">{plan.limit.toLocaleString()} prospects/month</p>
              {org?.plan === plan.name.toLowerCase() && (
                <p className="mt-2 text-xs font-medium text-slate-700">Current plan</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Plan upgrades will be handled through Stripe Checkout once the webhook integration is connected.</p>
      </section>
    </div>
  );
}
