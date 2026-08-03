CREATE TABLE IF NOT EXISTS public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  hero_eyebrow text,
  hero_heading text NOT NULL,
  hero_subheading text,
  hero_image text,
  intro_html text NOT NULL,
  what_we_cover jsonb,
  faqs jsonb,
  cta_heading text,
  cta_body text,
  cta_button_label text,
  cta_button_href text,
  related_post_categories text[],
  related_service_links jsonb,
  display_order int DEFAULT 0,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS blog_categories_set_updated_at ON public.blog_categories;
CREATE TRIGGER blog_categories_set_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published categories"
  ON public.blog_categories FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authenticated users can view all categories"
  ON public.blog_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON public.blog_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON public.blog_categories FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete categories"
  ON public.blog_categories FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS blog_categories_slug_idx ON public.blog_categories (slug);
CREATE INDEX IF NOT EXISTS blog_categories_status_idx ON public.blog_categories (status);