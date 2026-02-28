import Link from 'next/link';
import { CreateProspectForm } from '@/components/prospects/CreateProspectForm';
import { ProspectsBoard } from '@/components/prospects/ProspectsBoard';
import { getProjectById, listProspectsForProject } from '@/src/lib/store';
import { requireAuth } from '@/src/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ProjectProspectsPage({ params }: { params: { id: string } }) {
  const { orgId } = await requireAuth();
  const [project, prospects] = await Promise.all([
    getProjectById(params.id, orgId),
    listProspectsForProject(params.id, orgId),
  ]);

  if (!project) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Project not found. <Link className="underline" href="/projects">Return to projects</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{project.name} · Prospects</h1>
        <p className="text-sm text-slate-600">Track opportunities through the outreach pipeline. Enrich contacts and generate drafts directly from cards.</p>
      </header>

      <CreateProspectForm projectId={project.id} />
      <ProspectsBoard prospects={prospects} />
    </div>
  );
}
