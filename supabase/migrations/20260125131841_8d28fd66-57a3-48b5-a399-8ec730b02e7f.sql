-- Change category from TEXT to TEXT[] array to support multiple categories
ALTER TABLE public.blog_posts 
ALTER COLUMN category TYPE TEXT[] USING CASE 
  WHEN category IS NOT NULL THEN ARRAY[category] 
  ELSE '{}'::text[] 
END;