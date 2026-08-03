// Harold API — External read/write API for Open Claw assistant
// Authenticates via HAROLD_API_TOKEN, proxies to Bach (ai-assistant) with full super_admin access

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // Authenticate with Harold's API token
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const expectedToken = Deno.env.get("HAROLD_API_TOKEN");

    if (!token || !expectedToken || token !== expectedToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // GET /harold-api/health
    if (req.method === "GET" && path === "health") {
      return new Response(JSON.stringify({ status: "ok", assistant: "bach", version: "1.0" }), { headers });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), { status: 405, headers });
    }

    const body = await req.json();

    // Route: POST /harold-api — chat with Bach
    // Body: { message: string, conversationHistory?: array, context?: object }
    const { message, conversationHistory = [], context } = body;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message (string) is required" }), { status: 400, headers });
    }

    // Build internal request to ai-assistant using service role (full access)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // We call the ai-assistant function directly via HTTP with service role auth
    // But ai-assistant expects a user session — so we'll inline the logic instead
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Import the AI config
    const { data: aiConfigData } = await serviceClient
      .from("ai_config")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const aiConfig = {
      provider: aiConfigData?.provider || "x-ai",
      model: aiConfigData?.model || "grok-3-mini",
      system_prompt: aiConfigData?.system_prompt || null,
      temperature: aiConfigData?.temperature ?? 0.3,
      max_tokens: aiConfigData?.max_tokens ?? 4096,
      api_key_secret_name: aiConfigData?.api_key_secret_name || "XAI_API_KEY",
    };

    // Build system prompt (simplified version for API access)
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "America/Chicago",
    });

    const systemPrompt = (aiConfig.system_prompt || getDefaultSystemPrompt(today)) +
      `\n\nAPI CONTEXT: This request comes from Harold (Open Claw assistant). Harold has full read/write access. Treat all requests as authorized super_admin operations. Be direct and data-focused in responses — Harold will reformat for end users.` +
      (context ? `\n\nADDITIONAL CONTEXT:\n${JSON.stringify(context)}` : "");

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-20).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    // Get tools (we need to dynamically import from ai-assistant — instead, call it via fetch)
    // Simplest approach: invoke the ai-assistant edge function with service role
    const assistantUrl = `${supabaseUrl}/functions/v1/ai-assistant`;
    
    // Create a temporary admin user session or use service role
    // Since ai-assistant requires auth.getUser(), we need to pass a valid session
    // Instead, we'll call the function with the service role key as the bearer token
    // and the function will need to handle this — BUT the current function uses getUser()
    
    // Better approach: call the edge function and let it handle everything
    // We need to pass service role key which will bypass getUser check
    // Actually getUser with service role won't work — let's use a direct approach
    
    // Direct approach: Call the AI provider directly with the tools, same as ai-assistant does
    const { provider, model, temperature, max_tokens, api_key_secret_name } = aiConfig;
    
    // Get the tools definitions
    const toolDefs = getToolDefinitions();
    
    // Call AI
    const aiResponse = await callAIProvider(provider, model, temperature, max_tokens, api_key_secret_name, messages, toolDefs);
    
    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return new Response(JSON.stringify({ error: "AI provider error", details: errText }), { status: 502, headers });
    }

    const aiData = await aiResponse.json();
    let toolsUsed: any[] = [];
    let finalResponse = "";
    let maxIterations = 10;
    let currentMessages = [...messages];

    // Tool execution loop
    while (maxIterations > 0) {
      maxIterations--;

      const choice = aiData.choices?.[0] || (maxIterations === 9 ? aiData : null);
      const msg = aiData.choices?.[0]?.message;

      if (!msg?.tool_calls || msg.tool_calls.length === 0) {
        finalResponse = msg?.content || aiData.choices?.[0]?.message?.content || "";
        break;
      }

      currentMessages.push(msg);

      for (const toolCall of msg.tool_calls) {
        const toolName = toolCall.function.name;
        let toolInput: any;
        try {
          toolInput = JSON.parse(toolCall.function.arguments);
        } catch {
          toolInput = {};
        }

        try {
          const result = await executeTool(serviceClient, toolName, toolInput);
          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
          toolsUsed.push({ tool: toolName, input: toolInput });
        } catch (toolError: any) {
          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: toolError.message }),
          });
          toolsUsed.push({ tool: toolName, input: toolInput, error: toolError.message });
        }
      }

      // Call AI again with tool results
      const nextResponse = await callAIProvider(provider, model, temperature, max_tokens, api_key_secret_name, currentMessages, toolDefs);
      if (!nextResponse.ok) {
        const errText = await nextResponse.text();
        finalResponse = `Tool execution completed but AI follow-up failed: ${errText}`;
        break;
      }

      const nextData = await nextResponse.json();
      const nextMsg = nextData.choices?.[0]?.message;

      if (!nextMsg?.tool_calls || nextMsg.tool_calls.length === 0) {
        finalResponse = nextMsg?.content || "";
        break;
      }

      // More tool calls — continue loop
      Object.assign(aiData, nextData);
    }

    // Log the interaction
    serviceClient.from("assistant_logs").insert({
      user_id: null,
      user_message: `[HAROLD] ${message}`,
      assistant_response: finalResponse,
      tools_used: toolsUsed,
      duration_ms: Date.now() - Date.now(),
    }).then(() => {}, () => {});

    return new Response(
      JSON.stringify({ message: finalResponse, toolsUsed }),
      { headers }
    );

  } catch (error: any) {
    console.error("Harold API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error", details: error.message }),
      { status: 500, headers }
    );
  }
});

