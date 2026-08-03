-- Add public SELECT policy for active ducted equipment
-- This allows anonymous users to view equipment for the estimator pricing
CREATE POLICY "Anyone can view active ducted equipment" 
ON public.ducted_equipment
FOR SELECT
USING (is_active = true);