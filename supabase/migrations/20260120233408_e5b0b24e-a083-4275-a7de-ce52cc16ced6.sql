-- Add SEO enhancement columns to blog_posts table
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS focus_keyword TEXT,
ADD COLUMN IF NOT EXISTS featured_image_alt TEXT,
ADD COLUMN IF NOT EXISTS noindex BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS canonical_url TEXT,
ADD COLUMN IF NOT EXISTS author_name TEXT,
ADD COLUMN IF NOT EXISTS author_bio TEXT,
ADD COLUMN IF NOT EXISTS og_title TEXT,
ADD COLUMN IF NOT EXISTS og_description TEXT,
ADD COLUMN IF NOT EXISTS og_image TEXT;

-- Create index on focus_keyword for potential future keyword analysis
CREATE INDEX IF NOT EXISTS idx_blog_posts_focus_keyword ON public.blog_posts(focus_keyword);

-- Create index on noindex for filtering indexed posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_noindex ON public.blog_posts(noindex);