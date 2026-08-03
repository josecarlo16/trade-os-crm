import { supabase } from '@/integrations/supabase/client';

export const trackSocialLinkClick = async (
  platform: string,
  source: 'footer' | 'testimonials' | 'unknown' = 'unknown',
  socialLinkId?: string
) => {
  try {
    await supabase.from('social_link_clicks').insert({
      platform,
      source,
      social_link_id: socialLinkId || null,
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
    });
  } catch (error) {
    // Silently fail - don't interrupt user experience for analytics
    console.error('Failed to track click:', error);
  }
};
