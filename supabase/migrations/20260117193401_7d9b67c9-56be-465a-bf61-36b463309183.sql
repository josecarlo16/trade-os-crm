-- Add sort_order column to labor_rates table for drag-and-drop reordering
ALTER TABLE public.labor_rates ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Initialize sort_order based on existing order (by rate_type, then name)
WITH ordered_rates AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY rate_type, name) as rn
  FROM public.labor_rates
)
UPDATE public.labor_rates lr
SET sort_order = or_rates.rn
FROM ordered_rates or_rates
WHERE lr.id = or_rates.id;