// === AI Provider Call ===
async function callAIProvider(
  provider: string, model: string, temperature: number,
  max_tokens: number, apiKeySecretName: string,
  messages: any[], tools: any[]
): Promise<Response> {
  const apiKey = Deno.env.get(apiKeySecretName) || Deno.env.get("XAI_API_KEY");
  
  // Map provider to endpoint
  const endpoints: Record<string, string> = {
    "x-ai": "https://api.x.ai/v1/chat/completions",
    "openai": "https://api.openai.com/v1/chat/completions",
    "lovable": "https://lovable-ai-proxy.lovable.dev/v1/chat/completions",
  };
  
  const url = endpoints[provider] || endpoints["x-ai"];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };

  if (provider === "lovable") {
    headers["x-lovable-api-key"] = Deno.env.get("LOVABLE_API_KEY") || "";
    headers["Authorization"] = `Bearer ${Deno.env.get("LOVABLE_API_KEY") || ""}`;
  }

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      temperature,
      max_tokens,
    }),
  });
}

// === Default System Prompt ===
function getDefaultSystemPrompt(today: string): string {
  return `You are Bach, the AI operations assistant for Truficient Energy Solutions, a DFW-area HVAC company. Today is ${today}. You have full access to the CRM, scheduling, and operations tools. Be concise and data-driven.`;
}

