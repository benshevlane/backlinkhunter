'use client';

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
