'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DiscoverOpportunity } from '@/src/lib/types';

const allTypes = [
  { id: 'guest_post', label: 'Guest Post' },
  { id: 'resource_link', label: 'Resource Link' },
  { id: 'broken_link', label: 'Broken Link' },
  { id: 'link_exchange', label: 'Link Exchange' },
] as const;

export function DiscoveryForm({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [currentProjectId, setCurrentProjectId] = useState(projectId ?? '');
  const [keywords, setKeywords] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['guest_post', 'resource_link']);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DiscoverOpportunity[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [jobId, setJobId] = useState<string | null>(null);

  function toggleType(id: string) {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function toggleSelect(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.prospect_url)));
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setResults([]);
    setSelected(new Set());

    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: currentProjectId,
          seed_url: competitorUrl || undefined,
          seed_keywords: keywords
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          opportunity_types: selectedTypes.length > 0 ? selectedTypes : ['guest_post'],
          filters: {},
          limit: 50,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Discovery failed');
      }

      const payload = (await response.json()) as { job_id: string; opportunities: DiscoverOpportunity[] };
      setJobId(payload.job_id);
      setResults(payload.opportunities);
      setSelected(new Set(payload.opportunities.map((r) => r.prospect_url)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (selected.size === 0 || !jobId) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/discover/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          selected_urls: Array.from(selected),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Failed to save prospects');
      }

      const data = (await response.json()) as { prospects_created: number; project_id: string };
      router.push(`/projects/${data.project_id}/prospects`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Run discovery</h2>
        {error && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="mt-3 grid gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Project ID</label>
            <input
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={currentProjectId}
              onChange={(event) => setCurrentProjectId(event.target.value)}
              placeholder="Project ID"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Competitor URL (optional)</label>
            <input
              type="url"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={competitorUrl}
              onChange={(event) => setCompetitorUrl(event.target.value)}
              placeholder="https://competitor.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Keywords (comma-separated)</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="handmade kitchens, bespoke kitchen design"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Opportunity types</label>
            <div className="flex flex-wrap gap-2">
              {allTypes.map((type) => (
                <label key={type.id} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type.id)}
                    onChange={() => toggleType(type.id)}
                    className="rounded border-slate-300"
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>
          <button disabled={loading} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {loading ? 'Discovering...' : 'Discover opportunities'}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Results ({results.length}) — {selected.size} selected
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleAll}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                {selected.size === results.length ? 'Deselect all' : 'Select all'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving || selected.size === 0}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : `Import ${selected.size} prospect${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-2 pr-2 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === results.length}
                      onChange={toggleAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="pb-2 pr-4">Domain</th>
                  <th className="pb-2 pr-4">Page Title</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4 text-right">Linkability</th>
                  <th className="pb-2 text-right">Relevance</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr
                    key={item.prospect_url}
                    className={`border-t border-slate-100 cursor-pointer ${selected.has(item.prospect_url) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    onClick={() => toggleSelect(item.prospect_url)}
                  >
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.prospect_url)}
                        onChange={() => toggleSelect(item.prospect_url)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="py-2 pr-4 text-slate-800 font-medium">
                      <a
                        href={item.prospect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.prospect_domain}
                      </a>
                    </td>
                    <td className="py-2 pr-4 text-slate-600 max-w-xs truncate">{item.page_title}</td>
                    <td className="py-2 pr-4 text-slate-600">{item.opportunity_type.replaceAll('_', ' ')}</td>
                    <td className="py-2 pr-4 text-right">
                      <ScoreBadge score={item.linkability_score} />
                    </td>
                    <td className="py-2 text-right">
                      <ScoreBadge score={item.relevance_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-emerald-100 text-emerald-800' :
    score >= 40 ? 'bg-amber-100 text-amber-800' :
    'bg-red-100 text-red-800';

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {score}
    </span>
  );
}
