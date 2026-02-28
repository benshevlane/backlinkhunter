import Link from 'next/link';
import { OutreachWorkspace } from '@/components/outreach/OutreachWorkspace';
import { listOutreachEmailsForProject, getProjectById, listProspectsForProject } from '@/src/lib/store';
import { requireAuth } from '@/src/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ProjectOutreachPage({ params }: { params: { id: string } }) {
  const { orgId } = await requireAuth();
  const [project, prospects, emails] = await Promise.all([
    getProjectById(params.id, orgId),
    listProspectsForProject(params.id, orgId),
    listOutreachEmailsForProject(params.id, orgId),
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
        <h1 className="text-2xl font-semibold text-slate-900">{project.name} · Outreach</h1>
        <p className="text-sm text-slate-600">Generate and review draft outreach emails for project prospects.</p>
      </header>

      <OutreachWorkspace prospects={prospects} initialEmails={emails} />
    </div>
  );
}
