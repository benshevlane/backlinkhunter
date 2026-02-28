import { requireAuth } from '@/src/lib/auth';
import { getProjectById, listProspectsForProject, getActiveEmailIntegration } from '@/src/lib/store';
import Link from 'next/link';
import { PipelinePage } from '@/components/pipeline/PipelinePage';

export const dynamic = 'force-dynamic';

export default async function ProjectPipelinePage({ params }: { params: { id: string } }) {
  const { userId, orgId } = await requireAuth();
  const [project, prospects, emailIntegration] = await Promise.all([
    getProjectById(params.id, orgId),
    listProspectsForProject(params.id, orgId),
    getActiveEmailIntegration(orgId, userId),
  ]);

  if (!project) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Project not found. <Link className="underline" href="/projects">Return to projects</Link>
      </div>
    );
  }

  return (
    <PipelinePage
      project={project}
      initialProspects={prospects}
      hasEmailIntegration={!!emailIntegration}
    />
  );
}
