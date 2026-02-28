'use client';

import { useState } from 'react';
import type { ProjectRecord } from '@/src/lib/types';

interface Listing {
  id: string;
  project_id: string;
  domain: string;
  niche: string;
  looking_for: string;
  offering: string;
}

export function LinkExchangeListings({ projects }: { projects: ProjectRecord[] }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [domain, setDomain] = useState('');
  const [niche, setNiche] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [offering, setOffering] = useState('');
  const [error, setError] = useState<string | null>(null);

  function addListing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !domain || !niche) {
      setError('Project, domain, and niche are required');
      return;
    }
    setError(null);
    setListings((prev) => [
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        domain,
        niche,
        looking_for: lookingFor,
        offering,
      },
      ...prev,
    ]);
    setDomain('');
    setNiche('');
    setLookingFor('');
    setOffering('');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <form onSubmit={addListing} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Create listing</h2>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {projects.length === 0 && <option value="">No projects</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input required placeholder="Domain (e.g. example.com)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={domain} onChange={(e) => setDomain(e.target.value)} />
        <input required placeholder="Niche (e.g. SaaS, Marketing)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={niche} onChange={(e) => setNiche(e.target.value)} />
        <input placeholder="Looking for..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} />
        <input placeholder="Offering..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={offering} onChange={(e) => setOffering(e.target.value)} />
        <button className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" disabled={projects.length === 0}>
          Create listing
        </button>
        <p className="text-xs text-slate-500">Listings will be persisted once the link exchange API is connected to Supabase.</p>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Your listings ({listings.length})</h2>
        <div className="mt-3 space-y-2">
          {listings.length === 0 ? (
            <p className="text-sm text-slate-500">No listings yet. Create one to start finding link exchange partners.</p>
          ) : (
            listings.map((listing) => (
              <div key={listing.id} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900">{listing.domain}</p>
                <p className="text-xs text-slate-600">Niche: {listing.niche}</p>
                {listing.looking_for && <p className="text-xs text-slate-500">Looking for: {listing.looking_for}</p>}
                {listing.offering && <p className="text-xs text-slate-500">Offering: {listing.offering}</p>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
