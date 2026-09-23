-- Schedules the lovable-sync edge function to run every 15 minutes, pulling
-- deltas from the old Lovable-managed database until the client fully cuts
-- over. Same pg_net + pg_cron pattern as 20260909120000_workedge_daily_sync_cron.sql.

select
  cron.schedule(
    'lovable-legacy-sync',
    '*/15 * * * *',
    $$
    select net.http_post(
      url := 'https://cnnwcjmyfxmqspjinsva.supabase.co/functions/v1/lovable-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'sb_publishable_vXjovlRlIkC-6qu3p7-aSg_CpVD8CuC'
      ),
      body := '{}'::jsonb
    ) as request_id;
    $$
  );
