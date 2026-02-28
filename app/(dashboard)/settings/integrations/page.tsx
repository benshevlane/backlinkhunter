import { requireAuth } from '@/src/lib/auth';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { GmailConnectButton } from '@/components/pipeline/GmailConnectButton';

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const { orgId } = await requireAuth();
  const supabase = createServerSupabase();
  const { data: integrations } = await supabase
    .from('email_integrations')
    .select('id, provider, email_address, is_active, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  const successMsg = searchParams.success === 'gmail_connected'
    ? 'Gmail connected successfully!'
    : null;

  const errorMessages: Record<string, string> = {
    oauth_denied: 'OAuth permission was denied.',
    missing_params: 'Missing OAuth parameters.',
    invalid_state: 'Invalid OAuth state.',
    no_email: 'Could not retrieve email address from Google.',
    token_exchange: 'Failed to exchange OAuth token.',
  };
  const errorMsg = searchParams.error
    ? errorMessages[searchParams.error] ?? 'Connection failed.'
    : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-600">Connect your email accounts for sending outreach.</p>
      </header>

      {successMsg && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Connected accounts ({integrations?.length ?? 0})</h2>
        {(!integrations || integrations.length === 0) ? (
          <p className="mt-3 text-sm text-slate-500">No email accounts connected yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {integrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{integration.email_address}</p>
                  <p className="text-xs text-slate-500 capitalize">{integration.provider}</p>
                </div>
                <span className={`rounded px-2 py-1 text-xs ${integration.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {integration.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Gmail</p>
          <p className="mt-1 text-xs text-slate-500">Connect via Google OAuth to send and receive outreach through Gmail.</p>
          <GmailConnectButton />
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Outlook</p>
          <p className="mt-1 text-xs text-slate-500">Connect via Microsoft OAuth to send and receive outreach through Outlook.</p>
          <button disabled className="mt-3 rounded-md bg-slate-200 px-3 py-2 text-sm text-slate-500">
            Connect Outlook (coming soon)
          </button>
        </div>
      </section>
    </div>
  );
}
