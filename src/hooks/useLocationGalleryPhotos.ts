import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GalleryPhoto {
  id: string;
  title: string;
  image_url: string;
  alt_text: string | null;
  photo_date: string | null;
  score?: number;
}

interface UseLocationGalleryPhotosParams {
  geographyTag?: string | null;
  zipTag?: string | null;
  cityTag?: string | null;
  serviceTags?: string[] | null;
  propertyTags?: string[] | null;
}

export function useLocationGalleryPhotos({
  geographyTag,
  zipTag,
  cityTag,
  serviceTags,
  propertyTags,
}: UseLocationGalleryPhotosParams) {
  return useQuery({
    queryKey: ['location-gallery', geographyTag, zipTag, cityTag, serviceTags, propertyTags],
    queryFn: async (): Promise<GalleryPhoto[]> => {
      const { data: approvedImages, error } = await supabase
        .from('gallery_images')
        .select(`
          id, title, image_url, alt_text, photo_date, media_type,
          gallery_image_tags ( tag_id, gallery_tags ( name, slug, tag_type ) )
        `)
        .eq('approved_for_website', true)
        .eq('is_active', true)
        .neq('media_type', 'video')
        .order('photo_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!approvedImages || approvedImages.length === 0) return [];

      const scored = (approvedImages as any[]).map((img) => {
        const imgTags = (img.gallery_image_tags || []).map((rel: any) => ({
          name: rel.gallery_tags?.name?.toLowerCase() || '',
          slug: rel.gallery_tags?.slug || '',
          type: rel.gallery_tags?.tag_type || '',
        }));

        let score = 0;

        if (geographyTag && imgTags.some((t: any) => t.slug === geographyTag.toLowerCase() || t.name === geographyTag.toLowerCase())) {
          score += 100;
        }
        if (zipTag && imgTags.some((t: any) => t.slug === zipTag || t.name === zipTag)) {
          score += 50;
        }
        if (cityTag && imgTags.some((t: any) => t.slug === cityTag.toLowerCase() || t.name === cityTag.toLowerCase())) {
          score += 25;
        }
        if (serviceTags?.length) {
          const serviceMatches = serviceTags.filter(st =>
            imgTags.some((t: any) => t.slug === st.toLowerCase().replace(/\s+/g, '-') || t.name === st.toLowerCase())
          );
          score += serviceMatches.length * 30;
        }
        if (propertyTags?.length) {
          const propMatches = propertyTags.filter(pt =>
            imgTags.some((t: any) => t.slug === pt.toLowerCase().replace(/\s+/g, '-') || t.name === pt.toLowerCase())
          );
          score += propMatches.length * 10;
        }

        if (score === 0) score = 1;

        return { ...img, score } as GalleryPhoto & { score: number };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 12);
    },
  });
}

export type { GalleryPhoto };
