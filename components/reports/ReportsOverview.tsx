import type { ExistingBacklinkRecord, OutreachEmailRecord, ProspectRecord, ProspectStatus } from '@/src/lib/types';

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function pctNum(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

const funnelStatuses: { key: ProspectStatus; label: string; color: string }[] = [
  { key: 'identified', label: 'Identified', color: 'bg-slate-400' },
  { key: 'enriched', label: 'Enriched', color: 'bg-blue-400' },
  { key: 'outreach_drafted', label: 'Drafted', color: 'bg-indigo-400' },
  { key: 'outreach_queued', label: 'Queued', color: 'bg-violet-400' },
  { key: 'contacted', label: 'Contacted', color: 'bg-amber-400' },
  { key: 'followed_up', label: 'Followed Up', color: 'bg-orange-400' },
  { key: 'won', label: 'Won', color: 'bg-emerald-500' },
  { key: 'lost', label: 'Lost', color: 'bg-red-400' },
  { key: 'not_relevant', label: 'Not Relevant', color: 'bg-slate-300' },
];

interface Props {
  prospects: ProspectRecord[];
  emails: OutreachEmailRecord[];
  backlinks: ExistingBacklinkRecord[];
}

export function ReportsOverview({ prospects, emails, backlinks }: Props) {
  const countByStatus = (status: ProspectStatus) =>
    prospects.filter((item) => item.status === status).length;

  const contactedTotal =
    countByStatus('contacted') +
    countByStatus('followed_up') +
    countByStatus('won') +
    countByStatus('lost');

  const won = countByStatus('won');
  const sentEmails = emails.filter((e) => e.status === 'sent');
  const openedEmails = emails.filter((e) => e.opened_at);
  const repliedEmails = emails.filter((e) => e.replied_at);

  // Link health
  const wonProspects = prospects.filter((p) => p.status === 'won');
  const linksLive = wonProspects.filter((p) => p.link_live).length;
  const linksLost = wonProspects.filter((p) => !p.link_live && p.link_verified_at).length;
  const linksUnchecked = wonProspects.filter((p) => !p.link_verified_at).length;

  // KPI cards
  const cards = [
    { title: 'Total prospects', value: prospects.length.toString(), sub: `Across all projects` },
    { title: 'Win rate', value: pct(won, contactedTotal), sub: `${won}/${contactedTotal} won` },
    { title: 'Links live', value: linksLive.toString(), sub: `${linksLost} lost, ${linksUnchecked} unchecked` },
    { title: 'Backlinks found', value: backlinks.length.toString(), sub: 'Existing backlink domains' },
  ];

  // Email performance
  const emailStats = [
    { label: 'Drafted', value: emails.length },
    { label: 'Sent', value: sentEmails.length },
    { label: 'Opened', value: openedEmails.length },
    { label: 'Replied', value: repliedEmails.length },
  ];

  // Funnel bar max for scaling
  const funnelMax = Math.max(1, ...funnelStatuses.map(({ key }) => countByStatus(key)));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{card.title}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-1 text-xs text-slate-600">{card.sub}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Pipeline Funnel */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Pipeline funnel</h2>
          <div className="mt-3 space-y-2">
            {funnelStatuses.map(({ key, label, color }) => {
              const count = countByStatus(key);
              const width = pctNum(count, funnelMax);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-slate-600 shrink-0">{label}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${color} rounded transition-all`}
                      style={{ width: `${Math.max(width, count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-medium text-slate-700">{count}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Email Performance */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Email performance</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {emailStats.map((stat) => (
              <div key={stat.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
          {sentEmails.length > 0 && (
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <p>Open rate: <span className="font-medium text-slate-900">{pct(openedEmails.length, sentEmails.length)}</span></p>
              <p>Reply rate: <span className="font-medium text-slate-900">{pct(repliedEmails.length, sentEmails.length)}</span></p>
            </div>
          )}
        </section>
      </div>

      {/* Link Health */}
      {wonProspects.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Link health</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Live</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900">{linksLive}</p>
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-xs text-red-700">Lost</p>
              <p className="mt-1 text-xl font-semibold text-red-900">{linksLost}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Unchecked</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{linksUnchecked}</p>
            </div>
          </div>
          <div className="mt-3 h-3 flex rounded-full overflow-hidden bg-slate-100">
            {linksLive > 0 && (
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${pctNum(linksLive, wonProspects.length)}%` }}
              />
            )}
            {linksLost > 0 && (
              <div
                className="bg-red-400 transition-all"
                style={{ width: `${pctNum(linksLost, wonProspects.length)}%` }}
              />
            )}
            {linksUnchecked > 0 && (
              <div
                className="bg-slate-300 transition-all"
                style={{ width: `${pctNum(linksUnchecked, wonProspects.length)}%` }}
              />
            )}
          </div>
        </section>
      )}

      {/* Conversion Metrics */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Conversion metrics</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Prospect → Contacted"
            value={pct(contactedTotal, prospects.length)}
            detail={`${contactedTotal} of ${prospects.length}`}
          />
          <MetricCard
            label="Contacted → Won"
            value={pct(won, contactedTotal)}
            detail={`${won} of ${contactedTotal}`}
          />
          <MetricCard
            label="Prospect → Won"
            value={pct(won, prospects.length)}
            detail={`${won} of ${prospects.length}`}
          />
          <MetricCard
            label="Avg emails per win"
            value={won > 0 ? (emails.filter((e) => prospects.some((p) => p.status === 'won' && p.id === e.prospect_id)).length / won).toFixed(1) : '-'}
            detail={won > 0 ? `${won} wins total` : 'No wins yet'}
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{detail}</p>
    </div>
  );
}
