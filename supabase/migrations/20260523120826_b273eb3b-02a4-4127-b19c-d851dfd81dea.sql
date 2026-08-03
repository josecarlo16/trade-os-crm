
ALTER TABLE public.crm_pipeline_entries ADD COLUMN IF NOT EXISTS title text;

INSERT INTO public.crm_pipeline_stages (name, display_name, sort_order, color, is_active, is_won_stage, is_lost_stage)
SELECT 'existing_customer', 'Existing Customer', 0, '#A5A983', true, false, false
WHERE NOT EXISTS (SELECT 1 FROM public.crm_pipeline_stages WHERE name = 'existing_customer');
