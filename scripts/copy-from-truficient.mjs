#!/usr/bin/env node
/**
 * One-time FULL data copy: Truficient Supabase project  ->  Trade-OS Supabase project.
 *
 * Copies every public table that exists in both databases (plus auth.users /
 * auth.identities with --with-auth), so the Trade-OS CRM shows the same data
 * as the live Truficient admin (knowledge base, calendars, teams, WorkEdge,
 * estimates, invoices, pricing, SEO, ...).
 *
 * What it does per table:
 *   - only copies columns that exist in BOTH databases (schema drift safe)
 *   - sets tenant_id = TENANT_ID on every row of tables that have that column
 *     (Truficient is single-tenant, so its data becomes one Trade-OS tenant)
 *   - remaps crm_job_types / crm_job_stages ids onto the ones already seeded in
 *     the target (matched by slug / stage_type), same as the lovable-sync function
 *   - upserts by primary key, so it is safe to re-run; rows that violate some
 *     other constraint are reported, not fatal
 *   - disables FK checks + triggers during the copy (session_replication_role =
 *     replica), so table order doesn't matter and no events/notifications fire
 *
 * RPC mode (no DB password - use when the source is Lovable Cloud): instead of
 * SOURCE_DB_URL set  SOURCE_URL=https://xvsgdzwadxbwpevdezbp.supabase.co  and
 * SOURCE_ANON_KEY=<its anon/publishable key>. Tables the source's
 * sync_export_changes() refuses are printed as SKIP - ask Lovable to allow them.
 *
 * Usage (Node 18+):
 *   npm i -D pg
 *   SOURCE_DB_URL="postgresql://postgres:<pw>@db.xvsgdzwadxbwpevdezbp.supabase.co:5432/postgres" \
 *   TARGET_DB_URL="postgresql://postgres:<pw>@db.cnnwcjmyfxmqspjinsva.supabase.co:5432/postgres" \
 *   node scripts/copy-from-truficient.mjs --dry-run          # counts only
 *   ... node scripts/copy-from-truficient.mjs --with-auth    # real run incl. logins
 *
 * Get the URLs from Supabase Dashboard > Project Settings > Database >
 * Connection string (use the direct / session-mode connection, not transaction).
 * SOURCE is only ever READ. Never commit these URLs.
 *
 * Env / flags:
 *   TENANT_ID   target tenant (default cb75a3f3-f310-4587-a4cc-098f50aef59c)
 *   --dry-run   report source/target row counts, write nothing
 *   --with-auth also copy auth.users + auth.identities (keeps password hashes,
 *               so staff can log in with the same credentials)
 *   --only=a,b  copy just these tables
 *   --skip=a,b  extra tables to skip
 *
 * NOT covered: Storage files (buckets/objects) and edge-function secrets.
 */
import pg from 'pg';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1]?.split(',').filter(Boolean);

const SOURCE_DB_URL = process.env.SOURCE_DB_URL;
const TARGET_DB_URL = process.env.TARGET_DB_URL;
// RPC mode: read Lovable's DB through its public sync_export_changes() function
// (same door lovable-sync uses) - needs NO database password.
const SOURCE_URL = process.env.SOURCE_URL; // https://xvsgdzwadxbwpevdezbp.supabase.co
const SOURCE_ANON_KEY = process.env.SOURCE_ANON_KEY;
const RPC = !SOURCE_DB_URL && !!(SOURCE_URL && SOURCE_ANON_KEY);
const TENANT_ID = process.env.TENANT_ID || 'cb75a3f3-f310-4587-a4cc-098f50aef59c';
const DRY = flag('dry-run');
const WITH_AUTH = flag('with-auth');
const ONLY = opt('only');
const SKIP = new Set(['tenants', 'legacy_sync_state', 'schema_migrations', ...(opt('skip') ?? [])]);
const BATCH = 500;
// --replace-by=table:column,...  resolve conflicts on a unique column (not the id):
// the source row overwrites the target's seeded row, INCLUDING its id, so child
// tables copied with source ids line up.  e.g. --replace-by=page_seo:page_path,seo_location_pages:url_slug
const REPLACE_BY = Object.fromEntries((opt('replace-by') ?? []).map((x) => x.split(':')));

