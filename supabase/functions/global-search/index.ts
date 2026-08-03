import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  route: string;
  entity_type: string;
  badge?: string;
  badge_color?: string;
  snippet?: string;
}

function extractSnippet(text: string | null, query: string, maxLength = 120): string {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLength);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const role = roleData?.role;
    if (!["super_admin", "admin", "manager"].includes(role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ results: {}, total_count: 0, query: query || "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const q = query.trim();

    const [
      customersRes, locationsRes, jobsRes, pipelineRes,
      interactionsRes, ductlessRes, ductedRes, appointmentsRes,
      contactsRes, scansRes,
    ] = await Promise.all([
      supabase
        .from("crm_customers")
        .select("id, first_name, last_name, email, phone, customer_status")
        .is("deleted_at", null)
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("crm_locations")
        .select("id, customer_id, address_line1, city, state, zip_code, square_footage, crm_customers(first_name, last_name)")
        .or(`address_line1.ilike.%${q}%,city.ilike.%${q}%,zip_code.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("crm_jobs")
        .select("id, job_number, customer_id, crm_customers(first_name, last_name), crm_job_types(name), scheduled_date, notes")
        .or(`job_number.ilike.%${q}%,notes.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("crm_pipeline_entries")
        .select("id, customer_id, notes, estimated_value, crm_customers(first_name, last_name), crm_pipeline_stages(display_name, color)")
        .or(`notes.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("crm_interactions")
        .select("id, customer_id, interaction_type, content, created_at, crm_customers(first_name, last_name)")
        .or(`content.ilike.%${q}%,outcome.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("ductless_estimate_submissions")
        .select("id, customer_name, customer_email, customer_address, final_total, created_at, status")
        .or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_address.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("ducted_estimate_submissions")
        .select("id, customer_name, customer_email, customer_address, final_total, created_at")
        .or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_address.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("crm_job_appointments")
        .select("id, job_id, start_datetime, end_datetime, notes, title, crm_jobs(job_number, customer_id, crm_customers(first_name, last_name))")
        .or(`notes.ilike.%${q}%,title.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("contact_submissions")
        .select("id, first_name, last_name, email, phone, message, created_at, status")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,message.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("equipment_scans")
        .select("id, email, brand, model_number, zip_code, customer_name, created_at, status")
        .or(`email.ilike.%${q}%,brand.ilike.%${q}%,model_number.ilike.%${q}%,zip_code.ilike.%${q}%,customer_name.ilike.%${q}%`)
        .limit(5),
    ]);

    const trimName = (first?: string, last?: string) =>
      `${(first || "").trim()} ${(last || "").trim()}`.trim() || "Unnamed";

    const customers: SearchResult[] = (customersRes.data || []).map((c: any) => ({
      id: c.id,
      label: trimName(c.first_name, c.last_name),
      sublabel: c.email || c.phone || "",
      route: `/admin/customers/${c.id}`,
      entity_type: "customer",
      badge: c.customer_status,
      badge_color: c.customer_status === "active" ? "green" : c.customer_status === "prospect" ? "blue" : "gray",
      snippet: extractSnippet(c.email || c.phone || "", q),
    }));

    const locations: SearchResult[] = (locationsRes.data || []).map((l: any) => {
      const cust = l.crm_customers;
      const custName = cust ? trimName(cust.first_name, cust.last_name) : "";
      const sqft = l.square_footage ? `${l.square_footage.toLocaleString()} sqft` : "";
      return {
        id: l.id,
        label: [l.address_line1, l.city, l.state].filter(Boolean).join(", "),
        sublabel: [custName, sqft].filter(Boolean).join(" · "),
        route: `/admin/customers/${l.customer_id}?tab=locations`,
        entity_type: "location",
        snippet: extractSnippet(l.address_line1, q),
      };
    });

    const jobs: SearchResult[] = (jobsRes.data || []).map((j: any) => {
      const cust = j.crm_customers;
      const custName = cust ? trimName(cust.first_name, cust.last_name) : "";
      const jobType = j.crm_job_types?.name || "";
      return {
        id: j.id,
        label: `${j.job_number || "Job"} · ${jobType}`,
        sublabel: custName + (j.scheduled_date ? ` · ${j.scheduled_date}` : ""),
        route: `/admin/jobs/${j.id}`,
        entity_type: "job",
        snippet: extractSnippet(j.notes, q),
      };
    });

    const pipeline: SearchResult[] = (pipelineRes.data || []).map((p: any) => {
      const cust = p.crm_customers;
      const custName = cust ? trimName(cust.first_name, cust.last_name) : "";
      const stage = p.crm_pipeline_stages?.display_name || "";
      return {
        id: p.id,
        label: custName || "Pipeline Entry",
        sublabel: `${stage}${p.estimated_value ? ` · $${Number(p.estimated_value).toLocaleString()}` : ""}`,
        route: `/admin/pipeline?highlight=${p.id}`,
        entity_type: "pipeline",
        badge: stage,
        badge_color: p.crm_pipeline_stages?.color || "gray",
        snippet: extractSnippet(p.notes, q),
      };
    });

    const interactions: SearchResult[] = (interactionsRes.data || []).map((i: any) => {
      const cust = i.crm_customers;
      const custName = cust ? trimName(cust.first_name, cust.last_name) : "";
      return {
        id: i.id,
        label: `${i.interaction_type || "Interaction"} — ${custName}`,
        sublabel: new Date(i.created_at).toLocaleDateString(),
        route: `/admin/customers/${i.customer_id}?tab=activity`,
        entity_type: "interaction",
        snippet: extractSnippet(i.content, q),
      };
    });

    const estimates: SearchResult[] = [
      ...(ductlessRes.data || []).map((d: any) => ({
        id: d.id,
        label: d.customer_name || "Ductless Estimate",
        sublabel: `Ductless · ${d.final_total ? "$" + Number(d.final_total).toLocaleString() : ""}`,
        route: `/admin/submissions/ductless/${d.id}`,
        entity_type: "estimate",
        badge: d.status || "new",
        snippet: extractSnippet(d.customer_address, q),
      })),
      ...(ductedRes.data || []).map((d: any) => ({
        id: d.id,
        label: d.customer_name || "Ducted Estimate",
        sublabel: `Ducted · ${d.final_total ? "$" + Number(d.final_total).toLocaleString() : ""}`,
        route: `/admin/submissions/ducted/${d.id}`,
        entity_type: "estimate",
        badge: "new",
        snippet: extractSnippet(d.customer_address, q),
      })),
    ].slice(0, 5);

    const appointments: SearchResult[] = (appointmentsRes.data || []).map((a: any) => {
      const job = a.crm_jobs;
      const cust = job?.crm_customers;
      const custName = cust ? trimName(cust.first_name, cust.last_name) : "";
      return {
        id: a.id,
        label: `${job?.job_number || "Appointment"} · ${custName}`,
        sublabel: a.start_datetime ? new Date(a.start_datetime).toLocaleDateString() : "",
        route: `/admin/jobs/${a.job_id}`,
        entity_type: "appointment",
        snippet: extractSnippet(a.notes || a.title, q),
      };
    });

    const contacts: SearchResult[] = (contactsRes.data || []).map((c: any) => ({
      id: c.id,
      label: trimName(c.first_name, c.last_name),
      sublabel: c.email || c.phone || "",
      route: `/admin/submissions?highlight=${c.id}`,
      entity_type: "contact",
      badge: c.status || "new",
      snippet: extractSnippet(c.message, q),
    }));

    const scans: SearchResult[] = (scansRes.data || []).map((s: any) => ({
      id: s.id,
      label: s.customer_name || s.email || "Equipment Scan",
      sublabel: [s.brand, s.model_number].filter(Boolean).join(" · "),
      route: `/admin/scanner-analytics?highlight=${s.id}`,
      entity_type: "scan",
      badge: s.status || "new",
      snippet: extractSnippet(s.model_number, q),
    }));

    const allResults = { customers, locations, jobs, pipeline, interactions, estimates, appointments, contacts, scans };
    const total_count = Object.values(allResults).reduce((sum, arr) => sum + arr.length, 0);

    return new Response(
      JSON.stringify({ results: allResults, total_count, query: q }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Global search error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
