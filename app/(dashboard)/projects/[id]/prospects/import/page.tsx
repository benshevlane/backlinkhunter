import { BulkImportForm } from '@/components/prospects/BulkImportForm';

export default async function ProspectImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Import Prospects</h1>
        <p className="text-sm text-slate-600">
          Upload a CSV or paste URLs to validate and import prospects into your pipeline.
        </p>
      </header>
      <BulkImportForm projectId={id} />
    </div>
  );
}
