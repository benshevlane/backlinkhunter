'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ProspectRecord, ProspectStatus } from '@/src/lib/types';

const columns: { key: ProspectStatus; label: string }[] = [
  { key: 'identified', label: 'Identified' },
  { key: 'outreach_queued', label: 'Outreach Queued' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'followed_up', label: 'Followed Up' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'not_relevant', label: 'Not Relevant' },
  { key: 'needs_manual_enrichment', label: 'Needs Enrichment' },
  { key: 'verification_error', label: 'Verification Error' },
];

const allStatuses = columns;

export function ProspectsBoard({ prospects }: { prospects: ProspectRecord[] }) {
  const router = useRouter();
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function moveStatus(id: string, status: ProspectStatus) {
    setError(null);
    const response = await fetch(`/api/prospects/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      router.refresh();
      return;
    }

    setError('Could not update prospect status');
  }

  async function enrichProspect(id: string) {
    setError(null);
    setWorkingId(id);
    const response = await fetch('/api/prospects/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect_id: id }),
    });
    setWorkingId(null);

    if (!response.ok) {
      setError('Contact enrichment failed');
      return;
    }

    router.refresh();
  }

  async function generateDraft(id: string) {
    setError(null);
    setWorkingId(id);
    const response = await fetch('/api/outreach/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect_id: id,
        tone: 'professional',
        is_followup: false,
      }),
    });
    setWorkingId(null);

    if (!response.ok) {
      setError('Draft generation failed');
      return;
    }

    router.refresh();
  }

  // Only show columns that have prospects, plus the first 6 always
  const mainColumns = columns.slice(0, 6);
  const extraColumns = columns.slice(6).filter((col) =>
    prospects.some((p) => p.status === col.key),
  );
  const visibleColumns = [...mainColumns, ...extraColumns];

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {visibleColumns.map((column) => {
          const items = prospects.filter((item) => item.status === column.key);
          return (
            <section key={column.key} className="rounded-lg border border-slate-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-slate-800">{column.label}</h3>
              <p className="text-xs text-slate-500">{items.length} prospects</p>
              <div className="mt-3 space-y-2">
                {items.map((item) => (
                  <article key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-2">
                    <p className="text-xs font-medium text-slate-900">{item.prospect_domain}</p>
                    <p className="text-xs text-slate-600 truncate">{item.prospect_url}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Contact: {item.contact_email ?? 'not enriched'}
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <button
                        disabled={workingId === item.id}
                        onClick={() => enrichProspect(item.id)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] disabled:opacity-60"
                      >
                        Enrich
                      </button>
                      <button
                        disabled={workingId === item.id}
                        onClick={() => generateDraft(item.id)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] disabled:opacity-60"
                      >
                        Draft
                      </button>
                    </div>

                    <select
                      className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={item.status}
                      onChange={(event) => moveStatus(item.id, event.target.value as ProspectStatus)}
                    >
                      {allStatuses.map((statusColumn) => (
                        <option key={statusColumn.key} value={statusColumn.key}>
                          {statusColumn.label}
                        </option>
                      ))}
                    </select>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
