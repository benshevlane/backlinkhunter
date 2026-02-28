import { NextResponse } from 'next/server';
import { requireApiAuth, isResponse, parseBody } from '@/src/lib/api-utils';
import { alertsCheckSchema } from '@/src/lib/validations';
import {
  listActiveKeywordAlerts,
  listKeywordAlertsForProject,
  updateKeywordAlert,
} from '@/src/lib/store';
import { searchGoogle } from '@/src/lib/integrations/google-search';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, alertsCheckSchema);
  if (isResponse(body)) return body;

  // Get alerts to check: either for a specific project or all active alerts
  const alerts = body.project_id
    ? await listKeywordAlertsForProject(body.project_id, auth.orgId)
    : await listActiveKeywordAlerts(auth.orgId);

  const activeAlerts = alerts.filter((a) => a.is_active);
  const results = [];

  for (const alert of activeAlerts) {
    const searchResults = await searchGoogle(alert.keyword, { num: 10 });
    const now = new Date().toISOString();

    await updateKeywordAlert(alert.id, auth.orgId, {
      last_checked_at: now,
      last_results_count: searchResults.length,
    });

    results.push({
      alert_id: alert.id,
      keyword: alert.keyword,
      project_id: alert.project_id,
      results_count: searchResults.length,
      checked_at: now,
      top_results: searchResults.slice(0, 5).map((r) => ({
        url: r.url,
        title: r.title,
        snippet: r.snippet,
      })),
    });
  }

  return NextResponse.json({
    alerts_checked: results.length,
    results,
  });
}
