'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SiteAnalysisResult } from '@/src/lib/types';

type Step = 'url' | 'analysing' | 'review' | 'creating';

export function ProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('url');
  const [siteUrl, setSiteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Analysis results (editable by user)
  const [niche, setNiche] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [audience, setAudience] = useState('');
  const [domainRating, setDomainRating] = useState<number | null>(null);
  const [contentThemes, setContentThemes] = useState<string[]>([]);

  // Project creation fields
  const [projectName, setProjectName] = useState('');

  async function handleAnalyse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep('analysing');

    try {
      const res = await fetch('/api/projects/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: siteUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Analysis failed (${res.status})`);
      }

      const { analysis } = (await res.json()) as { analysis: SiteAnalysisResult };
      setNiche(analysis.niche);
      setDescription(analysis.description);
      setKeywords(analysis.target_keywords);
      setAudience(analysis.target_audience);
      setDomainRating(analysis.domain_rating);
      setContentThemes(analysis.content_themes);

      // Pre-fill project name from domain
      if (!projectName) {
        const domain = new URL(siteUrl).hostname.replace(/^www\./, '');
        setProjectName(domain);
      }

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStep('url');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep('creating');

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          target_url: siteUrl,
          niche: niche || undefined,
          target_keywords: keywords.length > 0 ? keywords : undefined,
          description: description || undefined,
          domain_rating: domainRating ?? undefined,
          target_audience: audience || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Failed to create project');
      }

      const { project } = (await res.json()) as { project: { id: string } };
      router.push(`/projects/${project.id}/prospects`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setStep('review');
    }
  }

  function addKeyword() {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
    }
    setKeywordInput('');
  }

  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <StepIndicator label="1. Enter URL" active={step === 'url' || step === 'analysing'} done={step === 'review' || step === 'creating'} />
        <span className="text-slate-300">/</span>
        <StepIndicator label="2. Review analysis" active={step === 'review' || step === 'creating'} done={step === 'creating'} />
        <span className="text-slate-300">/</span>
        <StepIndicator label="3. Create project" active={step === 'creating'} done={false} />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Enter URL */}
      {(step === 'url' || step === 'analysing') && (
        <form onSubmit={handleAnalyse} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Analyse your site</h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter your website URL and we'll automatically extract your niche, keywords, and target audience.
            </p>
          </div>

          <div>
            <label htmlFor="site-url" className="block text-sm font-medium text-slate-700">
              Website URL
            </label>
            <input
              id="site-url"
              type="url"
              required
              placeholder="https://example.com"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              disabled={step === 'analysing'}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={step === 'analysing'}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {step === 'analysing' ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Analysing site...
              </span>
            ) : (
              'Analyse'
            )}
          </button>
        </form>
      )}

      {/* Step 2: Review & Edit Results */}
      {(step === 'review' || step === 'creating') && (
        <form onSubmit={handleCreate} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Review analysis</h2>
            <p className="mt-1 text-sm text-slate-600">
              We've analysed <span className="font-medium">{siteUrl}</span>. Edit any fields below, then create your project.
            </p>
          </div>

          {/* Domain rating badge */}
          {domainRating !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Domain Rating:</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-900">
                {domainRating}
              </span>
            </div>
          )}

          <FieldGroup label="Project name">
            <input
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={step === 'creating'}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
            />
          </FieldGroup>

          <FieldGroup label="Niche">
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              disabled={step === 'creating'}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
            />
          </FieldGroup>

          <FieldGroup label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={step === 'creating'}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
            />
          </FieldGroup>

          <FieldGroup label="Target audience">
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              disabled={step === 'creating'}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
            />
          </FieldGroup>

          <FieldGroup label="Keywords">
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    disabled={step === 'creating'}
                    className="text-slate-400 hover:text-slate-700"
                    aria-label={`Remove ${kw}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2">
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                disabled={step === 'creating'}
                placeholder="Add keyword..."
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-60"
              />
              <button
                type="button"
                onClick={addKeyword}
                disabled={step === 'creating'}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </FieldGroup>

          {contentThemes.length > 0 && (
            <FieldGroup label="Content themes">
              <div className="flex flex-wrap gap-1.5">
                {contentThemes.map((theme) => (
                  <span key={theme} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                    {theme}
                  </span>
                ))}
              </div>
            </FieldGroup>
          )}

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => {
                setStep('url');
                setError(null);
              }}
              disabled={step === 'creating'}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={step === 'creating'}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {step === 'creating' ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Creating project...
                </span>
              ) : (
                'Create project'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function StepIndicator({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span className={done ? 'font-medium text-green-600' : active ? 'font-medium text-slate-900' : ''}>
      {done ? `${label}` : label}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
