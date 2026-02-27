'use client';

import { useState } from 'react';
import type { DiscoverResponse } from '@/src/lib/types';

const allTypes = [
  { id: 'guest_post', label: 'Guest Post' },
  { id: 'resource_link', label: 'Resource Link' },
  { id: 'broken_link', label: 'Broken Link' },
  { id: 'link_exchange', label: 'Link Exchange' },
] as const;

export function DiscoveryForm() {
  const [projectId, setProjectId] = useState('local-project');
  const [keywords, setKeywords] = useState('saas backlinks, seo outreach');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoverResponse['opportunities']>([]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        seed_keywords: keywords
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        opportunity_types: allTypes.map((item) => item.id),
        filters: {},
        limit: 20,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      alert('Discovery failed');
      return;
    }

    const payload = (await response.json()) as DiscoverResponse;
    setResults(payload.opportunities);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Run discovery</h2>
        <div className="mt-3 grid gap-2">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="Project ID"
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="keyword a, keyword b"
          />
          <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">{loading ? 'Discovering...' : 'Discover opportunities'}</button>
        </div>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700">Results ({results.length})</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="pb-2 pr-4">Domain</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Linkability</th>
                <th className="pb-2">Relevance</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item) => (
                <tr key={item.page_url} className="border-t border-slate-100">
                  <td className="py-2 pr-4 text-slate-800">{item.prospect_domain}</td>
                  <td className="py-2 pr-4 text-slate-600">{item.opportunity_type}</td>
                  <td className="py-2 pr-4 text-slate-600">{item.linkability_score}</td>
                  <td className="py-2 text-slate-600">{item.relevance_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
