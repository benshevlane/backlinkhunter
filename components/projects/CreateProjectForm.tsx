'use client';

import { useState } from 'react';

export function CreateProjectForm() {
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, target_url: targetUrl }),
    });

    setSubmitting(false);
    if (response.ok) {
      setName('');
      setTargetUrl('');
      window.location.reload();
      return;
    }

    alert('Failed to create project');
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-700">Create project</h2>
      <input
        required
        placeholder="Project name"
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <input
        required
        type="url"
        placeholder="https://example.com"
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={targetUrl}
        onChange={(event) => setTargetUrl(event.target.value)}
      />
      <button disabled={submitting} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
        {submitting ? 'Creating...' : 'Create project'}
      </button>
    </form>
  );
}
