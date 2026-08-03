import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoice_id, amount, customer_email, description, payment_method_id } =
      await req.json();

    if (!invoice_id || !amount || !customer_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: invoice_id, amount, customer_email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountCents = Math.round(amount * 100);
    if (amountCents < 50) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least $0.50" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Stripe PaymentIntent (direct charge — no Connect fees)
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    const STRIPE_PUBLISHABLE_KEY = Deno.env.get("STRIPE_PUBLISHABLE_KEY")!;

    const intentBody: Record<string, string> = {
      amount: amountCents.toString(),
      currency: "usd",
      "receipt_email": customer_email,
      description: description || `Invoice payment - ${invoice_id}`,
      "metadata[invoice_id]": invoice_id,
      "metadata[source]": "truficient_mission_control",
    };

    if (payment_method_id) {
      intentBody["payment_method"] = payment_method_id;
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(intentBody).toString(),
    });

    const intent = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(
        JSON.stringify({ error: intent.error?.message || "Stripe error" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Write payment to Otto Pay database
    const ottopay = createClient(
      Deno.env.get("OTTOPAY_SUPABASE_URL")!,
      Deno.env.get("OTTOPAY_SERVICE_KEY")!
    );

    // Insert payment record
    const { error: paymentError } = await ottopay.from("payment_history").insert({
      invoice_id,
      amount: amount,
      payment_method: "stripe",
      payment_date: new Date().toISOString(),
      transaction_id: intent.id,
      notes: "Processed via Mission Control",
    });

    if (paymentError) {
      console.error("Failed to write payment to Otto Pay:", paymentError);
    }

    // Update invoice total_paid and status
    const { data: invoice, error: invoiceError } = await ottopay
      .from("invoices")
      .select("total, total_paid")
      .eq("id", invoice_id)
      .single();

    if (!invoiceError && invoice) {
      const newTotalPaid = (invoice.total_paid || 0) + amount;
      const newStatus = newTotalPaid >= invoice.total ? "paid" : "partial";

      await ottopay
        .from("invoices")
        .update({ total_paid: newTotalPaid, status: newStatus })
        .eq("id", invoice_id);
    }

    return new Response(
      JSON.stringify({
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
        publishable_key: STRIPE_PUBLISHABLE_KEY,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-invoice-payment error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
