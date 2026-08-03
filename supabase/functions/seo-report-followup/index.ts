// seo-report-followup — Continue a Q&A thread on a saved SEO report
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const report_id: string = typeof body.report_id === "string" ? body.report_id : "";
    const user_message: string = typeof body.user_message === "string" ? body.user_message.trim() : "";

    if (!report_id || !user_message) {
      return new Response(JSON.stringify({ error: "report_id and user_message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the report
    const { data: report, error: reportErr } = await supabase
      .from("seo_reports")
      .select("id, original_prompt, full_response, model_used")
      .eq("id", report_id)
      .maybeSingle();

    if (reportErr || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the existing thread
    const { data: priorMessages } = await supabase
      .from("seo_report_messages")
      .select("role, content")
      .eq("report_id", report_id)
      .order("created_at", { ascending: true });

    // Persist the new user message first
    const { error: userInsertErr } = await supabase.from("seo_report_messages").insert({
      report_id,
      role: "user",
      content: user_message,
    });
    if (userInsertErr) {
      console.error("Failed to insert user message:", userInsertErr);
      return new Response(JSON.stringify({ error: "Failed to save your message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are answering a follow-up question about a previously generated SEO report. The original report is below. Stay focused on this analysis and the data within it. Be concise.

Original prompt: ${report.original_prompt}

Report:
${report.full_response}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(priorMessages ?? []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: user_message },
    ];

    const model = (typeof report.model_used === "string" && report.model_used.includes("/"))
      ? report.model_used
      : "google/gemini-2.5-flash";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? "(no response)";

    const { error: assistantInsertErr } = await supabase.from("seo_report_messages").insert({
      report_id,
      role: "assistant",
      content: reply,
    });
    if (assistantInsertErr) {
      console.warn("Failed to insert assistant message:", assistantInsertErr);
    }

    return new Response(JSON.stringify({ message: reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seo-report-followup error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
