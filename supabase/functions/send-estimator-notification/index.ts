import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTIFICATION_EMAIL = 'estimator@truficient.com';

interface NotificationData {
  estimatorType: 'ducted' | 'ductless';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  quoteTotal: string;
  quoteDetails: string;
  submittedAt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: NotificationData = await req.json();
    console.log('Sending estimator notification for:', data.customerEmail);

    // Log the notification for tracking
    console.log('Notification processed:', {
      email: data.customerEmail,
      type: data.estimatorType,
      total: data.quoteTotal,
      notificationTarget: NOTIFICATION_EMAIL,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification processed for ${data.customerEmail}`,
        notificationEmail: NOTIFICATION_EMAIL,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send notification';
    console.error('Error sending notification:', errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
