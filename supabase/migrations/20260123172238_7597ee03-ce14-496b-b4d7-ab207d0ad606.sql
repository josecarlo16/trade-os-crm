-- Allow public/anonymous users to view active financing options
-- This is necessary for the estimators to display financing plans to visitors
CREATE POLICY "Public can view active financing options"
ON public.financing_options
FOR SELECT
TO anon
USING (is_active = true);