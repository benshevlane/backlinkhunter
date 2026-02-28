import { ReportsOverview } from '@/components/reports/ReportsOverview';
import { listExistingBacklinksForProject, listOutreachEmailsForProject, listProjects, listProspects } from '@/src/lib/store';
import { requireAuth } from '@/src/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const { orgId } = await requireAuth();
  const projects = await listProjects(orgId);
  const prospects = await listProspects(orgId);

  const [allEmails, allBacklinks] = await Promise.all([
    Promise.all(projects.map((project) => listOutreachEmailsForProject(project.id, orgId))).then((r) => r.flat()),
    Promise.all(projects.map((project) => listExistingBacklinksForProject(project.id, orgId))).then((r) => r.flat()),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-600">Track outreach pipeline performance and conversion outcomes.</p>
      </header>

      <ReportsOverview prospects={prospects} emails={allEmails} backlinks={allBacklinks} />
    </div>
  );
}
