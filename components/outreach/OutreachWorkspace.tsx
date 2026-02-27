'use client';

import { useState } from 'react';
import type { OutreachEmailRecord, ProspectRecord } from '@/src/lib/types';

type Tone = 'professional' | 'friendly' | 'concise';

export function OutreachWorkspace({
  prospects,
  initialEmails,
}: {
  prospects: ProspectRecord[];
  initialEmails: OutreachEmailRecord[];
}) {
  const [selectedProspect, setSelectedProspect] = useState(prospects[0]?.id ?? '');
  const [tone, setTone] = useState<Tone>('professional');
  const [customValue, setCustomValue] = useState('');
  const [emails, setEmails] = useState(initialEmails);
  const [busy, setBusy] = useState(false);

  async function generateDraft() {
    if (!selectedProspect) {
      alert('Select a prospect first');
      return;
    }

    setBusy(true);
    const response = await fetch('/api/outreach/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect_id: selectedProspect,
        tone,
        custom_value_prop: customValue || undefined,
        is_followup: false,
      }),
    });
    setBusy(false);

    if (!response.ok) {
      alert('Failed to generate draft');
      return;
    }

    const created = (await response.json()) as {
      email_id: string;
      subject: string;
      body_html: string;
      body_text: string;
    };

    const prospect = prospects.find((item) => item.id === selectedProspect);
    if (!prospect) return;

    setEmails((prev) => [
      {
        id: created.email_id,
        project_id: prospect.project_id,
        org_id: prospect.org_id,
        prospect_id: prospect.id,
        subject: created.subject,
        body_html: created.body_html,
        body_text: created.body_text,
        ai_generated: true,
        edited_by_user: false,
        status: 'draft',
        is_followup: false,
        followup_number: 0,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

    setCustomValue('');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Generate outreach draft</h2>
        <div className="mt-3 space-y-3">
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={selectedProspect}
            onChange={(event) => setSelectedProspect(event.target.value)}
          >
            {prospects.length === 0 ? <option value="">No prospects</option> : null}
            {prospects.map((prospect) => (
              <option key={prospect.id} value={prospect.id}>
                {prospect.prospect_domain} ({prospect.status})
              </option>
            ))}
          </select>

          <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={tone} onChange={(event) => setTone(event.target.value as Tone)}>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="concise">Concise</option>
          </select>

          <textarea
            className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Optional custom value proposition"
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
          />

          <button disabled={busy || prospects.length === 0} onClick={generateDraft} className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {busy ? 'Generating...' : 'Generate draft'}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Draft queue ({emails.length})</h2>
        <div className="mt-3 space-y-3">
          {emails.length === 0 ? (
            <p className="text-sm text-slate-500">No drafts yet.</p>
          ) : (
            emails.map((email) => (
              <article key={email.id} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900">{email.subject}</p>
                <p className="mt-1 line-clamp-3 text-xs text-slate-600 whitespace-pre-wrap">{email.body_text}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="rounded bg-slate-100 px-2 py-1">{email.status}</span>
                  <span>{new Date(email.created_at).toLocaleString()}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
