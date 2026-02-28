import { requireAuth } from '@/src/lib/auth';
import { createServerSupabase } from '@/src/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const { orgId } = await requireAuth();
  const supabase = createServerSupabase();
  const { data: members } = await supabase
    .from('organisation_members')
    .select('id, role, created_at, user_id, users(email, full_name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Team</h1>
        <p className="text-sm text-slate-600">Manage organisation members and their roles.</p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Members ({members?.length ?? 0})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((member) => {
                const user = member.users as unknown as { email: string; full_name: string | null } | null;
                return (
                  <tr key={member.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4 text-slate-800">{user?.full_name ?? 'Unknown'}</td>
                    <td className="py-2 pr-4 text-slate-600">{user?.email ?? '-'}</td>
                    <td className="py-2 pr-4">
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs capitalize text-slate-700">{member.role}</span>
                    </td>
                    <td className="py-2 text-slate-500">{new Date(member.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Team invitations will be available once the invite flow is connected to Supabase Auth.</p>
      </section>
    </div>
  );
}
