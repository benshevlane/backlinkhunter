import Link from 'next/link';
import { getProjectById, listProspectsForProject, listOutreachEmailsForProject } from '@/src/lib/store';
import { requireAuth } from '@/src/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ProjectOverviewPage({ params }: { params: { id: string } }) {
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

  const won = prospects.filter((p) => p.status === 'won').length;
  const contacted = prospects.filter((p) =>
    ['contacted', 'followed_up', 'won', 'lost'].includes(p.status),
  ).length;

  const stats = [
    { label: 'Prospects', value: prospects.length },
    { label: 'Contacted', value: contacted },
    { label: 'Won', value: won },
    { label: 'Drafts', value: emails.length },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
        <p className="text-sm text-slate-600">{project.target_url}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href={`/projects/${project.id}/prospects`} className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <p className="text-sm font-medium text-slate-900">Prospects pipeline</p>
          <p className="mt-1 text-xs text-slate-600">Manage and move prospects through statuses</p>
        </Link>
        <Link href={`/projects/${project.id}/outreach`} className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <p className="text-sm font-medium text-slate-900">Outreach workspace</p>
          <p className="mt-1 text-xs text-slate-600">Generate and review email drafts</p>
        </Link>
        <Link href={`/projects/${project.id}/settings`} className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <p className="text-sm font-medium text-slate-900">Project settings</p>
          <p className="mt-1 text-xs text-slate-600">Keywords, niche, and automations</p>
        </Link>
      </div>
    </div>
  );
}
