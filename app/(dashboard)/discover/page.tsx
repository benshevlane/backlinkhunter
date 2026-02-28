import { DiscoveryForm } from '@/components/discover/DiscoveryForm';
import { listProjects } from '@/src/lib/store';
import { requireAuth } from '@/src/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  const { orgId } = await requireAuth();
  const projects = await listProjects(orgId);
  const defaultProjectId = projects[0]?.id;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Discover Opportunities</h1>
        <p className="text-sm text-slate-600">Generate backlink opportunities from seed keywords and opportunity types.</p>
      </header>
      <DiscoveryForm projectId={defaultProjectId} />
    </div>
  );
}
