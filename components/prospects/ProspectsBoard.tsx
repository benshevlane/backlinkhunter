'use client';

import { useState } from 'react';
import type { ProspectRecord, ProspectStatus } from '@/src/lib/types';

const columns: { key: ProspectStatus; label: string }[] = [
  { key: 'identified', label: 'Identified' },
  { key: 'outreach_queued', label: 'Outreach Queued' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'followed_up', label: 'Followed Up' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

export function ProspectsBoard({ prospects }: { prospects: ProspectRecord[] }) {
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function moveStatus(id: string, status: ProspectStatus) {
    const response = await fetch(`/api/prospects/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      window.location.reload();
      return;
    }

    alert('Could not update prospect status');
  }

  async function enrichProspect(id: string) {
    setWorkingId(id);
    const response = await fetch('/api/prospects/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect_id: id }),
    });
    setWorkingId(null);

    if (!response.ok) {
      alert('Contact enrichment failed');
      return;
    }

    window.location.reload();
  }

  async function generateDraft(id: string) {
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
      alert('Draft generation failed');
      return;
    }

    const payload = (await response.json()) as { subject: string };
    alert(`Draft generated: ${payload.subject}`);
    window.location.reload();
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {columns.map((column) => {
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
                    {columns.map((statusColumn) => (
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
  );
}
