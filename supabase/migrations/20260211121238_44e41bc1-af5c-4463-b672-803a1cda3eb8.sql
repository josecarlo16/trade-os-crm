
-- Fix gallery-images policies to include super_admin and manager
DROP POLICY "Admins can upload gallery images" ON storage.objects;
CREATE POLICY "Admins can upload gallery images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery-images' AND has_role(auth.uid(), 'admin'::app_role) OR bucket_id = 'gallery-images' AND has_role(auth.uid(), 'super_admin'::app_role) OR bucket_id = 'gallery-images' AND has_role(auth.uid(), 'manager'::app_role));

DROP POLICY "Admins can update gallery images" ON storage.objects;
CREATE POLICY "Admins can update gallery images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'gallery-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY "Admins can delete gallery images" ON storage.objects;
CREATE POLICY "Admins can delete gallery images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gallery-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Fix ductless-images policies
DROP POLICY "Admins can upload ductless images" ON storage.objects;
CREATE POLICY "Admins can upload ductless images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ductless-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY "Admins can update ductless images" ON storage.objects;
CREATE POLICY "Admins can update ductless images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ductless-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY "Admins can delete ductless images" ON storage.objects;
CREATE POLICY "Admins can delete ductless images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ductless-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Fix price-books policies
DROP POLICY "Admins can upload price book files" ON storage.objects;
CREATE POLICY "Admins can upload price book files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'price-books' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY "Admins can view price book files" ON storage.objects;
CREATE POLICY "Admins can view price book files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'price-books' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY "Admins can delete price book files" ON storage.objects;
CREATE POLICY "Admins can delete price book files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'price-books' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Fix resumes policies
DROP POLICY "Admins can view resumes" ON storage.objects;
CREATE POLICY "Admins can view resumes" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resumes' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

DROP POLICY "Admins can delete resumes" ON storage.objects;
CREATE POLICY "Admins can delete resumes" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resumes' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
