import Link from 'next/link';
import { OutreachWorkspace } from '@/components/outreach/OutreachWorkspace';
import { listOutreachEmailsForProject, listProjects, listProspectsForProject } from '@/src/lib/store';

export default async function ProjectOutreachPage({ params }: { params: { id: string } }) {
  const [projects, prospects, emails] = await Promise.all([
    listProjects(),
    listProspectsForProject(params.id),
    listOutreachEmailsForProject(params.id),
  ]);

  const project = projects.find((item) => item.id === params.id);

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
