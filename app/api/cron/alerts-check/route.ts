import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/src/lib/cron-auth';
import { createServiceSupabase } from '@/src/lib/supabase/service';
import { searchGoogle } from '@/src/lib/integrations/google-search';
import { logger } from '@/src/lib/logger';
import type { KeywordAlertRecord } from '@/src/lib/types';

const log = logger.create('cron-alerts-check');

export async function GET(request: Request) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  const supabase = createServiceSupabase();

  // Get all active keyword alerts
  const { data: alerts, error: alertsErr } = await supabase
    .from('keyword_alerts')
    .select('*')
    .eq('is_active', true);

  if (alertsErr) {
    log.error('Failed to fetch alerts', { error: alertsErr.message });
    return NextResponse.json({ error: alertsErr.message }, { status: 500 });
  }

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ alerts_checked: 0 });
  }

  const results = [];
  for (const alert of alerts as KeywordAlertRecord[]) {
    try {
      const searchResults = await searchGoogle(alert.keyword, { num: 10 });
      const now = new Date().toISOString();

      await supabase
        .from('keyword_alerts')
        .update({
          last_checked_at: now,
          last_results_count: searchResults.length,
        })
        .eq('id', alert.id);

      results.push({
        alert_id: alert.id,
        keyword: alert.keyword,
        results_count: searchResults.length,
      });
    } catch (err) {
      log.warn('Alert check failed', {
        alert_id: alert.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  log.info('Alerts check complete', { checked: results.length });
  return NextResponse.json({ alerts_checked: results.length, results });
}
