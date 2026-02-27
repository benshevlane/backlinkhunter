import { requireAuth } from '@/src/lib/auth';
import { listProjects } from '@/src/lib/store';
import { LinkExchangeListings } from '@/components/link-exchange/LinkExchangeListings';

export const dynamic = 'force-dynamic';

export default async function LinkExchangePage() {
  const { orgId } = await requireAuth();
  const projects = await listProjects(orgId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Link Exchange</h1>
        <p className="text-sm text-slate-600">List your sites and find reciprocal link-building partners.</p>
      </header>

      <LinkExchangeListings projects={projects} />
    </div>
  );
}