if ((!SOURCE_DB_URL && !RPC) || !TARGET_DB_URL) {
  console.error('Set TARGET_DB_URL plus either SOURCE_DB_URL, or SOURCE_URL + SOURCE_ANON_KEY (see header).');
  process.exit(1);
}
if (SOURCE_DB_URL === TARGET_DB_URL) {
  console.error('SOURCE_DB_URL and TARGET_DB_URL are identical - refusing to run.');
  process.exit(1);
}

const mk = (url) => new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const src = RPC ? null : mk(SOURCE_DB_URL);
const dst = mk(TARGET_DB_URL);

const qi = (s) => `"${s.replace(/"/g, '""')}"`;
const ref = (schema, table) => `${qi(schema)}.${qi(table)}`;

const rpcCache = new Map();
async function rpcAll(table) {
  if (rpcCache.has(table)) return rpcCache.get(table);
  const all = [];
  let cursor = '2000-01-01T00:00:00Z';
  for (let i = 0; i < 2000; i++) {
    const res = await fetch(`${SOURCE_URL}/rest/v1/rpc/sync_export_changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SOURCE_ANON_KEY },
      body: JSON.stringify({ p_table: table, p_since: cursor }),
    });
    if (!res.ok) throw new Error(`source RPC refused '${table}': ${res.status} ${(await res.text()).slice(0, 120)}`);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 500) break;
    const last = batch[batch.length - 1];
    const next = last.updated_at ?? last.created_at;
    if (!next || next === cursor) break;
    cursor = next;
  }
  const seen = new Set(); // cursor overlap can repeat rows
  const uniq = all.filter((r) => (r.id == null ? true : seen.has(r.id) ? false : (seen.add(r.id), true)));
  rpcCache.set(table, uniq);
  return uniq;
}

async function listTables(c, schema) {
  const { rows } = await c.query(
    `select table_name from information_schema.tables where table_schema=$1 and table_type='BASE TABLE'`,
    [schema],
  );
  return new Set(rows.map((r) => r.table_name));
}

async function columns(c, schema, table) {
  const { rows } = await c.query(
    `select column_name, is_generated, identity_generation
       from information_schema.columns where table_schema=$1 and table_name=$2 order by ordinal_position`,
    [schema, table],
  );
  return rows;
}

async function primaryKey(c, schema, table) {
  const { rows } = await c.query(
    `select a.attname from pg_index i
       join pg_attribute a on a.attrelid=i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = $1::regclass and i.indisprimary`,
    [ref(schema, table)],
  );
  return rows.map((r) => r.attname);
}

async function count(c, schema, table) {
  const { rows } = await c.query(`select count(*)::int n from ${ref(schema, table)}`);
  return rows[0].n;
}

// ---- job type / stage id remap (target already has its own seeded set) -------
async function buildRemaps() {
  const jobTypeMap = new Map();
  const stageMap = new Map();
  try {
    const sJT = RPC ? await rpcAll('crm_job_types') : (await src.query('select id, slug from public.crm_job_types')).rows;
    const tJT = (await dst.query('select id, slug from public.crm_job_types where tenant_id=$1', [TENANT_ID])).rows;
    const bySlug = new Map(tJT.map((t) => [t.slug, t.id]));
    for (const jt of sJT) if (bySlug.has(jt.slug)) jobTypeMap.set(jt.id, bySlug.get(jt.slug));

    const sST = RPC ? await rpcAll('crm_job_stages') : (await src.query('select id, job_type_id, stage_type from public.crm_job_stages')).rows;
    const tST = (await dst.query('select id, job_type_id, stage_type from public.crm_job_stages where tenant_id=$1', [TENANT_ID])).rows;
    for (const st of sST) {
      const jt = jobTypeMap.get(st.job_type_id);
      const m = jt && tST.find((t) => t.job_type_id === jt && t.stage_type === st.stage_type);
      if (m) stageMap.set(st.id, m.id);
    }
  } catch (e) {
    console.warn('! could not build job type/stage remap:', e.message);
  }
  return { jobTypeMap, stageMap };
}

async function copyTable(schema, table, remaps) {
  let rpcRows = null;
  if (RPC) rpcRows = await rpcAll(table); // throws if the source RPC doesn't allow this table
  const tCols = await columns(dst, schema, table);
  const sCols = RPC
    ? Object.keys(rpcRows[0] ?? {}).map((column_name) => ({ column_name }))
    : await columns(src, schema, table);
  const sNames = new Set(sCols.map((c) => c.column_name));
  const cols = tCols
    .filter((c) => c.is_generated !== 'ALWAYS' && c.identity_generation !== 'ALWAYS')
    .map((c) => c.column_name)
    .filter((n) => sNames.has(n) || n === 'tenant_id');
  const hasTenant = tCols.some((c) => c.column_name === 'tenant_id') && schema === 'public';
  const pk = await primaryKey(dst, schema, table);
  const total = RPC ? rpcRows.length : await count(src, schema, table);
  const existing = await count(dst, schema, table);

  if (DRY) return { total, existing, done: 0, failed: 0 };
  if (total === 0 || cols.length === 0) return { total, existing, done: 0, failed: 0 };

  // Types already seeded in the target are matched, not re-inserted.
  const skipInsert = schema === 'public' && (table === 'crm_job_types' || table === 'crm_job_stages');
  const remapJT = (r) => { if ('job_type_id' in r && remaps.jobTypeMap.has(r.job_type_id)) r.job_type_id = remaps.jobTypeMap.get(r.job_type_id); };
  const remapStage = (r) => {
    for (const k of Object.keys(r)) if (/(^|_)stage_id$/.test(k) && remaps.stageMap.has(r[k])) r[k] = remaps.stageMap.get(r[k]);
  };

  const colList = cols.map(qi).join(', ');
  const nonPk = cols.filter((c) => !pk.includes(c));
  const replaceCol = REPLACE_BY[table];
  const conflict = replaceCol
    ? `on conflict (${qi(replaceCol)}) do update set ${cols.filter((c) => c !== replaceCol).map((c) => `${qi(c)}=excluded.${qi(c)}`).join(', ')}`
    : pk.length
    ? nonPk.length
      ? `on conflict (${pk.map(qi).join(', ')}) do update set ${nonPk.map((c) => `${qi(c)}=excluded.${qi(c)}`).join(', ')}`
      : `on conflict (${pk.map(qi).join(', ')}) do nothing`
    : 'on conflict do nothing';
  const sql = `insert into ${ref(schema, table)} (${colList})
               select ${colList} from jsonb_populate_recordset(null::${ref(schema, table)}, $1::jsonb) ${conflict}`;

  let done = 0, failed = 0;
  const errors = [];
  const selectCols = [...sNames].map(qi).join(', ');
  let offset = 0;
  const orderBy = pk.length && pk.every((p) => sNames.has(p)) ? `order by ${pk.map(qi).join(', ')}` : '';

  while (offset < total) {
    let batch;
    if (RPC) {
      batch = rpcRows.slice(offset, offset + BATCH).map((r) => ({ ...r }));
      offset += BATCH;
      if (batch.length === 0) break;
    } else {
      const { rows } = await src.query(
        `select to_jsonb(t) j from (select ${selectCols} from ${ref(schema, table)} ${orderBy} limit ${BATCH} offset ${offset}) t`,
      );
      if (rows.length === 0) break;
      offset += rows.length;
      batch = rows.map((r) => r.j);
    }
    if (hasTenant) batch = batch.map((r) => ({ ...r, tenant_id: TENANT_ID }));
    if (schema === 'public') batch.forEach((r) => { remapJT(r); remapStage(r); });
    if (skipInsert) {
      // only insert source types/stages that have NO match in the target
      const map = table === 'crm_job_types' ? remaps.jobTypeMap : remaps.stageMap;
      batch = batch.filter((r) => !map.has(r.id));
      if (batch.length === 0) continue;
    }

    try {
      await dst.query('savepoint b');
      await dst.query(sql, [JSON.stringify(batch)]);
      await dst.query('release savepoint b');
      done += batch.length;
      process.stdout.write(`     ${table}: ${done}/${total}
`);
    } catch (e) {
      await dst.query('rollback to savepoint b');
      for (const row of batch) { // isolate the bad rows
        try {
          await dst.query('savepoint r');
          await dst.query(sql, [JSON.stringify([row])]);
          await dst.query('release savepoint r');
          done++;
        } catch (e2) {
          await dst.query('rollback to savepoint r');
          failed++;
          if (errors.length < 3) errors.push(`${e2.message} (id=${row.id ?? '?'})`);
        }
      }
    }
  }
  return { total, existing, done, failed, errors };
}

async function main() {
  if (src) {
    await src.connect();
    await src.query('set default_transaction_read_only = on'); // source can never be written
  }
  await dst.connect();
  console.log(`${DRY ? '[DRY RUN] ' : ''}tenant_id = ${TENANT_ID}`);

  const tT = await listTables(dst, 'public');
  const sT = RPC ? tT : await listTables(src, 'public'); // RPC mode: try every target table
  let tables = [...sT].filter((t) => tT.has(t) && !SKIP.has(t)).sort();
  if (ONLY) tables = tables.filter((t) => ONLY.includes(t));
  const missingInTarget = [...sT].filter((t) => !tT.has(t) && !SKIP.has(t));

  const targets = tables.map((t) => ['public', t]);
  if (WITH_AUTH && !RPC) targets.unshift(['auth', 'users'], ['auth', 'identities']);

  const remaps = await buildRemaps();
  console.log(`job-type map: ${remaps.jobTypeMap.size}, stage map: ${remaps.stageMap.size}`);

  let totalRows = 0, totalDone = 0, totalFailed = 0;
  for (const [schema, table] of targets) {
    try {
      if (!DRY) {
        await dst.query('begin');
        await dst.query('set local session_replication_role = replica');
        await dst.query("set local lock_timeout = '20s'"); // fail loudly instead of hanging on a locked table
      }
      const r = await copyTable(schema, table, remaps);
      if (!DRY) await dst.query('commit');
      totalRows += r.total; totalDone += r.done; totalFailed += r.failed;
      const tag = r.failed ? 'WARN' : 'ok  ';
      if (r.total > 0 || r.existing > 0)
        console.log(`${tag} ${schema}.${table}: source=${r.total} target_before=${r.existing} copied=${r.done} failed=${r.failed}`);
      (r.errors ?? []).forEach((m) => console.log(`       ${m}`));
    } catch (e) {
      console.log(`${RPC && /source RPC refused/.test(e.message) ? 'SKIP' : 'FAIL'} ${schema}.${table}: ${e.message}`);
      if (!DRY) await dst.query('rollback');
    }
  }

  console.log(`\nDone. source rows=${totalRows} copied=${totalDone} failed=${totalFailed}`);
  if (missingInTarget.length) console.log(`Tables only in Truficient (not copied): ${missingInTarget.join(', ')}`);
  if (!WITH_AUTH) console.log('Tip: re-run with --with-auth to also copy logins (auth.users) so user_id columns resolve.');
  if (src) await src.end();
  await dst.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await dst.query('rollback'); } catch {}
  process.exit(1);
});
