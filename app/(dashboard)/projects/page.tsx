import Link from 'next/link';
import { CreateProjectForm } from '@/components/projects/CreateProjectForm';
import { listProjects } from '@/src/lib/store';
import { requireAuth } from '@/src/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const { orgId } = await requireAuth();
  const projects = await listProjects(orgId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
        <p className="text-sm text-slate-600">Create and manage backlink campaigns for each client/site.</p>
      </header>

      <CreateProjectForm />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">All projects</h2>
        <div className="mt-3 space-y-2">
          {projects.length === 0 ? (
            <p className="text-sm text-slate-500">No projects yet.</p>
          ) : (
            projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}/prospects`}
                className="block rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
              >
                <p className="text-sm font-medium text-slate-900">{project.name}</p>
                <p className="text-xs text-slate-600">{project.target_url}</p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
