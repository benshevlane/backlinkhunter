import type { OutreachEmailRecord, ProspectRecord } from '@/src/lib/types';

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function ReportsOverview({ prospects, emails }: { prospects: ProspectRecord[]; emails: OutreachEmailRecord[] }) {
  const byStatus = {
    identified: prospects.filter((item) => item.status === 'identified').length,
    outreach_queued: prospects.filter((item) => item.status === 'outreach_queued').length,
    contacted: prospects.filter((item) => item.status === 'contacted').length,
    followed_up: prospects.filter((item) => item.status === 'followed_up').length,
    won: prospects.filter((item) => item.status === 'won').length,
    lost: prospects.filter((item) => item.status === 'lost').length,
  };

  const contactedTotal = byStatus.contacted + byStatus.followed_up + byStatus.won + byStatus.lost;

  const cards = [
    { title: 'Prospects total', value: prospects.length.toString(), sub: 'All pipeline items' },
    { title: 'Emails drafted', value: emails.length.toString(), sub: 'Draft + sent records' },
    { title: 'Contacted rate', value: pct(contactedTotal, prospects.length), sub: `${contactedTotal}/${prospects.length} contacted+` },
    { title: 'Win rate', value: pct(byStatus.won, contactedTotal), sub: `${byStatus.won}/${contactedTotal} won` },
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
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-500">{status.replace('_', ' ')}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{count}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
