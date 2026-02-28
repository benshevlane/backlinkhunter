'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CreateProspectForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`/api/projects/${projectId}/prospects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect_url: url, contact_email: email || undefined }),
    });

    if (response.ok) {
      setUrl('');
      setEmail('');
      router.refresh();
      return;
    }

    const data = await response.json().catch(() => null);
    setError(data?.error ?? 'Failed to add prospect');
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-700">Add prospect</h2>
      {error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <input
          required
          type="url"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          placeholder="https://prospect-site.com"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <input
          type="email"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="contact@prospect.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <button className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">Save prospect</button>
    </form>
  );
}
