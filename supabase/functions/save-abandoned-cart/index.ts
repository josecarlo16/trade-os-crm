import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data = await req.json();
    
    // Detect estimator type (default to ducted for backwards compatibility)
    const estimatorType = data.estimator_type || "ducted";
    const isDuctless = estimatorType === "ductless";
    
    console.log(`Received ${estimatorType} abandoned cart data:`, JSON.stringify(data, null, 2));

    // Validate required fields - need at least email OR phone
    const hasEmail = data.customer_email?.trim()?.length > 0;
    const hasPhone = data.customer_phone?.replace(/\D/g, '')?.length >= 10;
    
    if (!hasEmail && !hasPhone) {
      return new Response(
        JSON.stringify({ error: "At least email or phone is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let submissionId: string;

    if (isDuctless) {
      // ========== DUCTLESS SUBMISSION ==========
      const ductlessData = {
        customer_name: data.customer_name || null,
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone || null,
        customer_address: data.customer_address || null,
        customer_city: data.customer_city || null,
        customer_county: data.customer_county || null,
        customer_state: data.customer_state || null,
        customer_zip: data.customer_zip || null,
        google_place_id: data.google_place_id || null,
        notes: data.notes || null,
        selected_rooms: data.selected_rooms || null,
        zone_count: data.zone_count || 0,
        unit_type_id: data.unit_type_id || null,
        system_tier_id: data.system_tier_id || null,
        selected_addons: data.selected_addons || null,
        subtotal: data.subtotal || 0,
        tax_amount: data.tax_amount || 0,
        rebates: data.rebates || 0,
        final_total: data.final_total || 0,
        status: "partial",
      };

      if (data.partial_submission_id) {
        // Update existing
        const { error } = await supabaseAdmin
          .from('ductless_estimate_submissions')
          .update(ductlessData)
          .eq('id', data.partial_submission_id);

        if (error) {
          console.error("Ductless update error:", error);
          throw error;
        }
        submissionId = data.partial_submission_id;
        console.log("Updated ductless partial submission:", submissionId);
      } else {
        // Insert new
        const { data: insertedData, error } = await supabaseAdmin
          .from('ductless_estimate_submissions')
          .insert(ductlessData)
          .select('id')
          .single();

        if (error) {
          console.error("Ductless insert error:", error);
          throw error;
        }
        submissionId = insertedData.id;
        console.log("Created ductless partial submission:", submissionId);
      }
    } else {
      // ========== DUCTED SUBMISSION ==========
      const ductedData = {
        customer_name: data.customer_name || "",
        customer_email: data.customer_email || "",
        customer_phone: data.customer_phone || null,
        customer_address: data.customer_address || null,
        best_time_to_call: data.best_time_to_call || null,
        home_type: data.home_type || "single_family",
        home_layout: data.home_layout || "1_story",
        square_footage: data.square_footage || "1600_2000",
        hot_cold_spots: data.hot_cold_spots || null,
        winter_temp: data.winter_temp || null,
        summer_temp: data.summer_temp || null,
        heating_type: data.heating_type || "gas_system",
        coverage: data.coverage || "entire_home",
        system_count: data.system_count || 1,
        status: "partial",
      };

      if (data.partial_submission_id) {
        // Update existing
        const { error } = await supabaseAdmin
          .from('ducted_estimate_submissions')
          .update(ductedData)
          .eq('id', data.partial_submission_id);

        if (error) {
          console.error("Ducted update error:", error);
          throw error;
        }
        submissionId = data.partial_submission_id;
        console.log("Updated ducted partial submission:", submissionId);
      } else {
        // Insert new
        const { data: insertedData, error } = await supabaseAdmin
          .from('ducted_estimate_submissions')
          .insert(ductedData)
          .select('id')
          .single();

        if (error) {
          console.error("Ducted insert error:", error);
          throw error;
        }
        submissionId = insertedData.id;
        console.log("Created ducted partial submission:", submissionId);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: submissionId, 
        estimator_type: estimatorType,
        action: data.partial_submission_id ? "updated" : "created" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error saving abandoned cart:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
