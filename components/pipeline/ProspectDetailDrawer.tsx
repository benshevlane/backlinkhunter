'use client';

import { useState, useEffect } from 'react';
import type { ProspectRecord, OutreachEmailRecord, ProspectStatus } from '@/src/lib/types';

interface Props {
  prospect: ProspectRecord | null;
  onClose: () => void;
  hasEmailIntegration: boolean;
}

type Tab = 'overview' | 'outreach' | 'link';

const STATUS_OPTIONS: { key: ProspectStatus; label: string }[] = [
  { key: 'identified', label: 'Identified' },
  { key: 'enriched', label: 'Enriched' },
  { key: 'outreach_drafted', label: 'Draft Ready' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'followed_up', label: 'Followed Up' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'not_relevant', label: 'Not Relevant' },
];

export function ProspectDetailDrawer({ prospect, onClose, hasEmailIntegration }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [emails, setEmails] = useState<OutreachEmailRecord[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sendConfirm, setSendConfirm] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  // Reset state when prospect changes
  useEffect(() => {
    if (prospect) {
      setEditNotes(prospect.notes ?? '');
      setActiveTab(prospect.status === 'won' ? 'link' : 'overview');
      loadEmails(prospect.id);
    }
  }, [prospect?.id]);

  if (!prospect) return null;

  async function loadEmails(prospectId: string) {
    setLoadingEmails(true);
    try {
      // We'll fetch from the outreach endpoint
      const res = await fetch(`/api/prospects/${prospectId}/emails`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails ?? []);
      }
    } catch {
      // Emails may not load if endpoint doesn't exist yet
    } finally {
      setLoadingEmails(false);
    }
  }

  async function updateStatus(newStatus: ProspectStatus) {
    if (!prospect) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function generateEmail(isFollowup: boolean = false) {
    if (!prospect) return;
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospect.id,
          tone: 'professional',
          is_followup: isFollowup,
          followup_number: isFollowup ? (emails.filter((e) => e.is_followup).length + 1) : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate email');
      await loadEmails(prospect.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function sendEmail(emailId: string) {
    setError(null);
    setSending(emailId);
    setSendConfirm(null);
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_id: emailId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Send failed' }));
        throw new Error(data.error ?? 'Send failed');
      }
      await loadEmails(prospect!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(null);
    }
  }

  async function verifyLink() {
    if (!prospect) return;
    setError(null);
    setVerifying(true);
    try {
      const res = await fetch('/api/links/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospect.id }),
      });
      if (!res.ok) throw new Error('Verification failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'overview', label: 'Overview', show: true },
    { key: 'outreach', label: 'Outreach', show: true },
    { key: 'link', label: 'Link', show: prospect.status === 'won' || prospect.link_url != null },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />

      {/* Drawer */}
      <div className="relative ml-auto flex h-full w-full max-w-[480px] flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 truncate">
              {prospect.prospect_domain}
            </h2>
            <a
              href={prospect.prospect_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline truncate block"
            >
              {prospect.prospect_url}
            </a>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {tabs.filter((t) => t.show).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' && (
            <OverviewTab
              prospect={prospect}
              editNotes={editNotes}
              setEditNotes={setEditNotes}
              saving={saving}
              onUpdateStatus={updateStatus}
            />
          )}

          {activeTab === 'outreach' && (
            <OutreachTab
              prospect={prospect}
              emails={emails}
              loadingEmails={loadingEmails}
              generating={generating}
              sending={sending}
              sendConfirm={sendConfirm}
              setSendConfirm={setSendConfirm}
              hasEmailIntegration={hasEmailIntegration}
              onGenerateEmail={generateEmail}
              onSendEmail={sendEmail}
            />
          )}

          {activeTab === 'link' && (
            <LinkTab
              prospect={prospect}
              verifying={verifying}
              onVerify={verifyLink}
              onGenerateFollowup={() => {
                setActiveTab('outreach');
                generateEmail(true);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  prospect,
  editNotes,
  setEditNotes,
  saving,
  onUpdateStatus,
}: {
  prospect: ProspectRecord;
  editNotes: string;
  setEditNotes: (v: string) => void;
  saving: boolean;
  onUpdateStatus: (s: ProspectStatus) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Domain Authority" value={prospect.domain_authority?.toString() ?? '-'} />
        <Field label="Page Authority" value={prospect.page_authority?.toString() ?? '-'} />
        <Field label="Spam Score" value={prospect.spam_score?.toString() ?? '-'} />
        <Field label="Referring Domains" value={prospect.referring_domains?.toString() ?? '-'} />
        <Field label="Monthly Traffic" value={prospect.monthly_traffic?.toLocaleString() ?? '-'} />
        <Field label="Linkability Score" value={prospect.linkability_score?.toString() ?? '-'} />
        <Field label="Relevance Score" value={prospect.relevance_score?.toString() ?? '-'} />
        <Field label="Entry Method" value={prospect.entry_method ?? '-'} />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Opportunity Type</label>
        <p className="mt-0.5 text-sm text-slate-900 capitalize">
          {prospect.opportunity_type?.replace('_', ' ') ?? '-'}
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Contact</label>
        <div className="mt-1 space-y-0.5">
          <p className="text-sm text-slate-900">{prospect.contact_name ?? 'Not enriched'}</p>
          {prospect.contact_email && (
            <p className="text-sm text-blue-600">{prospect.contact_email}</p>
          )}
          {prospect.contact_role && (
            <p className="text-xs text-slate-500 capitalize">{prospect.contact_role}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Status</label>
        <select
          value={prospect.status}
          onChange={(e) => onUpdateStatus(e.target.value as ProspectStatus)}
          disabled={saving}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {prospect.tags && prospect.tags.length > 0 && (
        <div>
          <label className="text-xs font-medium text-slate-600">Tags</label>
          <div className="mt-1 flex flex-wrap gap-1">
            {prospect.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-slate-600">Notes</label>
        <textarea
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none resize-none"
          placeholder="Add notes..."
        />
      </div>
    </div>
  );
}

function OutreachTab({
  prospect,
  emails,
  loadingEmails,
  generating,
  sending,
  sendConfirm,
  setSendConfirm,
  hasEmailIntegration,
  onGenerateEmail,
  onSendEmail,
}: {
  prospect: ProspectRecord;
  emails: OutreachEmailRecord[];
  loadingEmails: boolean;
  generating: boolean;
  sending: string | null;
  sendConfirm: string | null;
  setSendConfirm: (id: string | null) => void;
  hasEmailIntegration: boolean;
  onGenerateEmail: (isFollowup: boolean) => void;
  onSendEmail: (emailId: string) => void;
}) {
  if (loadingEmails) {
    return <p className="text-xs text-slate-500">Loading emails...</p>;
  }

  return (
    <div className="space-y-4">
      {emails.length === 0 && !generating && (
        <div className="text-center py-6">
          <p className="text-sm text-slate-600 mb-3">No emails drafted yet</p>
          <button
            onClick={() => onGenerateEmail(false)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Generate Email
          </button>
        </div>
      )}

      {generating && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-500 animate-pulse">Generating email draft...</p>
        </div>
      )}

      {emails.map((email) => (
        <div key={email.id} className="rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-900">{email.subject}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  email.status === 'sent'
                    ? 'bg-green-100 text-green-700'
                    : email.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {email.status}
              </span>
            </div>
            {email.is_followup && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                Follow-up #{email.followup_number}
              </p>
            )}
          </div>

          <div className="p-3">
            <div
              className="prose prose-sm max-w-none text-xs text-slate-700"
              dangerouslySetInnerHTML={{ __html: email.body_html }}
            />
          </div>

          <div className="border-t border-slate-100 p-3 flex items-center gap-2">
            {email.status === 'draft' && (
              <>
                {sendConfirm === email.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <p className="text-xs text-slate-600 flex-1">
                      Send to {prospect.contact_email}?
                    </p>
                    <button
                      onClick={() => onSendEmail(email.id)}
                      disabled={sending === email.id}
                      className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:bg-green-300"
                    >
                      {sending === email.id ? 'Sending...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setSendConfirm(null)}
                      className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : hasEmailIntegration ? (
                  <button
                    onClick={() => setSendConfirm(email.id)}
                    disabled={!prospect.contact_email}
                    className="rounded bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800 disabled:bg-slate-300"
                  >
                    Send
                  </button>
                ) : (
                  <a
                    href="/settings/integrations"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Connect Gmail to send &rarr;
                  </a>
                )}
              </>
            )}
            {email.status === 'sent' && email.sent_at && (
              <p className="text-[10px] text-slate-500">
                Sent {new Date(email.sent_at).toLocaleDateString()}
              </p>
            )}
            {email.replied_at && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">
                Reply received
              </span>
            )}
          </div>
        </div>
      ))}

      {emails.length > 0 && emails.some((e) => e.status === 'sent') && (
        <button
          onClick={() => onGenerateEmail(true)}
          disabled={generating}
          className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Generate Follow-up
        </button>
      )}
    </div>
  );
}

function LinkTab({
  prospect,
  verifying,
  onVerify,
  onGenerateFollowup,
}: {
  prospect: ProspectRecord;
  verifying: boolean;
  onVerify: () => void;
  onGenerateFollowup: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-600">Link URL</label>
        <p className="mt-0.5 text-sm text-slate-900 break-all">
          {prospect.link_url ?? 'Not set'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Status</label>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                prospect.link_live ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            <span className="text-sm text-slate-900">
              {prospect.link_live ? 'Live' : 'Dead'}
            </span>
          </div>
        </div>

        {prospect.link_verified_at && (
          <div>
            <label className="text-xs font-medium text-slate-600">Last Verified</label>
            <p className="mt-0.5 text-sm text-slate-900">
              {new Date(prospect.link_verified_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onVerify}
        disabled={verifying}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:bg-slate-300"
      >
        {verifying ? 'Verifying...' : 'Verify Now'}
      </button>

      {!prospect.link_live && prospect.link_lost_at && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800 font-medium">Link appears to be dead</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Lost on {new Date(prospect.link_lost_at).toLocaleDateString()}
          </p>
          <button
            onClick={onGenerateFollowup}
            className="mt-2 rounded bg-amber-600 px-3 py-1.5 text-xs text-white hover:bg-amber-700"
          >
            Re-engage
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-slate-500 uppercase">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  );
}
