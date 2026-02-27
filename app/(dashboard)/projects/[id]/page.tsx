import Link from 'next/link';

export default function ProjectOverviewPage({ params }: { params: { id: string } }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Project overview</h1>
      <p className="mt-2 text-sm text-slate-600">The detailed KPI dashboard is pending. Use prospects board for active workflow.</p>
      <Link href={`/projects/${params.id}/prospects`} className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        Open prospects pipeline
      </Link>
    </section>
  );
}
