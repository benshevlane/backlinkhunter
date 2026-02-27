import { ReportsOverview } from '@/components/reports/ReportsOverview';
import { listOutreachEmailsForProject, listProjects, listProspects } from '@/src/lib/store';

export default async function ReportsPage() {
  const projects = await listProjects();
  const prospects = await listProspects();
  const allEmails = (
    await Promise.all(projects.map((project) => listOutreachEmailsForProject(project.id)))
  ).flat();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-600">Track outreach pipeline performance and conversion outcomes.</p>
      </header>

      <ReportsOverview prospects={prospects} emails={allEmails} />
    </div>
  );
}
