import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pulls deltas from Eric's "Truficient HVAC Website" Lovable project (the
// REAL live-site source, confirmed via truficient.com network traffic and
// its own .env — project ref xvsgdzwadxbwpevdezbp) via its
// sync_export_changes() RPC and upserts them into this project's own
// Supabase (target).
//
// This source's schema is already near-identical to ours, so most tables
// preserve the source row's own `id` directly. The exception is
// crm_job_types/crm_job_stages: the target already has its OWN seeded set
// of these (same slugs, different ids, from this repo's own migrations —
// see 20260207041713_...sql). So instead of importing the source's copies
// (which would collide on the unique slug constraint), we match source
// job_type_id -> target job_type by slug, and source current_stage_id ->
// target stage by (resolved job_type_id, stage_type), then remap those
// foreign keys on crm_jobs before insert.

const TARGET_TENANT_ID = 'cb75a3f3-f310-4587-a4cc-098f50aef59c';

async function fetchSourceRows(table: string, since: string, lovableUrl: string, lovableAnonKey: string): Promise<any[]> {
  const all: any[] = [];
  let cursor = since;
  for (let i = 0; i < 50; i++) {
    const res = await fetch(`${lovableUrl}/rest/v1/rpc/sync_export_changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: lovableAnonKey },
      body: JSON.stringify({ p_table: table, p_since: cursor }),
    });
    if (!res.ok) throw new Error(`sync_export_changes(${table}) failed: ${res.status} ${await res.text()}`);
    const batch: any[] = await res.json();
    all.push(...batch);
    if (batch.length < 500) break;
    cursor = batch[batch.length - 1].updated_at ?? batch[batch.length - 1].created_at;
  }
  return all;
}

async function upsertPreservingId(supabase: any, table: string, rows: any[]): Promise<{ upserted: number }> {
  if (rows.length === 0) return { upserted: 0 };
  const payload = rows.map((row) => ({ ...row, tenant_id: TARGET_TENANT_ID }));
  const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return { upserted: payload.length };
}

// Builds source_job_type_id -> target_job_type_id (matched by slug) and
// source_stage_id -> target_stage_id (matched by resolved job_type_id + stage_type).
async function buildJobTypeAndStageMaps(supabase: any, lovableUrl: string, lovableAnonKey: string) {
  const sourceJobTypes = await fetchSourceRows('crm_job_types', '2000-01-01T00:00:00Z', lovableUrl, lovableAnonKey);
  const sourceStages = await fetchSourceRows('crm_job_stages', '2000-01-01T00:00:00Z', lovableUrl, lovableAnonKey);

  const { data: targetJobTypes, error: jtErr } = await supabase
    .from('crm_job_types')
    .select('id, slug')
    .eq('tenant_id', TARGET_TENANT_ID);
  if (jtErr) throw jtErr;
  const slugToTargetId = new Map<string, string>(targetJobTypes.map((t: any) => [t.slug, t.id]));

  const jobTypeIdMap = new Map<string, string>();
  for (const jt of sourceJobTypes) {
    const targetId = slugToTargetId.get(jt.slug);
    if (targetId) jobTypeIdMap.set(jt.id, targetId);
  }

  const { data: targetStages, error: stErr } = await supabase
    .from('crm_job_stages')
    .select('id, job_type_id, stage_type, sort_order')
    .eq('tenant_id', TARGET_TENANT_ID)
    .order('sort_order', { ascending: true });
  if (stErr) throw stErr;

  const stageIdMap = new Map<string, string>();
  for (const stage of sourceStages) {
    const mappedJobTypeId = jobTypeIdMap.get(stage.job_type_id);
    if (!mappedJobTypeId) continue;
    const match = targetStages.find((t: any) => t.job_type_id === mappedJobTypeId && t.stage_type === stage.stage_type);
    if (match) stageIdMap.set(stage.id, match.id);
  }

  return { jobTypeIdMap, stageIdMap };
}

async function syncJobs(supabase: any, rows: any[], jobTypeIdMap: Map<string, string>, stageIdMap: Map<string, string>) {
  if (rows.length === 0) return { upserted: 0, skipped: 0 };
  let skipped = 0;
  const payload = rows
    .map((row) => {
      const job_type_id = jobTypeIdMap.get(row.job_type_id);
      if (!job_type_id) {
        skipped++;
        return null;
      }
      return {
        ...row,
        tenant_id: TARGET_TENANT_ID,
        job_type_id,
        current_stage_id: row.current_stage_id ? stageIdMap.get(row.current_stage_id) ?? null : null,
      };
    })
    .filter(Boolean);

  if (payload.length > 0) {
    const { error } = await supabase.from('crm_jobs').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  }
  return { upserted: payload.length, skipped };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const lovableUrl = Deno.env.get('LOVABLE_SUPABASE_URL');
  const lovableAnonKey = Deno.env.get('LOVABLE_ANON_KEY');
  if (!lovableUrl || !lovableAnonKey) {
    return new Response(JSON.stringify({ error: 'LOVABLE_SUPABASE_URL / LOVABLE_ANON_KEY secrets not set' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const results: Record<string, unknown> = {};

  try {
    const { jobTypeIdMap, stageIdMap } = await buildJobTypeAndStageMaps(supabase, lovableUrl, lovableAnonKey);
    results['_job_type_map_size'] = jobTypeIdMap.size;
    results['_stage_map_size'] = stageIdMap.size;

    // Direct-copy tables (no unique-constraint collisions expected).
    // Order matters: crm_customers.company_id -> crm_companies,
    // crm_locations.customer_id -> crm_customers.
    for (const table of ['crm_companies', 'crm_customers', 'crm_locations']) {
      const { data: state } = await supabase
        .from('legacy_sync_state')
        .select('last_synced_at')
        .eq('source_table', table)
        .maybeSingle();
      const since = state?.last_synced_at ?? '2000-01-01T00:00:00Z';

      const rows = await fetchSourceRows(table, since, lovableUrl, lovableAnonKey);
      const summary = await upsertPreservingId(supabase, table, rows);

      const maxTimestamp = rows.reduce((max, r) => {
        const t = r.updated_at ?? r.created_at;
        return t > max ? t : max;
      }, since);

      await supabase
        .from('legacy_sync_state')
        .upsert({ source_table: table, last_synced_at: maxTimestamp, updated_at: new Date().toISOString() }, { onConflict: 'source_table' });

      results[table] = { fetched: rows.length, ...summary };
    }

    // crm_jobs — foreign keys remapped via the maps built above
    {
      const { data: state } = await supabase
        .from('legacy_sync_state')
        .select('last_synced_at')
        .eq('source_table', 'crm_jobs')
        .maybeSingle();
      const since = state?.last_synced_at ?? '2000-01-01T00:00:00Z';

      const rows = await fetchSourceRows('crm_jobs', since, lovableUrl, lovableAnonKey);
      const summary = await syncJobs(supabase, rows, jobTypeIdMap, stageIdMap);

      const maxTimestamp = rows.reduce((max, r) => {
        const t = r.updated_at ?? r.created_at;
        return t > max ? t : max;
      }, since);

      await supabase
        .from('legacy_sync_state')
        .upsert({ source_table: 'crm_jobs', last_synced_at: maxTimestamp, updated_at: new Date().toISOString() }, { onConflict: 'source_table' });

      results['crm_jobs'] = { fetched: rows.length, ...summary };
    }

    // admin_notifications / contact_submissions (no extra FK deps),
    // admin_tasks (references crm_jobs/crm_customers, already imported above;
    // pipeline_entry_id is nulled out since crm_pipeline_entries isn't synced),
    // and crm_job_appointments (references crm_jobs; assigned_team_id nulled
    // out since crm_team_members isn't synced) — this last one drives the
    // dashboard's "Today's Jobs" count.
    for (const table of ['admin_notifications', 'contact_submissions', 'admin_tasks', 'crm_job_appointments']) {
      const { data: state } = await supabase
        .from('legacy_sync_state')
        .select('last_synced_at')
        .eq('source_table', table)
        .maybeSingle();
      const since = state?.last_synced_at ?? '2000-01-01T00:00:00Z';

      const rows = await fetchSourceRows(table, since, lovableUrl, lovableAnonKey);
      const rowsToInsert =
        table === 'admin_tasks'
          ? rows.map((r) => ({ ...r, pipeline_entry_id: null }))
          : table === 'crm_job_appointments'
          ? rows.map((r) => ({ ...r, assigned_team_id: null, google_calendar_id: null }))
          : rows;
      const summary = await upsertPreservingId(supabase, table, rowsToInsert);

      const maxTimestamp = rows.reduce((max, r) => {
        const t = r.updated_at ?? r.created_at;
        return t > max ? t : max;
      }, since);

      await supabase
        .from('legacy_sync_state')
        .upsert({ source_table: table, last_synced_at: maxTimestamp, updated_at: new Date().toISOString() }, { onConflict: 'source_table' });

      results[table] = { fetched: rows.length, ...summary };
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message, partial: results }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
