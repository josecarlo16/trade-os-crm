ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS landing_page text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS attribution_captured_at timestamptz;

ALTER TABLE public.landing_page_submissions
  ADD COLUMN IF NOT EXISTS landing_page text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS attribution_captured_at timestamptz;

CREATE OR REPLACE VIEW public.lead_attribution
WITH (security_invoker = true) AS
SELECT
  cs.*,
  CASE
    WHEN cs.gclid IS NOT NULL OR lower(cs.utm_medium) IN ('cpc','ppc','paid','sem') THEN 'Paid Search'
    WHEN cs.fbclid IS NOT NULL OR lower(cs.utm_source) IN ('facebook','fb','instagram','meta') THEN 'Paid Social'
    WHEN cs.utm_source IS NOT NULL THEN 'Campaign: ' || cs.utm_source
    WHEN cs.referrer ILIKE '%google.%' OR cs.referrer ILIKE '%bing.%' OR cs.referrer ILIKE '%duckduckgo.%' OR cs.referrer ILIKE '%yahoo.%' THEN 'Organic Search'
    WHEN cs.referrer IS NULL OR btrim(cs.referrer) = '' THEN 'Direct'
    ELSE 'Referral'
  END AS channel
FROM public.contact_submissions cs;

GRANT SELECT ON public.lead_attribution TO authenticated;

CREATE OR REPLACE VIEW public.lead_search_queries
WITH (security_invoker = true) AS
SELECT
  la.id AS lead_id,
  la.landing_page,
  q.page,
  q.query,
  q.clicks,
  q.impressions,
  q.ctr,
  q.position,
  q.date_range,
  q.rn AS rank
FROM public.lead_attribution la
JOIN LATERAL (
  SELECT g.*, row_number() OVER (ORDER BY g.clicks DESC) AS rn
  FROM public.gsc_page_query_metrics g
  WHERE rtrim(split_part(COALESCE(g.page, ''), '?', 1), '/')
      = rtrim(split_part(COALESCE(la.landing_page, ''), '?', 1), '/')
) q ON q.rn <= 5
WHERE la.channel = 'Organic Search'
  AND la.landing_page IS NOT NULL;

GRANT SELECT ON public.lead_search_queries TO authenticated;