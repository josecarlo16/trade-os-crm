import { supabase } from "@/integrations/supabase/client";

interface TrackButtonClickParams {
  buttonName: string;
  buttonLocation: string;
  destinationUrl?: string;
}

export const useButtonTracking = () => {
  const trackButtonClick = async ({
    buttonName,
    buttonLocation,
    destinationUrl,
  }: TrackButtonClickParams) => {
    try {
      await supabase.from("button_clicks").insert({
        button_name: buttonName,
        button_location: buttonLocation,
        destination_url: destinationUrl || null,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
      });
    } catch (error) {
      // Silently fail - tracking should never break the user experience
      console.error("Failed to track button click:", error);
    }
  };

  return { trackButtonClick };
};
