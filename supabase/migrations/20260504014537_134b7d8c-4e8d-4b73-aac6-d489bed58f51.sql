-- Drop existing public SELECT policy
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tracking_settings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tracking_settings', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.tracking_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only direct access
CREATE POLICY "Admins can view tracking settings"
ON public.tracking_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert tracking settings"
ON public.tracking_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update tracking settings"
ON public.tracking_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete tracking settings"
ON public.tracking_settings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Public-safe accessor: returns only ENABLED tracking IDs needed for runtime injection.
-- Pixel/GA IDs are inherently exposed in browser network calls once scripts load,
-- so returning them via this controlled surface is equivalent in exposure but
-- prevents arbitrary enumeration of the table.
CREATE OR REPLACE FUNCTION public.get_public_tracking_settings()
RETURNS TABLE(setting_key text, setting_value text, is_enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setting_key, setting_value, is_enabled
  FROM public.tracking_settings
  WHERE is_enabled = true
    AND setting_key IN ('meta_pixel_id', 'ga_measurement_id', 'ghl_chat_widget_id');
$$;

GRANT EXECUTE ON FUNCTION public.get_public_tracking_settings() TO anon, authenticated;