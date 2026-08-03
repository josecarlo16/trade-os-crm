-- Add policy to allow authenticated users to update contact submissions
CREATE POLICY "Authenticated users can update submissions"
ON contact_submissions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add policy to allow admins to delete contact submissions
CREATE POLICY "Admins can delete submissions"
ON contact_submissions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));