CREATE OR REPLACE FUNCTION public.sync_seo_location_page_to_page_seo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_page_seo_id uuid;
  normalized_page_type text;
BEGIN
  IF NEW.published IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  normalized_page_type := CASE
    WHEN NEW.page_type ILIKE '%neighborhood%' THEN 'Neighborhood Hub'
    WHEN NEW.page_type ILIKE '%brand%' OR NEW.cluster ILIKE 'Brand -%' THEN 'Brand Pillar'
    ELSE 'location'
  END;

  SELECT id INTO existing_page_seo_id
  FROM public.page_seo
  WHERE page_path = NEW.url_slug
  LIMIT 1;

  IF existing_page_seo_id IS NULL THEN
    INSERT INTO public.page_seo (
      page_path,
      page_name,
      meta_title,
      meta_description,
      canonical_url,
      page_type,
      cluster,
      target_keyword,
      schema_applied,
      structured_data,
      robots,
      index_status,
      last_content_update
    ) VALUES (
      NEW.url_slug,
      COALESCE(NULLIF(NEW.h1_title, ''), NULLIF(NEW.neighborhood, ''), NULLIF(NEW.meta_title, ''), NEW.url_slug),
      NEW.meta_title,
      NEW.meta_description,
      'https://truficient.com' || NEW.url_slug,
      normalized_page_type,
      NEW.cluster,
      COALESCE(NULLIF(NEW.h1_title, ''), NULLIF(NEW.neighborhood, ''), NULLIF(NEW.meta_title, '')),
      (NEW.schema_json IS NOT NULL),
      NEW.schema_json,
      'index, follow',
      'Pending',
      now()
    )
    RETURNING id INTO existing_page_seo_id;
  ELSE
    UPDATE public.page_seo
    SET
      page_name = COALESCE(NULLIF(NEW.h1_title, ''), NULLIF(NEW.neighborhood, ''), NULLIF(NEW.meta_title, ''), NEW.url_slug),
      meta_title = NEW.meta_title,
      meta_description = NEW.meta_description,
      canonical_url = 'https://truficient.com' || NEW.url_slug,
      page_type = normalized_page_type,
      cluster = NEW.cluster,
      target_keyword = COALESCE(NULLIF(NEW.h1_title, ''), NULLIF(NEW.neighborhood, ''), NULLIF(NEW.meta_title, '')),
      schema_applied = (NEW.schema_json IS NOT NULL),
      structured_data = NEW.schema_json,
      robots = COALESCE(robots, 'index, follow'),
      last_content_update = now(),
      updated_at = now()
    WHERE id = existing_page_seo_id;
  END IF;

  IF NEW.page_seo_id IS DISTINCT FROM existing_page_seo_id THEN
    NEW.page_seo_id := existing_page_seo_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_seo_location_page_to_page_seo_trigger ON public.seo_location_pages;

CREATE TRIGGER sync_seo_location_page_to_page_seo_trigger
BEFORE INSERT OR UPDATE OF published, url_slug, h1_title, neighborhood, meta_title, meta_description, page_type, cluster, schema_json
ON public.seo_location_pages
FOR EACH ROW
EXECUTE FUNCTION public.sync_seo_location_page_to_page_seo();