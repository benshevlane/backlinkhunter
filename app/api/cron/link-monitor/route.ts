import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/src/lib/cron-auth';
import { createServiceSupabase } from '@/src/lib/supabase/service';
import { verifyProspectLink } from '@/src/lib/link-verification';
import { logger } from '@/src/lib/logger';
import type { ProjectRecord, ProspectRecord } from '@/src/lib/types';

const log = logger.create('cron-link-monitor');

export async function GET(request: Request) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  const supabase = createServiceSupabase();

  // Get all projects
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('*');

  if (projErr) {
    log.error('Failed to fetch projects', { error: projErr.message });
    return NextResponse.json({ error: projErr.message }, { status: 500 });
  }

  if (!projects || projects.length === 0) {
    return NextResponse.json({ projects_checked: 0, total_links: 0 });
  }

  let totalLinks = 0;
  let totalLive = 0;
  let totalLost = 0;

  for (const project of projects as ProjectRecord[]) {
    // Get 'won' prospects with active links
    const { data: prospects, error: prospErr } = await supabase
      .from('prospects')
      .select('*')
      .eq('project_id', project.id)
      .eq('status', 'won');

    if (prospErr || !prospects) continue;

    for (const prospect of prospects as ProspectRecord[]) {
      const result = await verifyProspectLink(prospect, project.target_url);

      await supabase
        .from('prospects')
        .update({
          link_live: result.link_live,
          link_url: result.link_url,
          link_verified_at: result.verified_at,
          link_lost_at: result.lost_at,
          status: result.error ? 'verification_error' : prospect.status,
        })
        .eq('id', prospect.id);

      totalLinks++;
      if (result.link_live) totalLive++;
      else totalLost++;
    }
  }

  log.info('Link monitor complete', {
    projects: projects.length,
    links: totalLinks,
    live: totalLive,
    lost: totalLost,
  });

  return NextResponse.json({
    projects_checked: projects.length,
    total_links: totalLinks,
    live: totalLive,
    lost: totalLost,
  });
}
