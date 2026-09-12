-- Schedules the WorkEdge daily-sync fallback to actually run.
--
-- The `workedge-sync` edge function already has a `daily-sync` action that
-- fans out across every tenant with an active WorkEdge connection (see
-- supabase/functions/workedge-sync/index.ts), but nothing was ever calling
-- it — it only ran if someone invoked it by hand. This is the safety-net
-- half of "no double entry": the real-time path is the workedge-webhook
-- function, this cron job is what catches anything a webhook missed (missed
-- delivery, webhook not yet configured for a tenant, etc).
--
-- pg_cron / pg_net are already enabled by migration
-- 20260213024813_f76e0914-eb20-4dad-bd51-32a163bd6473.sql.

select
  cron.schedule(
    'workedge-daily-sync',
    '0 9 * * *', -- 9am UTC daily
    $$
    select net.http_post(
      url := 'https://cnnwcjmyfxmqspjinsva.supabase.co/functions/v1/workedge-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'sb_publishable_vXjovlRlIkC-6qu3p7-aSg_CpVD8CuC'
      ),
      body := jsonb_build_object('action', 'daily-sync')
    ) as request_id;
    $$
  );
