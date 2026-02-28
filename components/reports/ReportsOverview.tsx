import type { OutreachEmailRecord, ProspectRecord, ProspectStatus } from '@/src/lib/types';

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatStatus(status: string): string {
  return status.replaceAll('_', ' ');
}

const funnelStatuses: { key: ProspectStatus; label: string }[] = [
  { key: 'identified', label: 'Identified' },
  { key: 'outreach_queued', label: 'Outreach Queued' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'followed_up', label: 'Followed Up' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'not_relevant', label: 'Not Relevant' },
  { key: 'needs_manual_enrichment', label: 'Needs Enrichment' },
  { key: 'verification_error', label: 'Verification Error' },
];

export function ReportsOverview({ prospects, emails }: { prospects: ProspectRecord[]; emails: OutreachEmailRecord[] }) {
  const countByStatus = (status: ProspectStatus) =>
    prospects.filter((item) => item.status === status).length;

  const contactedTotal =
    countByStatus('contacted') +
    countByStatus('followed_up') +
    countByStatus('won') +
    countByStatus('lost');

  const cards = [
    { title: 'Prospects total', value: prospects.length.toString(), sub: 'All pipeline items' },
    { title: 'Emails drafted', value: emails.length.toString(), sub: 'Draft + sent records' },
    { title: 'Contacted rate', value: pct(contactedTotal, prospects.length), sub: `${contactedTotal}/${prospects.length} contacted+` },
    { title: 'Win rate', value: pct(countByStatus('won'), contactedTotal), sub: `${countByStatus('won')}/${contactedTotal} won` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{card.title}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-1 text-xs text-slate-600">{card.sub}</p>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Pipeline funnel</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {funnelStatuses.map(({ key, label }) => (
            <div key={key} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-500">{formatStatus(label)}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{countByStatus(key)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