// === Tool Definitions (mirrors ai-assistant) ===
function getToolDefinitions() {
  return [
    {
      type: "function",
      function: {
        name: "search_customers",
        description: "Search for customers by any combination of name, email, phone, or address. Always use this before concluding a customer doesn't exist. Supports partial matching and fuzzy token splitting.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Free-text search: can be a name, partial name, address, street, city, email, or phone. Multi-word queries are automatically split and searched individually." },
            status: { type: "string", enum: ["lead", "prospect", "active", "inactive", "former"] },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_customer_details",
        description: "Get full customer details by ID.",
        parameters: {
          type: "object",
          properties: { customer_id: { type: "string" } },
          required: ["customer_id"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_jobs",
        description: "Search jobs by number, customer, type, stage, or date range.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
            job_type: { type: "string" },
            stage: { type: "string" },
            date_from: { type: "string" },
            date_to: { type: "string" },
            limit: { type: "number" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_schedule",
        description: "Get scheduled appointments for a date range.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Date YYYY-MM-DD (default today)" },
            days: { type: "number", description: "Number of days to look ahead (default 1)" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_submission_stats",
        description: "Get counts of recent submissions across all form types.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_recent_submissions",
        description: "Get recent form submissions with details.",
        parameters: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["contact", "ducted", "ductless", "scanner", "landing_page", "all"] },
            limit: { type: "number" },
            status: { type: "string" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_pipeline_overview",
        description: "Get sales pipeline overview with stage counts and values.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_team_info",
        description: "Get team members and their assignments.",
        parameters: {
          type: "object",
          properties: {
            team_id: { type: "string" },
            include_assignments: { type: "boolean" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_customer",
        description: "Create a new CRM customer record.",
        parameters: {
          type: "object",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            customer_type: { type: "string", enum: ["residential", "commercial"] },
            lead_source: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            zip: { type: "string" },
            notes: { type: "string" },
          },
          required: ["first_name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_job",
        description: "Create a new job for a customer.",
        parameters: {
          type: "object",
          properties: {
            customer_id: { type: "string" },
            job_type_slug: { type: "string" },
            title: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            scheduled_date: { type: "string" },
            notes: { type: "string" },
          },
          required: ["customer_id", "job_type_slug", "title"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "update_job_stage",
        description: "Move a job to a different stage.",
        parameters: {
          type: "object",
          properties: {
            job_id: { type: "string" },
            stage_name: { type: "string" },
            notes: { type: "string" },
          },
          required: ["job_id", "stage_name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "log_interaction",
        description: "Log a customer interaction (call, email, visit, etc).",
        parameters: {
          type: "object",
          properties: {
            customer_id: { type: "string" },
            interaction_type: { type: "string", enum: ["call", "email", "text", "visit", "note"] },
            subject: { type: "string" },
            content: { type: "string" },
            direction: { type: "string", enum: ["inbound", "outbound"] },
            outcome: { type: "string" },
          },
          required: ["customer_id", "interaction_type"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "update_customer_status",
        description: "Update a customer's lifecycle status.",
        parameters: {
          type: "object",
          properties: {
            customer_id: { type: "string" },
            status: { type: "string", enum: ["lead", "prospect", "active", "inactive", "former"] },
          },
          required: ["customer_id", "status"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "schedule_appointment",
        description: "Schedule a job appointment.",
        parameters: {
          type: "object",
          properties: {
            job_id: { type: "string" },
            start_datetime: { type: "string" },
            end_datetime: { type: "string" },
            title: { type: "string" },
            team_id: { type: "string" },
            notes: { type: "string" },
          },
          required: ["job_id", "start_datetime", "end_datetime"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_daily_briefing",
        description: "Get today's operations briefing data.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "draft_estimate",
        description: "Draft an estimate for a customer job.",
        parameters: {
          type: "object",
          properties: {
            customer_id: { type: "string" },
            job_type: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: "number" },
                  unit_cost: { type: "number" },
                },
              },
            },
            notes: { type: "string" },
          },
          required: ["customer_id", "job_type"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "intake_lead",
        description: "Process and intake a new lead into the CRM.",
        parameters: {
          type: "object",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            service_needed: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            zip: { type: "string" },
            source: { type: "string" },
            notes: { type: "string" },
          },
          required: ["first_name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "review_submissions",
        description: "Review and classify recent submissions as real leads or junk.",
        parameters: {
          type: "object",
          properties: {
            hours: { type: "number", description: "Look back period in hours (default 48)" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "scan_watch_list",
        description: "Scan for high-priority leads based on equipment age, refrigerant, and location.",
        parameters: {
          type: "object",
          properties: {
            min_age_years: { type: "number" },
          },
        },
      },
    },
  ];
}

// === Tool Executor (uses service client for full access) ===
async function executeTool(serviceClient: any, toolName: string, input: any): Promise<any> {
  // Import executeTool from ai-assistant by calling the actual function
  // Since we can't import across edge functions, we replicate the key tool implementations

  const TZ = "America/Chicago";

  switch (toolName) {
    case "search_customers": {
      const searchTerm = (input.query || "").trim();
      const tokens = searchTerm.split(/\s+/).filter((t: string) => t.length > 1);
      const results: Map<string, any> = new Map();

      const addResult = (customer: any, score: number, reason: string) => {
        const existing = results.get(customer.id);
        if (!existing || existing.match_score < score) {
          results.set(customer.id, { ...customer, match_score: score, match_reason: reason });
        }
      };

      // Strategy 1: Full query on name/email/phone
      let nameQ = serviceClient.from("crm_customers").select("*, crm_locations(*)").is("deleted_at", null)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`)
        .limit(10);
      if (input.status) nameQ = nameQ.eq("customer_status", input.status);
      const { data: nameResults } = await nameQ;

      (nameResults || []).forEach((c: any) => {
        const fullName = `${c.first_name || ""} ${c.last_name || ""}`.trim().toLowerCase();
        const q = searchTerm.toLowerCase();
        let score = 40; let reason = "partial match";
        if (fullName === q) { score = 100; reason = "exact full name"; }
        else if (c.first_name?.toLowerCase() === q) { score = 80; reason = "exact first name"; }
        else if (c.last_name?.toLowerCase() === q) { score = 70; reason = "exact last name"; }
        else if (fullName.includes(q)) { score = 55; reason = "name contains query"; }
        else if (c.email?.toLowerCase().includes(q)) { score = 60; reason = "email match"; }
        else if (c.phone?.includes(searchTerm)) { score = 60; reason = "phone match"; }
        addResult(c, score, reason);
      });

      // Strategy 2: Address search
      try {
        const { data: locResults } = await serviceClient.from("crm_locations")
          .select("id, address_line1, city, state, zip_code, customer_id")
          .or(`address_line1.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,zip_code.ilike.%${searchTerm}%`)
          .limit(10);
        if (locResults && locResults.length > 0) {
          const customerIds = [...new Set(locResults.map((l: any) => l.customer_id))];
          let custQ = serviceClient.from("crm_customers").select("*, crm_locations(*)").in("id", customerIds).is("deleted_at", null);
          if (input.status) custQ = custQ.eq("customer_status", input.status);
          const { data: addrCustomers } = await custQ;
          (addrCustomers || []).forEach((c: any) => addResult(c, 40, "address match"));
        }
      } catch (_e) { /* continue */ }

      // Strategy 3: Token-level search
      for (const token of tokens) {
        let tQ = serviceClient.from("crm_customers").select("*, crm_locations(*)").is("deleted_at", null)
          .or(`first_name.ilike.%${token}%,last_name.ilike.%${token}%`)
          .limit(10);
        if (input.status) tQ = tQ.eq("customer_status", input.status);
        const { data: tokenResults } = await tQ;
        (tokenResults || []).forEach((c: any) => {
          const score = c.first_name?.toLowerCase() === token.toLowerCase() ? 75
            : c.last_name?.toLowerCase() === token.toLowerCase() ? 65 : 35;
          addResult(c, score, `token match on "${token}"`);
        });

        try {
          const { data: tokenLocResults } = await serviceClient.from("crm_locations")
            .select("id, address_line1, city, state, zip_code, customer_id")
            .or(`address_line1.ilike.%${token}%,city.ilike.%${token}%`)
            .limit(5);
          if (tokenLocResults && tokenLocResults.length > 0) {
            const customerIds = [...new Set(tokenLocResults.map((l: any) => l.customer_id))];
            let custQ = serviceClient.from("crm_customers").select("*, crm_locations(*)").in("id", customerIds).is("deleted_at", null);
            if (input.status) custQ = custQ.eq("customer_status", input.status);
            const { data: tAddrCust } = await custQ;
            (tAddrCust || []).forEach((c: any) => addResult(c, 30, `address token match on "${token}"`));
          }
        } catch (_e) { /* continue */ }
      }

      const sorted = Array.from(results.values()).sort((a: any, b: any) => b.match_score - a.match_score);
      return { customers: sorted, count: sorted.length, strategies_used: ["full_name", "email_phone", "address", "token_split"] };
    }

    case "get_customer_details": {
      const { data: customer, error } = await serviceClient
        .from("crm_customers").select("*, crm_locations(*), crm_interactions(*), crm_jobs(*, crm_job_types(*), crm_job_stages(*))")
        .eq("id", input.customer_id).single();
      if (error) throw error;
      return customer;
    }

    case "search_jobs": {
      let query = serviceClient.from("crm_jobs")
        .select("*, crm_customers(first_name, last_name), crm_job_types(name, slug), crm_job_stages(name)")
        .is("deleted_at", null).limit(input.limit || 10);
      if (input.query) {
        const q = `%${input.query}%`;
        query = query.or(`job_number.ilike.${q},title.ilike.${q}`);
      }
      if (input.date_from) query = query.gte("scheduled_date", input.date_from);
      if (input.date_to) query = query.lte("scheduled_date", input.date_to);
      const { data, error } = await query;
      if (error) throw error;
      return { jobs: data || [], count: data?.length || 0 };
    }

    case "get_schedule": {
      const date = input.date || new Date().toLocaleDateString("en-CA", { timeZone: TZ });
      const days = input.days || 1;
      const endDate = new Date(new Date(date).getTime() + days * 86400000).toISOString().split("T")[0];
      const { data, error } = await serviceClient
        .from("crm_job_appointments")
        .select("*, crm_jobs(job_number, title, crm_customers(first_name, last_name)), crm_teams(name)")
        .gte("start_datetime", `${date}T00:00:00`)
        .lt("start_datetime", `${endDate}T00:00:00`)
        .order("start_datetime");
      if (error) throw error;
      return { appointments: data || [], count: data?.length || 0, date_range: { from: date, to: endDate } };
    }

    case "get_submission_stats": {
      const { data, error } = await serviceClient.rpc("get_new_submission_counts");
      if (error) throw error;
      return data;
    }

    case "get_recent_submissions": {
      const type = input.type || "all";
      const limit = input.limit || 10;
      const results: any = {};

      if (type === "all" || type === "contact") {
        const { data } = await serviceClient.from("contact_submissions").select("*").order("created_at", { ascending: false }).limit(limit);
        results.contact = data || [];
      }
      if (type === "all" || type === "ducted") {
        const { data } = await serviceClient.from("ducted_estimate_submissions").select("*").order("created_at", { ascending: false }).limit(limit);
        results.ducted = data || [];
      }
      if (type === "all" || type === "ductless") {
        const { data } = await serviceClient.from("ductless_estimate_submissions").select("*").order("created_at", { ascending: false }).limit(limit);
        results.ductless = data || [];
      }
      if (type === "all" || type === "scanner") {
        const { data } = await serviceClient.from("equipment_scans").select("*").order("created_at", { ascending: false }).limit(limit);
        results.scanner = data || [];
      }
      if (type === "all" || type === "landing_page") {
        const { data } = await serviceClient.from("landing_page_submissions").select("*").order("created_at", { ascending: false }).limit(limit);
        results.landing_page = data || [];
      }
      return results;
    }

    case "get_pipeline_overview": {
      const { data: stages } = await serviceClient.from("crm_pipeline_stages").select("*").order("sort_order");
      const { data: entries } = await serviceClient.from("crm_pipeline_entries").select("*, crm_customers(first_name, last_name), crm_pipeline_stages(display_name)");
      return { stages: stages || [], entries: entries || [], total_entries: entries?.length || 0 };
    }

    case "get_team_info": {
      let query = serviceClient.from("crm_teams").select("*, crm_team_assignments(*, crm_team_members(*))");
      if (input.team_id) query = query.eq("id", input.team_id);
      const { data, error } = await query;
      if (error) throw error;
      return { teams: data || [] };
    }

    case "create_customer": {
      // Check for existing customer to prevent duplicates
      let existingCustomer = null;
      if (input.email) {
        const { data: byEmail } = await serviceClient.from("crm_customers")
          .select("*").ilike("email", input.email).is("deleted_at", null).limit(1).single();
        if (byEmail) existingCustomer = byEmail;
      }
      if (!existingCustomer && input.first_name && input.last_name) {
        const { data: byName } = await serviceClient.from("crm_customers")
          .select("*").ilike("first_name", input.first_name).ilike("last_name", input.last_name || "")
          .is("deleted_at", null).limit(1).single();
        if (byName) existingCustomer = byName;
      }
      if (existingCustomer && !input.force_create) {
        return { created: false, duplicate: true, customer: existingCustomer, message: `Existing customer found: ${existingCustomer.first_name} ${existingCustomer.last_name}` };
      }

      const { data, error } = await serviceClient.from("crm_customers").insert({
        first_name: input.first_name,
        last_name: input.last_name || null,
        email: input.email || null,
        phone: input.phone || null,
        customer_type: input.customer_type || "residential",
        lead_source: input.lead_source || "harold-api",
        notes: input.notes || null,
      }).select().single();
      if (error) throw error;
      // Create location if address provided
      if (input.address && data) {
        await serviceClient.from("crm_locations").insert({
          customer_id: data.id,
          address_line1: input.address,
          city: input.city || "",
          state: input.state || "TX",
          zip_code: input.zip || "",
          is_primary: true,
        });
      }
      return { created: true, customer: data };
    }

    case "create_job": {
      const { data: jobType } = await serviceClient.from("crm_job_types").select("id").eq("slug", input.job_type_slug).single();
      if (!jobType) throw new Error(`Job type '${input.job_type_slug}' not found`);
      const { data: firstStage } = await serviceClient.from("crm_job_stages").select("id").eq("job_type_id", jobType.id).order("sort_order").limit(1).single();
      const { data, error } = await serviceClient.from("crm_jobs").insert({
        customer_id: input.customer_id,
        job_type_id: jobType.id,
        title: input.title,
        priority: input.priority || "medium",
        scheduled_date: input.scheduled_date || null,
        internal_notes: input.notes || null,
        current_stage_id: firstStage?.id || null,
        job_number: "",
      }).select().single();
      if (error) throw error;
      return { created: true, job: data };
    }

    case "update_job_stage": {
      const { data: stage } = await serviceClient.from("crm_job_stages").select("id").ilike("name", `%${input.stage_name}%`).limit(1).single();
      if (!stage) throw new Error(`Stage '${input.stage_name}' not found`);
      const { error } = await serviceClient.from("crm_jobs").update({ current_stage_id: stage.id }).eq("id", input.job_id);
      if (error) throw error;
      return { updated: true, job_id: input.job_id, new_stage: input.stage_name };
    }

    case "log_interaction": {
      const { data, error } = await serviceClient.from("crm_interactions").insert({
        customer_id: input.customer_id,
        interaction_type: input.interaction_type,
        subject: input.subject || null,
        content: input.content || null,
        direction: input.direction || "outbound",
        outcome: input.outcome || null,
      }).select().single();
      if (error) throw error;
      return { logged: true, interaction: data };
    }

    case "update_customer_status": {
      const { error } = await serviceClient.from("crm_customers").update({ customer_status: input.status }).eq("id", input.customer_id);
      if (error) throw error;
      return { updated: true, customer_id: input.customer_id, new_status: input.status };
    }

    case "schedule_appointment": {
      const { data, error } = await serviceClient.from("crm_job_appointments").insert({
        job_id: input.job_id,
        start_datetime: input.start_datetime,
        end_datetime: input.end_datetime,
        title: input.title || null,
        assigned_team_id: input.team_id || null,
        notes: input.notes || null,
      }).select().single();
      if (error) throw error;
      return { scheduled: true, appointment: data };
    }

    case "get_daily_briefing": {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
      const { data: appointments } = await serviceClient.from("crm_job_appointments")
        .select("*, crm_jobs(job_number, title, crm_customers(first_name, last_name)), crm_teams(name)")
        .gte("start_datetime", `${today}T00:00:00`).lt("start_datetime", `${today}T23:59:59`).order("start_datetime");
      const { data: stats } = await serviceClient.rpc("get_new_submission_counts");
      return { date: today, appointments: appointments || [], submission_stats: stats };
    }

    default:
      return { error: `Tool '${toolName}' is not available via Harold API` };
  }
}
