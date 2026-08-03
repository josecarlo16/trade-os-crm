-- Fix RLS policy for ducted_estimate_submissions to allow anonymous inserts
DROP POLICY IF EXISTS "Anyone can submit ducted estimates" ON public.ducted_estimate_submissions;

CREATE POLICY "Public can submit ducted estimates" 
ON public.ducted_estimate_submissions 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);