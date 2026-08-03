-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all equipment scans" ON public.equipment_scans;
DROP POLICY IF EXISTS "Admins can update equipment scans" ON public.equipment_scans;

-- Allow anyone to insert equipment scans (for the scanner)
CREATE POLICY "Anyone can insert equipment scans" 
ON public.equipment_scans 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update equipment scans by id (for email capture)
CREATE POLICY "Anyone can update equipment scans by id" 
ON public.equipment_scans 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Allow anyone to view equipment scans (for report page)
CREATE POLICY "Anyone can view equipment scans" 
ON public.equipment_scans 
FOR SELECT 
USING (true);