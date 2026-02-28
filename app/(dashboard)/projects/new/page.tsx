import { ProjectWizard } from '@/components/projects/ProjectWizard';

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">New Project</h1>
        <p className="text-sm text-slate-600">
          Analyse your site and set up a new backlink campaign.
        </p>
      </header>

      <ProjectWizard />
    </div>
  );
}
