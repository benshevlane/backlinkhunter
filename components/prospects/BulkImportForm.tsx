'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import type { BulkImportResponse, BulkImportValidationResult } from '@/src/lib/types';

interface Props {
  projectId: string;
}

export function BulkImportForm({ projectId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Input state
  const [urlText, setUrlText] = useState('');
  const [minDa, setMinDa] = useState(10);
  const [maxSpam, setMaxSpam] = useState(30);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation results
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<BulkImportValidationResult[]>([]);
  const [reviewApproved, setReviewApproved] = useState<Set<string>>(new Set());

  const passed = results.filter((r) => r.bucket === 'pass');
  const review = results.filter((r) => r.bucket === 'review');
  const failed = results.filter((r) => r.bucket === 'fail');

  function parseUrls(text: string): string[] {
    return text
      .split(/[\n,]+/)
      .map((line) => line.trim())
      .filter((line) => {
        try {
          new URL(line);
          return true;
        } catch {
          return false;
        }
      });
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n');
    const header = lines[0]?.toLowerCase() ?? '';
    const urlCol = header.split(',').findIndex((col) => col.trim() === 'url');

    const urls: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const val = (urlCol >= 0 ? cols[urlCol] : cols[0])?.trim().replace(/^["']|["']$/g, '');
      if (val) urls.push(val);
    }

    setUrlText(urls.join('\n'));
  }

  async function handleValidate() {
    const urls = parseUrls(urlText);
    if (urls.length === 0) {
      setError('No valid URLs found. Enter one URL per line.');
      return;
    }

    setError(null);
    setLoading(true);
    setResults([]);
    setReviewApproved(new Set());

    try {
      const response = await fetch('/api/prospects/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          urls,
          thresholds: { min_da: minDa, min_relevance: 30, max_spam_score: maxSpam },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Validation failed');
      }

      const data = (await response.json()) as BulkImportResponse;
      setJobId(data.job_id);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  }

  function toggleReview(url: string) {
    setReviewApproved((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function handleConfirm() {
    if (!jobId) return;
    setSaving(true);
    setError(null);

    const approvedUrls = [
      ...passed.map((r) => r.url),
      ...Array.from(reviewApproved),
    ];

    try {
      const response = await fetch('/api/prospects/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, approved_urls: approvedUrls }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Import failed');
      }

      const data = (await response.json()) as { prospects_created: number; project_id: string };
      router.push(`/projects/${data.project_id}/prospects`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setSaving(false);
    }
  }

  const totalApproved = passed.length + reviewApproved.size;

  return (
    <div className="space-y-4">
      {/* Input phase */}
      {results.length === 0 && (
        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700">Paste URLs</h2>
            <p className="mt-1 text-xs text-slate-500">One URL per line, or upload a CSV with a &quot;url&quot; column.</p>
            <textarea
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              rows={8}
              placeholder="https://example.com/page-1&#10;https://another-site.com/resources&#10;https://blog.example.co.uk/article"
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                Upload CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              <a
                href="/api/prospects/bulk-import/template"
                download="import-template.csv"
                className="text-xs text-slate-500 hover:text-slate-700 underline"
                onClick={(e) => {
                  e.preventDefault();
                  const csv = 'url,site_name,notes,opportunity_type\nhttps://example.com,Example Site,Optional notes,resource_link\n';
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'import-template.csv';
                  a.click();
                }}
              >
                Download template CSV
              </a>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700">Thresholds</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="flex items-center justify-between text-xs text-slate-600">
                  <span>Min Domain Authority</span>
                  <span className="font-medium text-slate-900">{minDa}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={minDa}
                  onChange={(e) => setMinDa(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <label className="flex items-center justify-between text-xs text-slate-600">
                  <span>Max Spam Score</span>
                  <span className="font-medium text-slate-900">{maxSpam}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={maxSpam}
                  onChange={(e) => setMaxSpam(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={handleValidate}
            disabled={loading || !urlText.trim()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Validating...' : `Validate ${parseUrls(urlText).length} URLs`}
          </button>
        </div>
      )}

      {/* Review phase */}
      {results.length > 0 && (
        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-700">Pass</p>
              <p className="text-xl font-semibold text-emerald-900">{passed.length}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-700">Review</p>
              <p className="text-xl font-semibold text-amber-900">{review.length}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-medium text-red-700">Fail</p>
              <p className="text-xl font-semibold text-red-900">{failed.length}</p>
            </div>
          </div>

          {/* Pass bucket */}
          {passed.length > 0 && (
            <BucketTable
              title="Pass"
              items={passed}
              color="emerald"
              selectable={false}
            />
          )}

          {/* Review bucket */}
          {review.length > 0 && (
            <BucketTable
              title="Review"
              items={review}
              color="amber"
              selectable
              selected={reviewApproved}
              onToggle={toggleReview}
            />
          )}

          {/* Fail bucket */}
          {failed.length > 0 && (
            <BucketTable
              title="Fail"
              items={failed}
              color="red"
              selectable={false}
              dimmed
            />
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setResults([]); setJobId(null); }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || totalApproved === 0}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Importing...' : `Import ${totalApproved} prospect${totalApproved !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BucketTable({
  title,
  items,
  color,
  selectable,
  dimmed,
  selected,
  onToggle,
}: {
  title: string;
  items: BulkImportValidationResult[];
  color: 'emerald' | 'amber' | 'red';
  selectable: boolean;
  dimmed?: boolean;
  selected?: Set<string>;
  onToggle?: (url: string) => void;
}) {
  const borderColor = color === 'emerald' ? 'border-emerald-200' : color === 'amber' ? 'border-amber-200' : 'border-red-200';

  return (
    <section className={`rounded-lg border ${borderColor} bg-white p-4 ${dimmed ? 'opacity-60' : ''}`}>
      <h3 className="text-sm font-semibold text-slate-700">{title} ({items.length})</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              {selectable && <th className="pb-2 pr-2 w-8" />}
              <th className="pb-2 pr-4">Domain</th>
              <th className="pb-2 pr-4 text-right">DA</th>
              <th className="pb-2 pr-4 text-right">Spam</th>
              <th className="pb-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.url} className="border-t border-slate-100">
                {selectable && (
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={selected?.has(item.url) ?? false}
                      onChange={() => onToggle?.(item.url)}
                      className="rounded border-slate-300"
                    />
                  </td>
                )}
                <td className="py-2 pr-4 text-slate-800">{item.domain}</td>
                <td className="py-2 pr-4 text-right text-slate-600">{item.domain_authority ?? '-'}</td>
                <td className="py-2 pr-4 text-right text-slate-600">{item.spam_score ?? '-'}</td>
                <td className="py-2 text-slate-500 text-xs">{item.reason ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
