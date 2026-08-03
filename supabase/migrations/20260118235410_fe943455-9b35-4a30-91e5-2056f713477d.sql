-- Drop the public access policy that exposes pricing to competitors
DROP POLICY IF EXISTS "Anyone can view active ducted equipment" ON public.ducted_equipment;

-- Keep authenticated users able to view active equipment for the estimator
-- But now pricing is hidden from unauthenticated public users
-- The "Authenticated users can view all ducted equipment" policy already covers this

-- Actually, let's be more restrictive - only authenticated users should see active equipment
-- Drop and recreate to ensure proper access control
DROP POLICY IF EXISTS "Authenticated users can view all ducted equipment" ON public.ducted_equipment;

-- Authenticated users can only view active equipment (for the estimator tool)
CREATE POLICY "Authenticated users can view active ducted equipment"
ON public.ducted_equipment
FOR SELECT
USING (
  auth.role() = 'authenticated' AND is_active = true
);