-- Create blog_tags table for reusable tags
CREATE TABLE public.blog_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;

-- Anyone can view tags
CREATE POLICY "Anyone can view blog tags" 
ON public.blog_tags 
FOR SELECT 
USING (true);

-- Admins can manage tags
CREATE POLICY "Admins can manage blog tags" 
ON public.blog_tags 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing tags from blog_posts
INSERT INTO public.blog_tags (name)
SELECT DISTINCT unnest(tags) AS name
FROM public.blog_posts
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
ON CONFLICT (name) DO NOTHING;

-- Create author_profiles table
CREATE TABLE public.author_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view author profiles
CREATE POLICY "Anyone can view author profiles" 
ON public.author_profiles 
FOR SELECT 
USING (true);

-- Admins can manage author profiles
CREATE POLICY "Admins can manage author profiles" 
ON public.author_profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add author_profile_id to blog_posts
ALTER TABLE public.blog_posts 
ADD COLUMN author_profile_id UUID REFERENCES public.author_profiles(id) ON DELETE SET NULL;

-- Create trigger for updated_at on author_profiles
CREATE TRIGGER update_author_profiles_updated_at
BEFORE UPDATE ON public.author_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing authors: create profiles from unique author_name/author_bio combinations
INSERT INTO public.author_profiles (display_name, bio)
SELECT DISTINCT author_name, author_bio
FROM public.blog_posts
WHERE author_name IS NOT NULL AND author_name != ''
ON CONFLICT DO NOTHING;

-- Update existing posts to link to the new author profiles
UPDATE public.blog_posts bp
SET author_profile_id = ap.id
FROM public.author_profiles ap
WHERE bp.author_name = ap.display_name 
  AND (bp.author_bio = ap.bio OR (bp.author_bio IS NULL AND ap.bio IS NULL))
  AND bp.author_name IS NOT NULL;