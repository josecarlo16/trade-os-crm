
-- Storage policies for knowledge-base bucket
CREATE POLICY "KB media readable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'knowledge-base');

CREATE POLICY "KB media insert by admins"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-base'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "KB media update by admins"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'knowledge-base'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "KB media delete by admins"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'knowledge-base'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()))
);

-- Seed ai_config row for knowledge_base translation
INSERT INTO public.ai_config (config_key, provider, model, temperature, max_tokens, system_prompt, is_active)
VALUES (
  'knowledge_base',
  'lovable',
  'google/gemini-2.5-flash',
  0.2,
  4000,
  'You are a professional HVAC technical translator. Translate English content to Mexican Spanish faithfully, preserving markdown formatting, code, model numbers, part numbers, brand names, and technical terms verbatim. Maintain a clear, instructional tone suitable for field technicians.',
  true
)
ON CONFLICT (config_key) DO NOTHING;
