// supabase/functions/ai-assistant/index.ts
// AI Operations Assistant - Phase 2 (Read + Write with Confirmation)
// Renamed: Bach — the AI assistant for Truficient

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// === CST Timezone Utilities ===
const TZ = "America/Chicago";

function getCSTDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

function toCSTBoundary(dateStr: string, time: string): string {
  const naive = new Date(`${dateStr}T${time}:00`);
  const utcParts = new Date(naive.toLocaleString("en-US", { timeZone: "UTC", hour12: false }));
  const cstParts = new Date(naive.toLocaleString("en-US", { timeZone: TZ, hour12: false }));
  const offset = utcParts.getTime() - cstParts.getTime();
  return new Date(new Date(`${dateStr}T${time}:00Z`).getTime() + offset).toISOString();
}

function formatTimeCST(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// === RBAC: Get user's assistant permissions ===
async function getAssistantPermissions(supabase: any, userId: string) {
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();
  if (!roleData) return null;

  const { data: perms } = await supabase
    .from("assistant_role_permissions")
    .select("*")
    .eq("role_name", roleData.role)
    .single();

  return perms ? { ...perms, user_role: roleData.role } : null;
}

// === Financial data redaction for restricted roles ===
function redactFinancials(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") return data.replace(/\$[\d,]+\.?\d*/g, "$[restricted]");
  if (Array.isArray(data)) return data.map(redactFinancials);
  if (typeof data === "object") {
    const sensitive = new Set([
      "estimated_value","final_total","subtotal","tax_amount","equipment_cost",
      "installation_labor","installation_cost","price","hourly_rate",
      "monthly_payment","monthlyPayment","rebates","addons_cost","addonsCost",
      "base_price","equipment_total","equipmentTotal","recent_wins_total",
    ]);
    const out: any = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = sensitive.has(k) ? "[restricted]" : redactFinancials(v);
    }
    return out;
  }
  return data;
}

// === Tool-to-permission mapping ===
const TOOL_PERMISSIONS: Record<string, string> = {
  search_customers: "can_access_assistant",
  get_customer_details: "can_access_assistant",
  search_jobs: "can_access_assistant",
  get_schedule: "can_access_assistant",
  get_submission_stats: "can_access_assistant",
  get_recent_submissions: "can_access_assistant",
  get_pipeline_overview: "can_access_assistant",
  get_property_data: "can_access_assistant",
  verify_address: "can_access_assistant",
  get_team_info: "can_access_assistant",
  seo_audit: "can_access_assistant",
  create_job: "can_use_write_tools",
  update_job_stage: "can_use_write_tools",
  log_interaction: "can_use_write_tools",
  update_customer_status: "can_use_write_tools",
  update_customer: "can_use_write_tools",
  update_job: "can_use_write_tools",
  create_customer: "can_use_write_tools",
  create_pipeline_entry: "can_use_write_tools",
  intake_lead: "can_use_write_tools",
  review_submissions: "can_use_write_tools",
  scan_watch_list: "can_use_write_tools",
  draft_estimate: "can_use_write_tools",
  update_prices: "can_use_write_tools",
  update_seo: "can_use_write_tools",
  schedule_appointment: "can_use_write_tools",
  reschedule_appointment: "can_use_write_tools",
  cancel_appointment: "can_use_write_tools",
  get_google_calendar: "can_use_calendar_tools",
  get_daily_briefing: "can_view_briefing",
};

// ============================================================
// TOOL DEFINITIONS (OpenAI format)
// ============================================================

const tools = [
  // === PHASE 1: READ TOOLS ===
  {
    type: "function" as const,
    function: {
      name: "search_customers",
      description: "Search for customers by any combination of name, email, phone, or address. Always use this before concluding a customer doesn't exist. Supports partial matching and fuzzy token splitting.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text search: can be a name, partial name, address, street, city, email, or phone. Multi-word queries are automatically split and searched individually." },
          status: { type: "string", enum: ["lead", "prospect", "active", "inactive", "former"], description: "Optional filter by customer lifecycle status" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_customer_details",
      description: "Get comprehensive details for a specific customer by ID. Returns profile, locations, recent interactions, active jobs, and linked submissions.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "The UUID of the customer" },
        },
        required: ["customer_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_jobs",
      description: "Search for jobs by job number (e.g., TRU-2026-0042), customer name, job type, current stage, or date range.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Job number or customer name" },
          job_type: { type: "string", description: "Filter by job type slug" },
          stage: { type: "string", description: "Filter by current stage name" },
          date_from: { type: "string", description: "Start date (YYYY-MM-DD)" },
          date_to: { type: "string", description: "End date (YYYY-MM-DD)" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_schedule",
      description: "Get scheduled job appointments for a date range. Shows who is working where and when.",
      parameters: {
        type: "object",
        properties: {
          date_from: { type: "string", description: "Start date YYYY-MM-DD (defaults to today)" },
          date_to: { type: "string", description: "End date YYYY-MM-DD (defaults to 7 days out)" },
          team_id: { type: "string", description: "Optional team UUID filter" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_submission_stats",
      description: "Get submission counts across all form types.",
      parameters: {
        type: "object",
        properties: {
          date_from: { type: "string", description: "Start date YYYY-MM-DD" },
          date_to: { type: "string", description: "End date YYYY-MM-DD" },
          source: { type: "string", enum: ["ducted", "ductless", "scanner", "contact", "landing_page", "all"], description: "Filter by source" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_recent_submissions",
      description: "Get the most recent form submissions across all types.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number to return (default 10, max 25)" },
          source: { type: "string", enum: ["ducted", "ductless", "scanner", "contact", "landing_page"], description: "Optional filter" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_pipeline_overview",
      description: "Get sales pipeline summary with count and estimated value per stage.",
      parameters: {
        type: "object",
        properties: {
          include_entries: { type: "boolean", description: "Include individual entries (default false)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_team_info",
      description: "Get information about teams/crews and their members.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Team or member name to search" },
          team_id: { type: "string", description: "Specific team ID" },
        },
      },
    },
  },

  // === PHASE 2: WRITE TOOLS ===
  {
    type: "function" as const,
    function: {
      name: "create_customer",
      description: "Create a new customer in the CRM. Optionally adds a primary location. ALWAYS confirm with the user before executing.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "Customer's first name" },
          last_name: { type: "string", description: "Customer's last name" },
          email: { type: "string", description: "Email address (optional)" },
          phone: { type: "string", description: "Phone number (optional)" },
          address_line1: { type: "string", description: "Street address (optional — if provided, creates a primary location)" },
          city: { type: "string", description: "City (required if address provided)" },
          state: { type: "string", description: "State abbreviation (required if address provided, default TX)" },
          zip_code: { type: "string", description: "ZIP code (required if address provided)" },
          lead_source: { type: "string", description: "How the customer was acquired (optional)" },
          customer_type: { type: "string", enum: ["residential", "commercial"], description: "Customer type (default residential)" },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms. First call: always false." },
          force_create: { type: "boolean", description: "Set true to bypass duplicate detection and create a new record anyway." },
        },
        required: ["first_name", "last_name", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_job",
      description: "Create a new job for an existing customer. ALWAYS confirm with the user before executing.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer" },
          location_id: { type: "string", description: "UUID of the service location (optional, uses primary)" },
          job_type_slug: { type: "string", description: "Job type slug (e.g., 'ductless-install', 'repair'). Use get_job_types first." },
          scheduled_date: { type: "string", description: "Scheduled date YYYY-MM-DD (optional)" },
          estimated_completion: { type: "string", description: "Estimated completion YYYY-MM-DD (optional)" },
          notes: { type: "string", description: "Notes for the job" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms. First call: always false." },
        },
        required: ["customer_id", "job_type_slug", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_job_stage",
      description: "Move a job to a different workflow stage. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string", description: "UUID of the job" },
          target_stage_name: { type: "string", description: "Stage name to move to" },
          notes: { type: "string", description: "Optional notes" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms." },
        },
        required: ["job_id", "target_stage_name", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "log_interaction",
      description: "Add an interaction (call, email, note, text, meeting, task) to a customer's timeline. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer" },
          interaction_type: { type: "string", enum: ["call", "email", "text", "meeting", "note", "task"], description: "Type of interaction" },
          direction: { type: "string", enum: ["inbound", "outbound"], description: "Direction (for calls/emails/texts)" },
          content: { type: "string", description: "Content/summary" },
          outcome: { type: "string", description: "Outcome (e.g., 'Left voicemail')" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms." },
        },
        required: ["customer_id", "interaction_type", "content", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_customer_status",
      description: "Change a customer's lifecycle status. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer" },
          new_status: { type: "string", enum: ["lead", "prospect", "active", "inactive", "former"], description: "New status" },
          reason: { type: "string", description: "Reason for change" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms." },
        },
        required: ["customer_id", "new_status", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_customer",
      description: "Edit an existing customer's basic information (name, email, phone, type, lead source, tags, notes, alternate phone, preferred contact method, company name). Only the fields provided will be updated. Do NOT use this for lifecycle status — use update_customer_status instead. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer to update" },
          first_name: { type: "string", description: "New first name (optional)" },
          last_name: { type: "string", description: "New last name (optional)" },
          email: { type: "string", description: "New email address (optional, pass empty string to clear)" },
          phone: { type: "string", description: "New primary phone (optional, pass empty string to clear)" },
          alternate_phone: { type: "string", description: "New alternate phone (optional, pass empty string to clear)" },
          preferred_contact_method: { type: "string", enum: ["phone", "email", "text"], description: "Preferred contact method (optional)" },
          customer_type: { type: "string", enum: ["residential", "commercial"], description: "Customer type (optional)" },
          company_name: { type: "string", description: "Company name for commercial accounts (optional)" },
          lead_source: { type: "string", description: "Lead source (optional, pass empty string to clear)" },
          tags: { type: "array", items: { type: "string" }, description: "REPLACES the full tag list. Omit to leave tags alone." },
          notes: { type: "string", description: "Internal notes (REPLACES existing notes; omit to leave alone)" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms. First call: always false." },
        },
        required: ["customer_id", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_job",
      description: "Edit an existing job's details (title, scheduled date, priority, quoted amount, internal notes, customer notes, location). Only the fields provided will be updated. Do NOT use this for stage changes — use update_job_stage instead. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string", description: "UUID of the job to update" },
          title: { type: "string", description: "New job title (optional)" },
          scheduled_date: { type: "string", description: "Scheduled start date YYYY-MM-DD (optional, pass empty string to clear)" },
          scheduled_end_date: { type: "string", description: "Estimated completion date YYYY-MM-DD (optional, pass empty string to clear)" },
          priority: { type: "string", enum: ["low", "normal", "high", "urgent"], description: "Job priority (optional)" },
          quoted_amount: { type: "number", description: "Quoted dollar amount (optional)" },
          final_amount: { type: "number", description: "Final dollar amount (optional)" },
          payment_status: { type: "string", enum: ["no_charge_yet", "pending", "deposit_received", "partial", "paid", "refunded", "not_charging"], description: "Payment status (optional)" },
          internal_notes: { type: "string", description: "Internal notes (REPLACES existing; omit to leave alone)" },
          customer_notes: { type: "string", description: "Notes visible to the customer (REPLACES existing; omit to leave alone)" },
          location_id: { type: "string", description: "UUID of a different service location for this customer (optional)" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms. First call: always false." },
        },
        required: ["job_id", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_to_pipeline",
      description: "Add a customer to the sales pipeline. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer" },
          stage_name: { type: "string", description: "Pipeline stage name" },
          estimated_value: { type: "number", description: "Estimated deal value in dollars" },
          probability: { type: "number", description: "Win probability percentage (0-100)" },
          expected_close_date: { type: "string", description: "Expected close date YYYY-MM-DD" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms." },
        },
        required: ["customer_id", "stage_name", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "move_pipeline_entry",
      description: "Move an existing pipeline entry to a different stage. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          entry_id: { type: "string", description: "UUID of the pipeline entry" },
          target_stage_name: { type: "string", description: "Stage to move to" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms." },
        },
        required: ["entry_id", "target_stage_name", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_pipeline_entry",
      description: "Update fields on an existing pipeline entry (estimated value, probability, expected close date, notes). Use when the lead is already in the pipeline and you need to change deal details without moving stages. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          entry_id: { type: "string", description: "UUID of the pipeline entry. Use search_customers to find it." },
          customer_id: { type: "string", description: "UUID of the customer (alternative to entry_id — will find their pipeline entry)" },
          estimated_value: { type: "number", description: "New estimated deal value in dollars" },
          probability: { type: "number", description: "New win probability percentage (0-100)" },
          expected_close_date: { type: "string", description: "New expected close date YYYY-MM-DD" },
          notes: { type: "string", description: "Updated notes for the pipeline entry" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms." },
        },
        required: ["confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "schedule_appointment",
      description: "Create a timed appointment for an existing job with a start/end time and optional team assignment. Automatically creates a Google Calendar event with job details, customer info, and location. ALWAYS confirm with the user before executing.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string", description: "UUID of the job" },
          start_datetime: { type: "string", description: "Start in ISO 8601 (e.g., '2026-02-15T09:00:00-06:00')" },
          end_datetime: { type: "string", description: "End in ISO 8601" },
          team_id: { type: "string", description: "UUID of team/crew (optional)" },
          notes: { type: "string", description: "Appointment notes" },
          skip_calendar: { type: "boolean", description: "If true, skip Google Calendar event creation (default false)" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms." },
        },
        required: ["job_id", "start_datetime", "end_datetime", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reschedule_appointment",
      description: "Reschedule an existing job appointment to a new date/time. Updates both the CRM record and the linked Google Calendar event. Use search_jobs or get_schedule first to find the appointment. ALWAYS confirm before executing.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string", description: "UUID of the appointment to reschedule" },
          new_start_datetime: { type: "string", description: "New start time in ISO 8601 with Central Time offset" },
          new_end_datetime: { type: "string", description: "New end time in ISO 8601 with Central Time offset" },
          new_team_id: { type: "string", description: "Optional new team/crew assignment" },
          reason: { type: "string", description: "Reason for rescheduling" },
          confirmed: { type: "boolean", description: "Set to true ONLY after user confirmation." },
        },
        required: ["appointment_id", "new_start_datetime", "new_end_datetime", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancel_appointment",
      description: "Cancel a job appointment. Updates the CRM record and deletes the linked Google Calendar event. ALWAYS confirm before executing.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string", description: "UUID of the appointment to cancel" },
          reason: { type: "string", description: "Reason for cancellation" },
          confirmed: { type: "boolean", description: "Set to true ONLY after user confirmation." },
        },
        required: ["appointment_id", "confirmed"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_google_calendar",
      description: "Read events directly from Google Calendar for a date range. Shows all events including non-job items. Use for checking true availability. No confirmation needed.",
      parameters: {
        type: "object",
        properties: {
          date_from: { type: "string", description: "Start date (YYYY-MM-DD). Defaults to today." },
          date_to: { type: "string", description: "End date (YYYY-MM-DD). Defaults to 7 days from start." },
          team_id: { type: "string", description: "Optional team ID to check that team's specific calendar" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_job_types",
      description: "Get available job types and slugs. Read-only, no confirmation needed.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_pipeline_stages",
      description: "Get all pipeline stage definitions. Read-only, no confirmation needed.",
      parameters: { type: "object", properties: {} },
    },
  },
  // === CHAINED WRITE TOOLS ===
  {
    type: "function" as const,
    function: {
      name: "intake_lead",
      description: "Full lead intake: creates customer, adds location, adds to pipeline at the correct stage based on lead source, logs interaction, — all in one confirmed action. Use this instead of calling create_customer + add_to_pipeline separately when intake is the goal. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "Lead's first name" },
          last_name: { type: "string", description: "Lead's last name" },
          email: { type: "string", description: "Email address (optional)" },
          phone: { type: "string", description: "Phone number (optional)" },
          address_line1: { type: "string", description: "Street address (optional)" },
          city: { type: "string", description: "City (optional)" },
          state: { type: "string", description: "State abbreviation (optional, default TX)" },
          zip_code: { type: "string", description: "ZIP code (optional)" },
          lead_source: { type: "string", description: "How the lead arrived — e.g. 'Mitsubishi Partner Program', 'Google Ads', 'Referral', 'Scanner', 'Estimator'" },
          customer_type: { type: "string", enum: ["residential", "commercial"], description: "Customer type (default residential)" },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags" },
          notes: { type: "string", description: "Any additional context about the lead" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms. First call: always false." },
        },
        required: ["first_name", "last_name", "confirmed"],
      },
    },
  },
  // === LEAD PASTE PARSER (Mitsubishi & similar label/value pastes) ===
  {
    type: "function" as const,
    function: {
      name: "parse_lead_paste",
      description: "Parse a raw 'Accept Lead' style paste (Mitsubishi Partner Program or similar label/value format) into structured lead fields. Handles label-on-one-line / value-on-next-line, markdown-wrapped email/phone like [x](mailto:x) and [(123) 456-7890](tel:...), and splits the address. ALWAYS call this BEFORE intake_lead whenever the user pastes text that contains 'Lead Name', 'Lead source', or similar labeled fields. Then pass the returned `intake_params` straight into intake_lead (with confirmed: false) for the user's confirmation.",
      parameters: {
        type: "object",
        properties: {
          raw_text: { type: "string", description: "The full pasted lead text exactly as received." },
          lead_source_override: { type: "string", description: "Optional default lead source if the paste doesn't specify one (e.g. 'Mitsubishi Partner Program')." },
        },
        required: ["raw_text"],
      },
    },
  },
  // === SUBMISSION REVIEW TOOL ===
  {
    type: "function" as const,
    function: {
      name: "review_submissions",
      description: "Scan all recent unreviewed submissions across all sources, classify each as real/junk/unsure using signal-based scoring, and return a structured report. Can also archive junk or intake real leads when instructed. Use when the user says 'review submissions', 'check new leads', or similar.",
      parameters: {
        type: "object",
        properties: {
          lookback_hours: { type: "number", description: "How far back to scan (default 48 hours)" },
          confirmed_archive: { type: "array", items: { type: "string" }, description: "Array of submission IDs to archive (set after user confirms archive)" },
          confirmed_intake: { type: "array", items: { type: "string" }, description: "Array of submission IDs to run through intake_lead (set after user confirms intake)" },
        },
      },
    },
  },
  // === WATCH LIST TOOL ===
  {
    type: "function" as const,
    function: {
      name: "scan_watch_list",
      description: "Scan the equipment scanner database for high-priority leads based on equipment age, R-22 refrigerant, DFW location, and contact info. Scores leads by urgency and can automatically run intake_lead on confirmed high-priority contacts. Use when the user says 'scan watch list', 'check aging equipment', or similar.",
      parameters: {
        type: "object",
        properties: {
          lookback_days: { type: "number", description: "How far back to scan (default 30 days)" },
          min_age_years: { type: "number", description: "Equipment age threshold in years (default 15)" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms intake. First call: always false." },
          include_medium: { type: "boolean", description: "If true, also intake medium priority leads on confirmation (default false)" },
        },
        required: ["confirmed"],
      },
    },
  },
  // === ESTIMATE DRAFTING TOOL ===
  {
    type: "function" as const,
    function: {
      name: "draft_estimate",
      description: "Draft a project estimate for an existing CRM customer using existing templates, system pricing, and materials. Saves as draft only — never sends to customer. ALWAYS confirm first. If job_type or customer is ambiguous, ask clarifying questions before proceeding.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the CRM customer. If unknown, use customer_name to search." },
          customer_name: { type: "string", description: "Customer name to search if customer_id is not known. Will resolve to customer_id." },
          job_type: { type: "string", enum: ["residential_replacement", "residential_new", "commercial_replacement", "commercial_new", "maintenance", "repair"], description: "Job type for the estimate." },
          heating_type: { type: "string", enum: ["gas", "electric", "heat_pump", "dual_fuel"], description: "Heating type (default heat_pump)" },
          template_id: { type: "string", description: "Optional template UUID to override auto-selection" },
          title: { type: "string", description: "Optional custom title for the estimate" },
          notes: { type: "string", description: "Optional job notes" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms the draft preview. First call: always false." },
        },
        required: ["job_type", "confirmed"],
      },
    },
  },
  // === PRICE UPDATE TOOL ===
  {
    type: "function" as const,
    function: {
      name: "update_prices",
      description: "Update prices in system pricing tables (equipment systems, materials catalog, labor rates, ductless addons, ductless unit sizes, financing options). Shows a before/after diff for review before applying. When a user pastes a price list in any format, parse it into price_data and call this tool. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          update_type: { type: "string", enum: ["equipment", "materials", "labor", "addons", "ductless_units", "financing"], description: "Which pricing table to update" },
          price_data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Item name to match" },
                sku: { type: "string", description: "SKU or model number to match (optional)" },
                new_price: { type: "number", description: "New price value" },
              },
              required: ["new_price"],
            },
            description: "Array of items with name/sku and new_price",
          },
          skip_unmatched: { type: "boolean", description: "Skip items that can't be matched (default true)" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms. First call: always false." },
        },
        required: ["update_type", "price_data", "confirmed"],
      },
    },
  },
  // === PROPERTY DATA TOOL ===
  {
    type: "function" as const,
    function: {
      name: "get_property_data",
      description: "Look up property data (square footage, year built, stories, bedrooms, bathrooms, lot size) for any address using RentCast. Optionally saves results back to an existing CRM location record. No confirmation needed.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Full street address (e.g., '456 Oak Ave')" },
          city: { type: "string", description: "City (optional, improves accuracy)" },
          state: { type: "string", description: "State abbreviation (default TX)" },
          zip_code: { type: "string", description: "ZIP code (optional, improves accuracy)" },
          location_id: { type: "string", description: "Optional CRM location UUID — if provided, saves property data back to this location record" },
        },
        required: ["address"],
      },
    },
  },
  // === ADDRESS VERIFICATION TOOL ===
  {
    type: "function" as const,
    function: {
      name: "verify_address",
      description: "Verify and standardize an address using Google Geocoding. Returns clean components, coordinates, county, and DFW service area check. Optionally saves verified address back to a CRM location record. No confirmation needed.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Raw address input (e.g., '456 oak ave plano tx')" },
          city: { type: "string", description: "City (optional, helps accuracy)" },
          state: { type: "string", description: "State (optional, default TX)" },
          zip_code: { type: "string", description: "ZIP code (optional)" },
          save_to_location_id: { type: "string", description: "Optional CRM location UUID — if provided, updates the location with verified address components and coordinates" },
        },
        required: ["address"],
      },
    },
  },
  // === SEO AUDIT TOOL ===
  {
    type: "function" as const,
    function: {
      name: "seo_audit",
      description: "Audit SEO metadata across all pages and blog posts. Returns a read-only report showing missing, too-long, too-short, and duplicate meta titles and descriptions. Never makes changes — use update_seo to fix issues after review.",
      parameters: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["all", "pages", "blog"], description: "Which content to audit (default: all)" },
          issue_filter: { type: "string", enum: ["all", "missing", "too_long", "too_short", "duplicate"], description: "Filter by issue type (default: all)" },
          limit: { type: "number", description: "Max items to return (default 50)" },
        },
      },
    },
  },
  // === SEO REPORT ARCHIVE SEARCH ===
  {
    type: "function" as const,
    function: {
      name: "search_seo_reports",
      description: "Search archived SEO reports by keyword, tag, page path, or date. Use when Eric references a past audit, asks 'what did we find about X', or when current questions might benefit from prior analysis context. Returns title, summary, date, and report_id for each match.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text search across title, summary, response" },
          tag: { type: "string", description: "Filter by tag" },
          page_path: { type: "string", description: "Filter to reports referencing this page path" },
          limit: { type: "number", description: "Max results, default 10" },
        },
      },
    },
  },
  // === SEO UPDATE TOOL ===
  {
    type: "function" as const,
    function: {
      name: "update_seo",
      description: "Update SEO metadata (meta title and/or meta description) for a specific page or blog post. Shows a preview of old vs new before saving. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          page_id: { type: "string", description: "UUID of the page_seo record or blog_posts record to update" },
          source: { type: "string", enum: ["page", "blog"], description: "Whether this is a page_seo or blog_posts record (default: page)" },
          meta_title: { type: "string", description: "New meta title (optional)" },
          meta_description: { type: "string", description: "New meta description (optional)" },
          confirmed: { type: "boolean", description: "Set true ONLY after user confirms. First call: always false." },
        },
        required: ["page_id", "confirmed"],
      },
    },
  },
  // === PHASE 4: BRIEFING TOOL ===
  {
    type: "function" as const,
    function: {
      name: "get_daily_briefing",
      description: "Generate a daily operations briefing. Call this when the user opens the assistant for the first time in a session, or when they ask for a summary/briefing/update. Returns today's schedule, new leads, alerts, and action items. No confirmation needed.",
      parameters: {
        type: "object",
        properties: {
          briefing_data: {
            type: "object",
            description: "Pre-fetched briefing data from the assistant-briefing edge function. Pass this directly.",
          },
        },
      },
    },
  },
];

// ============================================================
// PHASE 1: READ TOOL EXECUTION FUNCTIONS
// ============================================================

async function executeSearchCustomers(supabase: any, input: { query: string; status?: string }) {
  const searchTerm = input.query.trim();
  const tokens = searchTerm.split(/\s+/).filter((t: string) => t.length > 1);
  const results: Map<string, any> = new Map();

  const addResult = (customer: any, score: number, reason: string) => {
    const existing = results.get(customer.id);
    if (!existing || existing.match_score < score) {
      results.set(customer.id, { ...customer, match_score: score, match_reason: reason });
    }
  };

  const selectFields = `id, first_name, last_name, email, phone, customer_status, customer_type, lead_source, tags, created_at, updated_at, crm_locations(id, address_line1, city, state, zip_code, is_primary, square_footage, year_built)`;

  // Strategy 1: Full query search on name/email/phone
  let nameQuery = supabase.from("crm_customers").select(selectFields).is("deleted_at", null)
    .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
    .limit(10);
  if (input.status) nameQuery = nameQuery.eq("customer_status", input.status);
  const { data: nameResults } = await nameQuery;

  (nameResults || []).forEach((c: any) => {
    const fullName = `${c.first_name || ""} ${c.last_name || ""}`.trim().toLowerCase();
    const q = searchTerm.toLowerCase();
    let score = 40;
    let reason = "partial match";
    if (fullName === q) { score = 100; reason = "exact full name"; }
    else if (c.first_name?.toLowerCase() === q) { score = 80; reason = "exact first name"; }
    else if (c.last_name?.toLowerCase() === q) { score = 70; reason = "exact last name"; }
    else if (fullName.includes(q)) { score = 55; reason = "name contains query"; }
    else if (c.email?.toLowerCase().includes(q)) { score = 60; reason = "email match"; }
    else if (c.phone?.includes(searchTerm)) { score = 60; reason = "phone match"; }
    addResult(c, score, reason);
  });

  // Strategy 2: Address/location search (full query)
  try {
    let locQuery = supabase.from("crm_locations").select(`id, address_line1, city, state, zip_code, customer_id`)
      .or(`address_line1.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,zip_code.ilike.%${searchTerm}%`)
      .limit(10);
    const { data: locResults } = await locQuery;
    if (locResults && locResults.length > 0) {
      const customerIds = [...new Set(locResults.map((l: any) => l.customer_id))];
      let custQuery = supabase.from("crm_customers").select(selectFields).in("id", customerIds).is("deleted_at", null);
      if (input.status) custQuery = custQuery.eq("customer_status", input.status);
      const { data: addrCustomers } = await custQuery;
      (addrCustomers || []).forEach((c: any) => addResult(c, 40, "address match"));
    }
  } catch (_e) { /* address search failed, continue */ }

  // Strategy 3: Token-level search (split query into words)
  for (const token of tokens) {
    let tokenQuery = supabase.from("crm_customers").select(selectFields).is("deleted_at", null)
      .or(`first_name.ilike.%${token}%,last_name.ilike.%${token}%`)
      .limit(10);
    if (input.status) tokenQuery = tokenQuery.eq("customer_status", input.status);
    const { data: tokenResults } = await tokenQuery;

    (tokenResults || []).forEach((c: any) => {
      const score = c.first_name?.toLowerCase() === token.toLowerCase() ? 75
        : c.last_name?.toLowerCase() === token.toLowerCase() ? 65
        : 35;
      addResult(c, score, `token match on "${token}"`);
    });

    // Token-level address search
    try {
      const { data: tokenLocResults } = await supabase.from("crm_locations")
        .select(`id, address_line1, city, state, zip_code, customer_id`)
        .or(`address_line1.ilike.%${token}%,city.ilike.%${token}%`)
        .limit(5);
      if (tokenLocResults && tokenLocResults.length > 0) {
        const customerIds = [...new Set(tokenLocResults.map((l: any) => l.customer_id))];
        let custQuery = supabase.from("crm_customers").select(selectFields).in("id", customerIds).is("deleted_at", null);
        if (input.status) custQuery = custQuery.eq("customer_status", input.status);
        const { data: tokenAddrCustomers } = await custQuery;
        (tokenAddrCustomers || []).forEach((c: any) => addResult(c, 30, `address token match on "${token}"`));
      }
    } catch (_e) { /* token address search failed, continue */ }
  }

  // Sort by score descending
  const sorted = Array.from(results.values()).sort((a: any, b: any) => b.match_score - a.match_score);

  // Normalize output
  const customers = sorted.map((c: any) => {
    const locations = Array.isArray(c.crm_locations) ? c.crm_locations : c.crm_locations ? [c.crm_locations] : [];
    const primaryLoc = locations.find((l: any) => l.is_primary) || locations[0] || null;
    return {
      id: c.id,
      name: `${c.first_name || ""} ${c.last_name || ""}`.trim(),
      email: c.email, phone: c.phone, status: c.customer_status, type: c.customer_type,
      lead_source: c.lead_source, tags: c.tags,
      match_score: c.match_score, match_reason: c.match_reason,
      primary_location: primaryLoc,
      location_count: locations.length,
      last_updated: c.updated_at,
    };
  });

  return {
    count: customers.length,
    customers,
    strategies_used: ["full_name", "email_phone", "address", "token_split"],
  };
}

async function executeGetCustomerDetails(supabase: any, input: { customer_id: string }) {
  const [custResult, interactionsResult, jobsResult, submissionsResult] = await Promise.all([
    supabase.from("crm_customers").select("*, crm_locations(*)").eq("id", input.customer_id).single(),
    supabase.from("crm_interactions").select("*").eq("customer_id", input.customer_id).order("created_at", { ascending: false }).limit(10),
    supabase.from("crm_jobs").select(`id, job_number, title, scheduled_date, current_stage_id, crm_job_types(name, category), crm_job_stages!crm_jobs_current_stage_id_fkey(name)`).eq("customer_id", input.customer_id).is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
    supabase.from("crm_submission_links").select("submission_type, submission_id, created_at").eq("customer_id", input.customer_id).order("created_at", { ascending: false }),
  ]);

  if (custResult.error) throw new Error(`Customer not found: ${custResult.error.message}`);
  const customer = custResult.data;

  return {
    customer: {
      id: customer.id, name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
      email: customer.email, phone: customer.phone, status: customer.customer_status,
      type: customer.customer_type, lead_source: customer.lead_source, tags: customer.tags,
      created_at: customer.created_at,
    },
    locations: customer.crm_locations || [],
    recent_interactions: (interactionsResult.data || []).map((i: any) => ({
      type: i.interaction_type, direction: i.direction, content: i.content?.substring(0, 200),
      outcome: i.outcome, date: i.created_at,
    })),
    jobs: (jobsResult.data || []).map((j: any) => ({
      id: j.id, job_number: j.job_number, title: j.title,
      type: j.crm_job_types?.name, stage: j.crm_job_stages?.name, scheduled_date: j.scheduled_date,
    })),
    submission_count: submissionsResult.data?.length || 0,
  };
}

async function executeSearchJobs(supabase: any, input: { query?: string; job_type?: string; stage?: string; date_from?: string; date_to?: string; limit?: number }) {
  const limit = Math.min(input.limit || 10, 25);
  let query = supabase
    .from("crm_jobs")
    .select(`id, job_number, title, scheduled_date, priority, crm_customers(id, first_name, last_name, phone, email), crm_locations(address_line1, city, state, zip_code), crm_job_types(name, slug, category), crm_job_stages!crm_jobs_current_stage_id_fkey(name, stage_type), crm_job_appointments(start_datetime, end_datetime, crm_teams(name))`)
    .is("deleted_at", null)
    .limit(limit)
    .order("created_at", { ascending: false });

  if (input.query) {
    if (input.query.toUpperCase().startsWith("TRU-")) {
      query = query.ilike("job_number", `%${input.query}%`);
    } else {
      query = query.or(`job_number.ilike.%${input.query}%,title.ilike.%${input.query}%`);
    }
  }
  if (input.date_from) query = query.gte("scheduled_date", input.date_from);
  if (input.date_to) query = query.lte("scheduled_date", input.date_to);

  const { data, error } = await query;
  if (error) throw new Error(`Job search failed: ${error.message}`);

  let results = data || [];
  if (input.query && !input.query.toUpperCase().startsWith("TRU-")) {
    const searchLower = input.query.toLowerCase();
    results = results.filter((j: any) => {
      const name = `${j.crm_customers?.first_name || ""} ${j.crm_customers?.last_name || ""}`.toLowerCase();
      return name.includes(searchLower) || j.job_number?.toLowerCase().includes(searchLower) || j.title?.toLowerCase().includes(searchLower);
    });
  }

  return {
    count: results.length,
    jobs: results.map((j: any) => ({
      id: j.id, job_number: j.job_number, title: j.title,
      customer: j.crm_customers ? `${j.crm_customers.first_name || ""} ${j.crm_customers.last_name || ""}`.trim() : "Unknown",
      customer_phone: j.crm_customers?.phone,
      type: j.crm_job_types?.name, category: j.crm_job_types?.category,
      stage: j.crm_job_stages?.name, stage_type: j.crm_job_stages?.stage_type,
      location: j.crm_locations ? `${j.crm_locations.address_line1}, ${j.crm_locations.city}` : null,
      scheduled_date: j.scheduled_date, priority: j.priority,
      appointments: (j.crm_job_appointments || []).map((a: any) => ({ start: a.start_datetime, end: a.end_datetime, team: a.crm_teams?.name })),
    })),
  };
}

async function executeGetSchedule(supabase: any, input: { date_from?: string; date_to?: string; team_id?: string }) {
  const today = getCSTDateStr(new Date());
  const dateFrom = input.date_from || today;
  const dateTo = input.date_to || getCSTDateStr(new Date(Date.now() + 7 * 86400000));

  let query = supabase
    .from("crm_job_appointments")
    .select(`id, start_datetime, end_datetime, notes, title, crm_jobs(job_number, crm_customers(first_name, last_name, phone), crm_locations(address_line1, city, state), crm_job_types(name)), crm_teams(id, name, color)`)
    .gte("start_datetime", toCSTBoundary(dateFrom, "00:00"))
    .lte("start_datetime", toCSTBoundary(dateTo, "23:59"))
    .order("start_datetime");

  if (input.team_id) query = query.eq("assigned_team_id", input.team_id);

  const { data, error } = await query;
  if (error) throw new Error(`Schedule fetch failed: ${error.message}`);

  const byDate: Record<string, any[]> = {};
  (data || []).forEach((apt: any) => {
    const date = getCSTDateStr(new Date(apt.start_datetime));
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push({
      time_start: apt.start_datetime,
      time_end: apt.end_datetime,
      time_display: formatTimeCST(apt.start_datetime),
      end_time_display: apt.end_datetime ? formatTimeCST(apt.end_datetime) : undefined,
      job_number: apt.crm_jobs?.job_number,
      customer: apt.crm_jobs?.crm_customers ? `${apt.crm_jobs.crm_customers.first_name} ${apt.crm_jobs.crm_customers.last_name}` : "Unknown",
      customer_phone: apt.crm_jobs?.crm_customers?.phone,
      job_type: apt.crm_jobs?.crm_job_types?.name,
      location: apt.crm_jobs?.crm_locations ? `${apt.crm_jobs.crm_locations.address_line1}, ${apt.crm_jobs.crm_locations.city}` : null,
      team: apt.crm_teams?.name,
    });
  });

  return { date_range: { from: dateFrom, to: dateTo }, total_appointments: data?.length || 0, schedule: byDate };
}

async function executeGetSubmissionStats(supabase: any, input: { date_from?: string; date_to?: string; source?: string }) {
  const today = new Date().toISOString().split("T")[0];
  const dateFrom = input.date_from || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const dateTo = input.date_to || today;

  const tables = [
    { table: "contact_submissions", source: "contact", label: "Contact Form" },
    { table: "ducted_estimate_submissions", source: "ducted", label: "Ducted Estimates" },
    { table: "ductless_estimate_submissions", source: "ductless", label: "Ductless Estimates" },
    { table: "equipment_scans", source: "scanner", label: "Equipment Scans" },
    { table: "landing_page_submissions", source: "landing_page", label: "Landing Pages" },
  ];

  const filteredTables = input.source && input.source !== "all" ? tables.filter((t) => t.source === input.source) : tables;

  const results = await Promise.all(
    filteredTables.map(async (t) => {
      const { count, error } = await supabase
        .from(t.table)
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${dateFrom}T00:00:00`)
        .lte("created_at", `${dateTo}T23:59:59`);
      return { source: t.source, label: t.label, count: error ? 0 : count || 0 };
    })
  );

  return { period: { from: dateFrom, to: dateTo }, total: results.reduce((s, r) => s + r.count, 0), by_source: results };
}

async function executeGetRecentSubmissions(supabase: any, input: { limit?: number; source?: string }) {
  const limit = Math.min(input.limit || 10, 25);
  const results: any[] = [];

  async function fetchFrom(table: string, source: string, fields: string) {
    if (input.source && input.source !== source) return;
    const { data } = await supabase.from(table).select(fields).order("created_at", { ascending: false }).limit(limit);
    (data || []).forEach((d: any) => results.push({ ...d, _source: source }));
  }

  await Promise.all([
    fetchFrom("contact_submissions", "contact", "id, first_name, last_name, email, phone, service_type, message, status, created_at"),
    fetchFrom("ducted_estimate_submissions", "ducted", "id, first_name, last_name, email, phone, heating_type, recommended_tonnage, final_total, status, created_at"),
    fetchFrom("ductless_estimate_submissions", "ductless", "id, customer_name, customer_email, customer_phone, zone_count, final_total, status, created_at"),
    fetchFrom("landing_page_submissions", "landing_page", "id, first_name, last_name, email, phone, status, created_at"),
  ]);

  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    submissions: results.slice(0, limit).map((s) => ({
      id: s.id, source: s._source,
      name: s.customer_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unknown",
      email: s.customer_email || s.email, phone: s.customer_phone || s.phone,
      status: s.status || "new",
      details: s._source === "ducted" ? `${s.heating_type || "HVAC"} - ${s.recommended_tonnage}T - $${s.final_total}` :
               s._source === "ductless" ? `${s.zone_count} zones - $${s.final_total}` :
               s._source === "contact" ? (s.service_type || s.message?.substring(0, 100)) : "Landing page submission",
      date: s.created_at,
    })),
  };
}

async function executeGetPipelineOverview(supabase: any, input: { include_entries?: boolean }) {
  const [stagesResult, entriesResult] = await Promise.all([
    supabase.from("crm_pipeline_stages").select("id, name, display_name, color, is_won_stage, is_lost_stage, sort_order").order("sort_order"),
    supabase.from("crm_pipeline_entries").select(`id, estimated_value, probability, expected_close_date, stage_id, crm_customers(first_name, last_name)`).order("created_at", { ascending: false }),
  ]);

  const stages = stagesResult.data || [];
  const entries = entriesResult.data || [];

  const stageMap = stages.map((stage: any) => {
    const stageEntries = entries.filter((e: any) => e.stage_id === stage.id);
    return {
      stage: stage.display_name, color: stage.color,
      is_won: stage.is_won_stage, is_lost: stage.is_lost_stage,
      count: stageEntries.length,
      total_value: stageEntries.reduce((sum: number, e: any) => sum + (e.estimated_value || 0), 0),
      entries: input.include_entries ? stageEntries.map((e: any) => ({
        id: e.id,
        customer: `${e.crm_customers?.first_name || ""} ${e.crm_customers?.last_name || ""}`.trim(),
        value: e.estimated_value, probability: e.probability, expected_close: e.expected_close_date,
      })) : undefined,
    };
  });

  return {
    total_entries: stageMap.reduce((s: number, st: any) => s + st.count, 0),
    total_pipeline_value: stageMap.reduce((s: number, st: any) => (!st.is_lost ? s + st.total_value : s), 0),
    stages: stageMap,
  };
}

async function executeGetTeamInfo(supabase: any, input: { query?: string; team_id?: string }) {
  if (input.team_id) {
    const { data: team } = await supabase.from("crm_teams").select(`id, name, color, is_active, crm_team_assignments(is_lead, role_in_team, crm_team_members(id, first_name, last_name, role, certifications, specialties, license_number))`).eq("id", input.team_id).single();
    return { team };
  }

  let teamsQuery = supabase.from("crm_teams").select(`id, name, color, is_active, crm_team_assignments(is_lead, role_in_team, crm_team_members(id, first_name, last_name, role, certifications, specialties))`);
  if (input.query) teamsQuery = teamsQuery.ilike("name", `%${input.query}%`);
  const { data: teams } = await teamsQuery;

  let membersQuery = supabase.from("crm_team_members").select("id, first_name, last_name, role, certifications, specialties, license_number");
  if (input.query) membersQuery = membersQuery.or(`first_name.ilike.%${input.query}%,last_name.ilike.%${input.query}%`);
  const { data: members } = await membersQuery;

  return { teams: teams || [], members: members || [] };
}

// ============================================================
// PHASE 2: WRITE TOOL EXECUTION FUNCTIONS
// ============================================================

async function generateJobNumber(supabase: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TRU-${year}-`;
  const { data } = await supabase
    .from("crm_jobs")
    .select("job_number")
    .ilike("job_number", `${prefix}%`)
    .order("job_number", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].job_number.split("-").pop() || "0", 10);
    nextNum = lastNum + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

async function getDefaultStage(supabase: any, jobTypeId: string): Promise<any> {
  const { data } = await supabase
    .from("crm_job_stages")
    .select("id, name")
    .eq("job_type_id", jobTypeId)
    .eq("stage_type", "start")
    .order("sort_order")
    .limit(1);
  return data?.[0] || null;
}

async function executeCreateJob(supabase: any, userId: string, input: any) {
  const { data: jobType, error: jtError } = await supabase
    .from("crm_job_types")
    .select("id, name, slug, category, default_duration_hours")
    .eq("slug", input.job_type_slug)
    .single();

  if (jtError || !jobType) {
    const { data: types } = await supabase.from("crm_job_types").select("name, slug, category").eq("is_active", true);
    return { error: `Job type "${input.job_type_slug}" not found.`, available_types: types };
  }

  const { data: customer } = await supabase
    .from("crm_customers")
    .select("first_name, last_name, crm_locations(id, address_line1, city, is_primary)")
    .eq("id", input.customer_id)
    .single();

  if (!customer) return { error: "Customer not found." };

  let locationId = input.location_id;
  if (!locationId) {
    const primaryLocation = customer.crm_locations?.find((l: any) => l.is_primary) || customer.crm_locations?.[0];
    locationId = primaryLocation?.id;
  }
  const locationInfo = customer.crm_locations?.find((l: any) => l.id === locationId);

  if (!input.confirmed) {
    return {
      needs_confirmation: true,
      action: "create_job",
      summary: {
        customer: `${customer.first_name} ${customer.last_name}`,
        job_type: jobType.name,
        location: locationInfo ? `${locationInfo.address_line1}, ${locationInfo.city}` : "No location on file",
        scheduled_date: input.scheduled_date || "Not yet scheduled",
        notes: input.notes || "None",
      },
      confirmation_prompt: `Create a new **${jobType.name}** job for **${customer.first_name} ${customer.last_name}** at ${locationInfo ? `${locationInfo.address_line1}, ${locationInfo.city}` : "their primary address"}${input.scheduled_date ? ` scheduled for ${input.scheduled_date}` : ""}?`,
    };
  }

  const jobNumber = await generateJobNumber(supabase);
  const defaultStage = await getDefaultStage(supabase, jobType.id);

  const { data: job, error: createError } = await supabase
    .from("crm_jobs")
    .insert({
      job_number: jobNumber,
      customer_id: input.customer_id,
      location_id: locationId,
      job_type_id: jobType.id,
      current_stage_id: defaultStage?.id,
      title: `${jobType.name} - ${customer.first_name} ${customer.last_name}`,
      scheduled_date: input.scheduled_date || null,
      internal_notes: input.notes || null,
      created_by: userId,
    })
    .select("id, job_number")
    .single();

  if (createError) throw new Error(`Failed to create job: ${createError.message}`);

  await supabase.from("crm_interactions").insert({
    customer_id: input.customer_id,
    interaction_type: "note",
    content: `Job ${jobNumber} (${jobType.name}) created via AI Assistant`,
    logged_by: userId,
  });

  return { success: true, job_number: job.job_number, job_id: job.id, message: `Created job ${job.job_number} — ${jobType.name} for ${customer.first_name} ${customer.last_name}` };
}

async function executeUpdateJobStage(supabase: any, userId: string, input: any) {
  const { data: job, error: jobErr } = await supabase
    .from("crm_jobs")
    .select(`id, job_number, current_stage_id, job_type_id, crm_customers(first_name, last_name), crm_job_stages!crm_jobs_current_stage_id_fkey(name), crm_job_types(name)`)
    .eq("id", input.job_id)
    .single();

  if (jobErr || !job) return { error: "Job not found." };

  const { data: targetStage } = await supabase
    .from("crm_job_stages")
    .select("id, name, stage_type")
    .eq("job_type_id", job.job_type_id)
    .ilike("name", `%${input.target_stage_name}%`)
    .limit(1)
    .single();

  if (!targetStage) {
    const { data: stages } = await supabase.from("crm_job_stages").select("name, stage_type, sort_order").eq("job_type_id", job.job_type_id).order("sort_order");
    return { error: `Stage "${input.target_stage_name}" not found for this job type.`, available_stages: stages?.map((s: any) => s.name) };
  }

  const currentStageName = job.crm_job_stages?.name || "Unknown";
  const customerName = `${job.crm_customers?.first_name || ""} ${job.crm_customers?.last_name || ""}`.trim();

  if (!input.confirmed) {
    return {
      needs_confirmation: true, action: "update_job_stage",
      summary: { job_number: job.job_number, job_type: job.crm_job_types?.name, customer: customerName, current_stage: currentStageName, target_stage: targetStage.name },
      confirmation_prompt: `Move job **${job.job_number}** (${customerName}) from **${currentStageName}** → **${targetStage.name}**?`,
    };
  }

  const { error: updateErr } = await supabase.from("crm_jobs").update({ current_stage_id: targetStage.id, updated_at: new Date().toISOString() }).eq("id", input.job_id);
  if (updateErr) throw new Error(`Failed to update job: ${updateErr.message}`);

  await supabase.from("crm_job_stage_history").insert({ job_id: input.job_id, from_stage_id: job.current_stage_id, to_stage_id: targetStage.id, changed_by: userId, notes: input.notes || "Moved via AI Assistant" });

  return { success: true, message: `Moved ${job.job_number} from "${currentStageName}" to "${targetStage.name}"` };
}

async function executeLogInteraction(supabase: any, userId: string, input: any) {
  const { data: customer } = await supabase.from("crm_customers").select("first_name, last_name").eq("id", input.customer_id).single();
  if (!customer) return { error: "Customer not found." };
  const customerName = `${customer.first_name} ${customer.last_name}`;

  if (!input.confirmed) {
    return {
      needs_confirmation: true, action: "log_interaction",
      summary: { customer: customerName, type: input.interaction_type, direction: input.direction || "N/A", content: input.content, outcome: input.outcome || "None" },
      confirmation_prompt: `Add a **${input.direction ? input.direction + " " : ""}${input.interaction_type}** to **${customerName}**'s timeline?\n\n"${input.content}"${input.outcome ? `\nOutcome: ${input.outcome}` : ""}`,
    };
  }

  const { error } = await supabase.from("crm_interactions").insert({ customer_id: input.customer_id, interaction_type: input.interaction_type, direction: input.direction || null, content: input.content, outcome: input.outcome || null, logged_by: userId });
  if (error) throw new Error(`Failed to log interaction: ${error.message}`);

  return { success: true, message: `Logged ${input.interaction_type} for ${customerName}: "${input.content.substring(0, 80)}${input.content.length > 80 ? "..." : ""}"` };
}

async function executeUpdateCustomerStatus(supabase: any, userId: string, input: any) {
  const { data: customer } = await supabase.from("crm_customers").select("first_name, last_name, customer_status").eq("id", input.customer_id).single();
  if (!customer) return { error: "Customer not found." };
  const customerName = `${customer.first_name} ${customer.last_name}`;

  if (!input.confirmed) {
    return {
      needs_confirmation: true, action: "update_customer_status",
      summary: { customer: customerName, current_status: customer.customer_status, new_status: input.new_status, reason: input.reason || "No reason provided" },
      confirmation_prompt: `Change **${customerName}**'s status from **${customer.customer_status}** → **${input.new_status}**?${input.reason ? `\nReason: ${input.reason}` : ""}`,
    };
  }

  const { error } = await supabase.from("crm_customers").update({ customer_status: input.new_status, updated_at: new Date().toISOString() }).eq("id", input.customer_id);
  if (error) throw new Error(`Failed to update status: ${error.message}`);

  await supabase.from("crm_interactions").insert({ customer_id: input.customer_id, interaction_type: "note", content: `Status changed from ${customer.customer_status} to ${input.new_status}${input.reason ? `: ${input.reason}` : ""} (via AI Assistant)`, logged_by: userId });

  return { success: true, message: `Updated ${customerName}'s status from "${customer.customer_status}" to "${input.new_status}"` };
}

// ---- Editable field maps for update_customer / update_job ----
const CUSTOMER_EDITABLE = ["first_name", "last_name", "email", "phone", "alternate_phone", "preferred_contact_method", "customer_type", "company_name", "lead_source", "tags", "notes"] as const;
const JOB_EDITABLE = ["title", "scheduled_date", "scheduled_end_date", "priority", "quoted_amount", "final_amount", "payment_status", "internal_notes", "customer_notes", "location_id"] as const;

function buildUpdatePayload(input: any, allowed: readonly string[]) {
  const payload: Record<string, any> = {};
  const changes: { field: string; from: any; to: any }[] = [];
  for (const key of allowed) {
    if (input[key] === undefined) continue;
    // Empty string clears nullable text fields
    payload[key] = input[key] === "" ? null : input[key];
  }
  return { payload, changes };
}

function diffChanges(before: Record<string, any>, payload: Record<string, any>) {
  const changes: { field: string; from: any; to: any }[] = [];
  for (const [k, v] of Object.entries(payload)) {
    const prev = before[k];
    const same = Array.isArray(prev) && Array.isArray(v)
      ? JSON.stringify(prev) === JSON.stringify(v)
      : prev === v;
    if (!same) changes.push({ field: k, from: prev ?? null, to: v ?? null });
  }
  return changes;
}

async function executeUpdateCustomer(supabase: any, userId: string, input: any) {
  const { data: customer, error: fetchErr } = await supabase
    .from("crm_customers")
    .select("id, first_name, last_name, email, phone, alternate_phone, preferred_contact_method, customer_type, company_name, lead_source, tags, notes")
    .eq("id", input.customer_id)
    .is("deleted_at", null)
    .single();
  if (fetchErr || !customer) return { error: "Customer not found." };

  const { payload } = buildUpdatePayload(input, CUSTOMER_EDITABLE);
  if (Object.keys(payload).length === 0) {
    return { error: "No fields provided to update. Pass at least one editable field." };
  }
  const changes = diffChanges(customer, payload);
  if (changes.length === 0) {
    return { success: true, message: `No changes — all values already match for ${customer.first_name} ${customer.last_name}.` };
  }

  const customerName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "customer";
  if (!input.confirmed) {
    return {
      needs_confirmation: true,
      action: "update_customer",
      summary: {
        customer: customerName,
        changes: changes.map(c => `${c.field}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`),
      },
      confirmation_prompt: `Update **${customerName}** with these changes?\n${changes.map(c => `• **${c.field}**: ${c.from === null ? "(empty)" : c.from} → ${c.to === null ? "(empty)" : c.to}`).join("\n")}`,
    };
  }

  const { error: updateErr } = await supabase
    .from("crm_customers")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", input.customer_id);
  if (updateErr) throw new Error(`Failed to update customer: ${updateErr.message}`);

  await supabase.from("crm_interactions").insert({
    customer_id: input.customer_id,
    interaction_type: "note",
    content: `Customer updated via AI Assistant: ${changes.map(c => c.field).join(", ")}`,
    logged_by: userId,
  });

  return { success: true, message: `Updated ${customerName} — changed ${changes.map(c => c.field).join(", ")}.` };
}

async function executeUpdateJob(supabase: any, userId: string, input: any) {
  const { data: job, error: fetchErr } = await supabase
    .from("crm_jobs")
    .select("id, job_number, customer_id, title, scheduled_date, scheduled_end_date, priority, quoted_amount, final_amount, payment_status, internal_notes, customer_notes, location_id, crm_customers(first_name, last_name)")
    .eq("id", input.job_id)
    .is("deleted_at", null)
    .single();
  if (fetchErr || !job) return { error: "Job not found." };

  const { payload } = buildUpdatePayload(input, JOB_EDITABLE);
  if (Object.keys(payload).length === 0) {
    return { error: "No fields provided to update. Pass at least one editable field." };
  }

  // If a new location_id is provided, validate it belongs to this customer
  if (payload.location_id) {
    const { data: loc } = await supabase
      .from("crm_locations")
      .select("id, customer_id")
      .eq("id", payload.location_id)
      .single();
    if (!loc || loc.customer_id !== job.customer_id) {
      return { error: "Provided location_id does not belong to this job's customer." };
    }
  }

  const changes = diffChanges(job, payload);
  if (changes.length === 0) {
    return { success: true, message: `No changes — all values already match for ${job.job_number}.` };
  }

  const customerName = `${job.crm_customers?.first_name || ""} ${job.crm_customers?.last_name || ""}`.trim();
  if (!input.confirmed) {
    return {
      needs_confirmation: true,
      action: "update_job",
      summary: {
        job_number: job.job_number,
        customer: customerName,
        changes: changes.map(c => `${c.field}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`),
      },
      confirmation_prompt: `Update job **${job.job_number}** (${customerName}) with these changes?\n${changes.map(c => `• **${c.field}**: ${c.from === null ? "(empty)" : c.from} → ${c.to === null ? "(empty)" : c.to}`).join("\n")}`,
    };
  }

  const { error: updateErr } = await supabase
    .from("crm_jobs")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", input.job_id);
  if (updateErr) throw new Error(`Failed to update job: ${updateErr.message}`);

  await supabase.from("crm_interactions").insert({
    customer_id: job.customer_id,
    interaction_type: "note",
    content: `Job ${job.job_number} updated via AI Assistant: ${changes.map(c => c.field).join(", ")}`,
    logged_by: userId,
  });

  return { success: true, message: `Updated job ${job.job_number} — changed ${changes.map(c => c.field).join(", ")}.` };
}



async function executeAddToPipeline(supabase: any, userId: string, input: any) {
  const { data: customer } = await supabase.from("crm_customers").select("first_name, last_name").eq("id", input.customer_id).single();
  if (!customer) return { error: "Customer not found." };
  const customerName = `${customer.first_name} ${customer.last_name}`;

  const { data: stage } = await supabase.from("crm_pipeline_stages").select("id, name, display_name").ilike("display_name", `%${input.stage_name}%`).limit(1).single();
  if (!stage) {
    const { data: stages } = await supabase.from("crm_pipeline_stages").select("display_name").order("sort_order");
    return { error: `Stage "${input.stage_name}" not found.`, available_stages: stages?.map((s: any) => s.display_name) };
  }

  const { data: existing } = await supabase.from("crm_pipeline_entries").select("id, crm_pipeline_stages(display_name)").eq("customer_id", input.customer_id).limit(1);
  if (existing && existing.length > 0) {
    return { error: `${customerName} is already in the pipeline at "${existing[0].crm_pipeline_stages?.display_name}". Use move_pipeline_entry instead.` };
  }

  if (!input.confirmed) {
    return {
      needs_confirmation: true, action: "add_to_pipeline",
      summary: { customer: customerName, stage: stage.display_name, estimated_value: input.estimated_value ? `$${input.estimated_value.toLocaleString()}` : "Not set", probability: input.probability ? `${input.probability}%` : "Not set", expected_close: input.expected_close_date || "Not set" },
      confirmation_prompt: `Add **${customerName}** to the pipeline at **${stage.display_name}**${input.estimated_value ? ` with estimated value of **$${input.estimated_value.toLocaleString()}**` : ""}?`,
    };
  }

  const { error } = await supabase.from("crm_pipeline_entries").insert({ customer_id: input.customer_id, stage_id: stage.id, estimated_value: input.estimated_value || null, probability: input.probability || null, expected_close_date: input.expected_close_date || null });
  if (error) throw new Error(`Failed to add to pipeline: ${error.message}`);

  await supabase.from("crm_interactions").insert({ customer_id: input.customer_id, interaction_type: "note", content: `Added to pipeline at "${stage.display_name}"${input.estimated_value ? ` — Est. value: $${input.estimated_value.toLocaleString()}` : ""} (via AI Assistant)`, logged_by: userId });

  return { success: true, message: `Added ${customerName} to pipeline at "${stage.display_name}"` };
}

async function executeMovePipelineEntry(supabase: any, userId: string, input: any) {
  const { data: entry } = await supabase.from("crm_pipeline_entries").select(`id, estimated_value, crm_customers(first_name, last_name, id), crm_pipeline_stages(display_name)`).eq("id", input.entry_id).single();
  if (!entry) return { error: "Pipeline entry not found." };

  const { data: targetStage } = await supabase.from("crm_pipeline_stages").select("id, display_name").ilike("display_name", `%${input.target_stage_name}%`).limit(1).single();
  if (!targetStage) {
    const { data: stages } = await supabase.from("crm_pipeline_stages").select("display_name").order("sort_order");
    return { error: `Stage "${input.target_stage_name}" not found.`, available_stages: stages?.map((s: any) => s.display_name) };
  }

  const customerName = `${entry.crm_customers?.first_name} ${entry.crm_customers?.last_name}`;
  const currentStage = entry.crm_pipeline_stages?.display_name;

  if (!input.confirmed) {
    return {
      needs_confirmation: true, action: "move_pipeline_entry",
      summary: { customer: customerName, current_stage: currentStage, target_stage: targetStage.display_name, estimated_value: entry.estimated_value },
      confirmation_prompt: `Move **${customerName}** from **${currentStage}** → **${targetStage.display_name}** in the pipeline?`,
    };
  }

  const { error } = await supabase.from("crm_pipeline_entries").update({ stage_id: targetStage.id, updated_at: new Date().toISOString() }).eq("id", input.entry_id);
  if (error) throw new Error(`Failed to move pipeline entry: ${error.message}`);

  await supabase.from("crm_interactions").insert({ customer_id: entry.crm_customers?.id, interaction_type: "note", content: `Pipeline stage changed from "${currentStage}" to "${targetStage.display_name}" (via AI Assistant)`, logged_by: userId });

  return { success: true, message: `Moved ${customerName} from "${currentStage}" to "${targetStage.display_name}" in the pipeline` };
}

async function executeUpdatePipelineEntry(supabase: any, userId: string, input: any) {
  // Find the entry by entry_id or customer_id
  let entry: any;
  if (input.entry_id) {
    const { data } = await supabase.from("crm_pipeline_entries").select("id, estimated_value, probability, expected_close_date, notes, crm_customers(first_name, last_name, id), crm_pipeline_stages(display_name)").eq("id", input.entry_id).single();
    entry = data;
  } else if (input.customer_id) {
    const { data } = await supabase.from("crm_pipeline_entries").select("id, estimated_value, probability, expected_close_date, notes, crm_customers(first_name, last_name, id), crm_pipeline_stages(display_name)").eq("customer_id", input.customer_id).limit(1).single();
    entry = data;
  } else {
    return { error: "Provide either entry_id or customer_id." };
  }
  if (!entry) return { error: "Pipeline entry not found." };

  const customerName = `${entry.crm_customers?.first_name} ${entry.crm_customers?.last_name}`;
  const changes: string[] = [];
  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

  if (input.estimated_value !== undefined) {
    changes.push(`Estimated value: $${entry.estimated_value?.toLocaleString() || 0} → $${input.estimated_value.toLocaleString()}`);
    updateData.estimated_value = input.estimated_value;
  }
  if (input.probability !== undefined) {
    changes.push(`Probability: ${entry.probability || 0}% → ${input.probability}%`);
    updateData.probability = input.probability;
  }
  if (input.expected_close_date !== undefined) {
    changes.push(`Expected close: ${entry.expected_close_date || "Not set"} → ${input.expected_close_date}`);
    updateData.expected_close_date = input.expected_close_date;
  }
  if (input.notes !== undefined) {
    changes.push(`Notes updated`);
    updateData.notes = input.notes;
  }

  if (changes.length === 0) return { error: "No fields to update. Provide at least one of: estimated_value, probability, expected_close_date, notes." };

  if (!input.confirmed) {
    return {
      needs_confirmation: true, action: "update_pipeline_entry",
      summary: { customer: customerName, stage: entry.crm_pipeline_stages?.display_name, changes },
      confirmation_prompt: `Update **${customerName}**'s pipeline entry?\n${changes.map(c => `• ${c}`).join("\n")}`,
    };
  }

  const { error } = await supabase.from("crm_pipeline_entries").update(updateData).eq("id", entry.id);
  if (error) throw new Error(`Failed to update pipeline entry: ${error.message}`);

  await supabase.from("crm_interactions").insert({ customer_id: entry.crm_customers?.id, interaction_type: "note", content: `Pipeline entry updated: ${changes.join("; ")} (via AI Assistant)`, logged_by: userId });

  return { success: true, message: `Updated ${customerName}'s pipeline entry: ${changes.join(", ")}` };
}

// Job type color map for Google Calendar
const JOB_TYPE_COLORS: Record<string, string> = {
  install: "9", maintenance: "2", repair: "11", inspection: "5", consultation: "7", default: "1",
};

async function getCalendarIdForTeam(supabase: any, teamId: string | null): Promise<string | null> {
  if (!teamId) return null;
  const { data: team } = await supabase.from("crm_teams").select("google_calendar_id").eq("id", teamId).single();
  if (team?.google_calendar_id) {
    const { data: cal } = await supabase.from("google_calendars").select("calendar_id").eq("id", team.google_calendar_id).single();
    return cal?.calendar_id || null;
  }
  return null;
}

async function executeScheduleAppointment(supabase: any, userId: string, input: any) {
  const { data: job } = await supabase.from("crm_jobs").select(`id, job_number, customer_id, crm_customers(first_name, last_name, phone, email), crm_locations(address_line1, city, state, zip_code), crm_job_types(name, category)`).eq("id", input.job_id).single();
  if (!job) return { error: "Job not found." };

  let teamName = "Unassigned";
  if (input.team_id) {
    const { data: team } = await supabase.from("crm_teams").select("name").eq("id", input.team_id).single();
    teamName = team?.name || "Unknown team";
  }

  const customerName = `${job.crm_customers?.first_name} ${job.crm_customers?.last_name}`;
  const location = job.crm_locations ? `${job.crm_locations.address_line1}, ${job.crm_locations.city}, ${job.crm_locations.state} ${job.crm_locations.zip_code}` : "";

  const { data: conflicts } = await supabase
    .from("crm_job_appointments")
    .select("id, start_datetime, end_datetime, crm_jobs(job_number)")
    .eq("assigned_team_id", input.team_id || "none")
    .or(`and(start_datetime.lt.${input.end_datetime},end_datetime.gt.${input.start_datetime})`);

  const startTime = new Date(input.start_datetime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
  const endTime = new Date(input.end_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

  if (!input.confirmed) {
    return {
      needs_confirmation: true, action: "schedule_appointment",
      summary: { job_number: job.job_number, job_type: job.crm_job_types?.name, customer: customerName, location: location || "No location", time: `${startTime} – ${endTime}`, team: teamName, conflicts: conflicts?.length || 0 },
      confirmation_prompt: `Schedule **${job.job_number}** (${job.crm_job_types?.name}) for **${customerName}**:\n📅 ${startTime} – ${endTime}\n👷 ${teamName}\n📍 ${location || "No address"}\n🔗 Google Calendar event will be created${conflicts && conflicts.length > 0 ? `\n\n⚠️ **Warning:** ${conflicts.length} scheduling conflict(s) detected for this team at this time.` : ""}`,
    };
  }

  const { data: appointment, error } = await supabase
    .from("crm_job_appointments")
    .insert({ job_id: input.job_id, start_datetime: input.start_datetime, end_datetime: input.end_datetime, assigned_team_id: input.team_id || null, notes: input.notes || null })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to schedule: ${error.message}`);

  // Google Calendar sync
  let calendarResult = null;
  if (!input.skip_calendar) {
    try {
      const calendarDescription = [
        `Job: ${job.job_number}`,
        `Type: ${job.crm_job_types?.name}`,
        `Customer: ${customerName}`,
        `Phone: ${job.crm_customers?.phone || "N/A"}`,
        `Email: ${job.crm_customers?.email || "N/A"}`,
        input.notes ? `\nNotes: ${input.notes}` : "",
        `\n---\nManaged by Truficient AI Assistant`,
      ].filter(Boolean).join("\n");

      const calendarId = await getCalendarIdForTeam(supabase, input.team_id);
      let targetCalId = calendarId;
      if (!targetCalId) {
        const { data: activeCals } = await supabase.from("google_calendars").select("calendar_id").eq("is_active", true).eq("is_primary", true).limit(1);
        targetCalId = activeCals?.[0]?.calendar_id;
      }

      if (targetCalId) {
        const colorId = JOB_TYPE_COLORS[job.crm_job_types?.category || "default"] || JOB_TYPE_COLORS.default;
        const { data: gcalResult, error: gcalError } = await supabase.functions.invoke("google-calendar-sync", {
          body: {
            action: "create-event",
            calendarId: targetCalId,
            event: {
              summary: `${job.crm_job_types?.name} — ${customerName} (${job.job_number})`,
              description: calendarDescription,
              location: location,
              start: { dateTime: input.start_datetime, timeZone: "America/Chicago" },
              end: { dateTime: input.end_datetime, timeZone: "America/Chicago" },
              colorId: colorId,
            },
          },
        });

        if (gcalError) {
          console.error("Calendar sync failed:", gcalError);
          calendarResult = { synced: false, error: gcalError.message };
        } else {
          if (gcalResult?.id) {
            await supabase.from("crm_job_appointments").update({ google_calendar_event_id: gcalResult.id }).eq("id", appointment.id);
          }
          calendarResult = { synced: true, event_id: gcalResult?.id, calendar_link: gcalResult?.htmlLink };
        }
      }
    } catch (calErr: any) {
      console.error("Calendar sync error:", calErr);
      calendarResult = { synced: false, error: calErr.message };
    }
  }

  return {
    success: true, appointment_id: appointment.id,
    message: `Scheduled ${job.job_number} for ${startTime} – ${endTime} with ${teamName}`,
    calendar: calendarResult,
  };
}

async function executeRescheduleAppointment(supabase: any, userId: string, input: any) {
  const { data: apt } = await supabase
    .from("crm_job_appointments")
    .select(`id, start_datetime, end_datetime, assigned_team_id, google_calendar_event_id, crm_jobs(job_number, customer_id, crm_customers(first_name, last_name, phone), crm_locations(address_line1, city, state, zip_code), crm_job_types(name, category)), crm_teams(name, google_calendar_id)`)
    .eq("id", input.appointment_id)
    .single();

  if (!apt) return { error: "Appointment not found." };

  const customerName = `${apt.crm_jobs?.crm_customers?.first_name} ${apt.crm_jobs?.crm_customers?.last_name}`;
  const jobNumber = apt.crm_jobs?.job_number;

  const oldStart = new Date(apt.start_datetime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
  const newStart = new Date(input.new_start_datetime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
  const newEnd = new Date(input.new_end_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

  let newTeamName = apt.crm_teams?.name || "Unassigned";
  if (input.new_team_id && input.new_team_id !== apt.assigned_team_id) {
    const { data: team } = await supabase.from("crm_teams").select("name").eq("id", input.new_team_id).single();
    newTeamName = team?.name || "Unknown team";
  }

  if (!input.confirmed) {
    return {
      needs_confirmation: true, action: "reschedule_appointment",
      summary: { job_number: jobNumber, customer: customerName, old_time: oldStart, new_time: `${newStart} – ${newEnd}`, team: newTeamName, reason: input.reason || "No reason given", has_calendar_event: !!apt.google_calendar_event_id },
      confirmation_prompt: `Reschedule **${jobNumber}** (${customerName})?\n\n📅 **From:** ${oldStart}\n📅 **To:** ${newStart} – ${newEnd}\n👷 ${newTeamName}${input.reason ? `\n💬 Reason: ${input.reason}` : ""}${apt.google_calendar_event_id ? "\n🔗 Google Calendar event will be updated" : ""}`,
    };
  }

  const updateData: any = { start_datetime: input.new_start_datetime, end_datetime: input.new_end_datetime, notes: input.reason ? `Rescheduled: ${input.reason}` : null, updated_at: new Date().toISOString() };
  if (input.new_team_id) updateData.assigned_team_id = input.new_team_id;

  const { error } = await supabase.from("crm_job_appointments").update(updateData).eq("id", input.appointment_id);
  if (error) throw new Error(`Failed to reschedule: ${error.message}`);

  let calendarUpdated = false;
  if (apt.google_calendar_event_id) {
    try {
      const calendarId = await getCalendarIdForTeam(supabase, input.new_team_id || apt.assigned_team_id);
      let targetCalId = calendarId;
      if (!targetCalId) {
        const { data: activeCals } = await supabase.from("google_calendars").select("calendar_id").eq("is_active", true).eq("is_primary", true).limit(1);
        targetCalId = activeCals?.[0]?.calendar_id;
      }
      if (targetCalId) {
        await supabase.functions.invoke("google-calendar-sync", {
          body: {
            action: "update-event", calendarId: targetCalId, eventId: apt.google_calendar_event_id,
            event: { summary: `${apt.crm_jobs?.crm_job_types?.name} — ${customerName} (${jobNumber})`, start: { dateTime: input.new_start_datetime, timeZone: "America/Chicago" }, end: { dateTime: input.new_end_datetime, timeZone: "America/Chicago" } },
          },
        });
        calendarUpdated = true;
      }
    } catch (err) { console.error("Calendar update failed:", err); }
  }

  await supabase.from("crm_interactions").insert({ customer_id: apt.crm_jobs?.customer_id, interaction_type: "note", content: `Appointment for ${jobNumber} rescheduled from ${oldStart} to ${newStart}${input.reason ? ` — ${input.reason}` : ""} (via AI Assistant)`, logged_by: userId });

  return { success: true, message: `Rescheduled ${jobNumber} to ${newStart} – ${newEnd}${calendarUpdated ? " (calendar updated)" : ""}` };
}

async function executeCancelAppointment(supabase: any, userId: string, input: any) {
  const { data: apt } = await supabase
    .from("crm_job_appointments")
    .select(`id, start_datetime, end_datetime, google_calendar_event_id, assigned_team_id, crm_jobs(job_number, customer_id, crm_customers(first_name, last_name), crm_job_types(name)), crm_teams(name, google_calendar_id)`)
    .eq("id", input.appointment_id)
    .single();

  if (!apt) return { error: "Appointment not found." };

  const customerName = `${apt.crm_jobs?.crm_customers?.first_name} ${apt.crm_jobs?.crm_customers?.last_name}`;
  const jobNumber = apt.crm_jobs?.job_number;
  const aptTime = new Date(apt.start_datetime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

  if (!input.confirmed) {
    return {
      needs_confirmation: true, action: "cancel_appointment",
      summary: { job_number: jobNumber, customer: customerName, job_type: apt.crm_jobs?.crm_job_types?.name, time: aptTime, team: apt.crm_teams?.name || "Unassigned", has_calendar_event: !!apt.google_calendar_event_id },
      confirmation_prompt: `Cancel the appointment for **${jobNumber}** (${customerName})?\n📅 ${aptTime}\n👷 ${apt.crm_teams?.name || "Unassigned"}${apt.google_calendar_event_id ? "\n🔗 Google Calendar event will be deleted" : ""}${input.reason ? `\n💬 Reason: ${input.reason}` : ""}\n\n⚠️ This removes the appointment but keeps the job.`,
    };
  }

  if (apt.google_calendar_event_id) {
    try {
      const calendarId = await getCalendarIdForTeam(supabase, apt.assigned_team_id);
      let targetCalId = calendarId;
      if (!targetCalId) {
        const { data: activeCals } = await supabase.from("google_calendars").select("calendar_id").eq("is_active", true).eq("is_primary", true).limit(1);
        targetCalId = activeCals?.[0]?.calendar_id;
      }
      if (targetCalId) {
        await supabase.functions.invoke("google-calendar-sync", { body: { action: "delete-event", calendarId: targetCalId, eventId: apt.google_calendar_event_id } });
      }
    } catch (err) { console.error("Calendar delete failed:", err); }
  }

  const { error } = await supabase.from("crm_job_appointments").delete().eq("id", input.appointment_id);
  if (error) throw new Error(`Failed to cancel: ${error.message}`);

  await supabase.from("crm_interactions").insert({ customer_id: apt.crm_jobs?.customer_id, interaction_type: "note", content: `Appointment for ${jobNumber} on ${aptTime} cancelled${input.reason ? `: ${input.reason}` : ""} (via AI Assistant)`, logged_by: userId });

  return { success: true, message: `Cancelled appointment for ${jobNumber} on ${aptTime}` };
}

async function executeGetGoogleCalendar(supabase: any, input: any) {
  const today = new Date().toISOString().split("T")[0];
  const dateFrom = input.date_from || today;
  const dateTo = input.date_to || new Date(new Date(dateFrom).getTime() + 7 * 86400000).toISOString().split("T")[0];

  let calendarIds: string[] = [];
  if (input.team_id) {
    const calId = await getCalendarIdForTeam(supabase, input.team_id);
    if (calId) calendarIds = [calId];
  }
  if (calendarIds.length === 0) {
    const { data: activeCals } = await supabase.from("google_calendars").select("calendar_id").eq("is_active", true);
    calendarIds = (activeCals || []).map((c: any) => c.calendar_id);
  }

  if (calendarIds.length === 0) return { date_range: { from: dateFrom, to: dateTo }, total_events: 0, events: [], note: "No active calendars configured." };

  const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
    body: { action: "get-all-events", timeMin: `${dateFrom}T00:00:00-06:00`, timeMax: `${dateTo}T23:59:59-06:00`, calendarIds },
  });

  if (error) throw new Error(`Calendar read failed: ${error.message}`);

  const events = (data?.items || []).map((e: any) => ({
    summary: e.summary, location: e.location,
    start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date,
    status: e.status, calendar: e.calendarId,
  }));

  return { date_range: { from: dateFrom, to: dateTo }, total_events: events.length, events };
}

async function executeGetJobTypes(supabase: any) {
  const { data } = await supabase.from("crm_job_types").select("id, name, slug, category, default_duration_hours, requires_permit").eq("is_active", true).order("sort_order");
  return { job_types: data || [] };
}

async function executeGetPipelineStages(supabase: any) {
  const { data } = await supabase.from("crm_pipeline_stages").select("id, name, display_name, color, is_won_stage, is_lost_stage, sort_order").order("sort_order");
  return { stages: data || [] };
}

async function findExistingCustomer(supabase: any, firstName: string, lastName: string, email?: string, phone?: string) {
  // Check by email first (strongest match)
  if (email) {
    const { data } = await supabase
      .from("crm_customers")
      .select("id, first_name, last_name, email, phone")
      .ilike("email", email)
      .is("deleted_at", null)
      .limit(1)
      .single();
    if (data) return data;
  }
  // Check by name + phone
  if (phone && firstName) {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const { data } = await supabase
      .from("crm_customers")
      .select("id, first_name, last_name, email, phone")
      .ilike("first_name", firstName)
      .ilike("last_name", lastName || "")
      .is("deleted_at", null);
    if (data?.length) {
      const match = data.find((c: any) => c.phone?.replace(/\D/g, "").slice(-10) === cleanPhone);
      if (match) return match;
    }
  }
  // Check by exact name match (weaker)
  if (firstName && lastName) {
    const { data } = await supabase
      .from("crm_customers")
      .select("id, first_name, last_name, email, phone")
      .ilike("first_name", firstName)
      .ilike("last_name", lastName)
      .is("deleted_at", null)
      .limit(1)
      .single();
    if (data) return data;
  }
  return null;
}

async function executeCreateCustomer(supabase: any, userId: string, input: any) {
  const customerName = `${input.first_name} ${input.last_name}`;
  const hasAddress = input.address_line1 && input.city && input.zip_code;

  // Check for existing customer BEFORE confirmation
  const existing = await findExistingCustomer(supabase, input.first_name, input.last_name, input.email, input.phone);
  if (existing && !input.force_create) {
    return {
      duplicate_found: true,
      existing_customer: existing,
      message: `⚠️ A customer named **${existing.first_name} ${existing.last_name}** already exists (ID: ${existing.id})${existing.email ? ` — ${existing.email}` : ""}${existing.phone ? ` — ${existing.phone}` : ""}. Use the existing customer or say "force create" to create a new record anyway.`,
    };
  }

  if (!input.confirmed) {
    return {
      needs_confirmation: true,
      action: "create_customer",
      summary: {
        name: customerName,
        email: input.email || "Not provided",
        phone: input.phone || "Not provided",
        address: hasAddress ? `${input.address_line1}, ${input.city}, ${input.state || "TX"} ${input.zip_code}` : "No address",
        type: input.customer_type || "residential",
        lead_source: input.lead_source || "Not set",
        tags: input.tags?.length ? input.tags.join(", ") : "None",
      },
      confirmation_prompt: `Create new customer **${customerName}**?\n📧 ${input.email || "No email"}\n📱 ${input.phone || "No phone"}${hasAddress ? `\n📍 ${input.address_line1}, ${input.city}, ${input.state || "TX"} ${input.zip_code}` : ""}${input.lead_source ? `\n🔗 Source: ${input.lead_source}` : ""}`,
    };
  }

  const { data: customer, error: custError } = await supabase
    .from("crm_customers")
    .insert({
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email || null,
      phone: input.phone || null,
      customer_type: input.customer_type || "residential",
      customer_status: "lead",
      lead_source: input.lead_source || null,
      tags: input.tags || null,
    })
    .select("id")
    .single();

  if (custError) throw new Error(`Failed to create customer: ${custError.message}`);

  // Create primary location if address provided + auto property lookup
  let propertyInfo = "";
  if (hasAddress) {
    const { data: locData } = await supabase.from("crm_locations").insert({
      customer_id: customer.id,
      address_line1: input.address_line1,
      city: input.city,
      state: input.state || "TX",
      zip_code: input.zip_code,
      is_primary: true,
    }).select("id").single();

    // Auto property lookup (non-blocking)
    if (locData) {
      try {
        const propResult = await lookupPropertyAndSave(supabase, input.address_line1, input.city, input.state || "TX", input.zip_code, locData.id);
        if (propResult.found) {
          const d = propResult.data;
          propertyInfo = ` (${d.squareFootage ? d.squareFootage.toLocaleString() + " sqft" : ""}${d.yearBuilt ? ", built " + d.yearBuilt : ""})`.replace(" (, ", " (").replace("( ,", "(");
        }
      } catch (e) {
        console.error("Auto property lookup in create_customer failed:", e);
      }
    }
  }

  // Log system interaction
  await supabase.from("crm_interactions").insert({
    customer_id: customer.id,
    interaction_type: "note",
    content: `Customer created via AI Assistant${input.lead_source ? ` — Source: ${input.lead_source}` : ""}`,
    logged_by: userId,
  });

  return {
    success: true,
    customer_id: customer.id,
    message: `Created customer **${customerName}**${hasAddress ? ` with address at ${input.city}${propertyInfo}` : ""}`,
  };
}

// ============================================================
// CHAINED WRITE TOOL: INTAKE LEAD
// ============================================================

function resolveIntakePipelineStage(leadSource: string | undefined): string {
  if (!leadSource) return "New Lead";
  const src = leadSource.toLowerCase();
  if (src.includes("mitsubishi") || src.includes("partner") || src.includes("referral")) return "Contacted";
  if (src.includes("google") || src.includes("facebook") || src.includes("scanner") || src.includes("estimator")) return "New Lead";
  return "New Lead";
}

async function executeIntakeLead(supabase: any, userId: string, input: any) {
  const customerName = `${input.first_name} ${input.last_name}`;
  const hasAddress = !!(input.address_line1 && input.city && input.zip_code);
  const resolvedStageName = resolveIntakePipelineStage(input.lead_source);

  // Look up the actual pipeline stage
  const { data: stage } = await supabase
    .from("crm_pipeline_stages")
    .select("id, display_name")
    .ilike("display_name", `%${resolvedStageName}%`)
    .order("sort_order")
    .limit(1)
    .single();

  if (!stage) {
    const { data: stages } = await supabase.from("crm_pipeline_stages").select("display_name").order("sort_order");
    return { error: `Pipeline stage "${resolvedStageName}" not found.`, available_stages: stages?.map((s: any) => s.display_name) };
  }

  // === CONFIRMATION PREVIEW ===
  if (!input.confirmed) {
    const addressDisplay = hasAddress
      ? `${input.address_line1}, ${input.city}, ${input.state || "TX"} ${input.zip_code}`
      : "not provided";

    return {
      needs_confirmation: true,
      action: "intake_lead",
      summary: {
        name: customerName,
        email: input.email || "not provided",
        phone: input.phone || "not provided",
        address: addressDisplay,
        lead_source: input.lead_source || "not provided",
        pipeline_stage: stage.display_name,
        tags: input.tags?.length ? input.tags.join(", ") : "none",
        notes: input.notes || "none",
      },
      confirmation_prompt: `Ready to intake lead:\n\n👤 **${customerName}**\n📧 ${input.email || "—"} / 📱 ${input.phone || "—"}\n📍 ${addressDisplay}\n🏷️ Source: ${input.lead_source || "—"}\n📊 Pipeline: **${stage.display_name}**\n🏷️ Tags: ${input.tags?.length ? input.tags.join(", ") : "none"}\n📝 Notes: ${input.notes || "none"}\n\nReply "yes" to confirm or provide corrections.`,
    };
  }

  // === EXECUTE CHAIN ===
  const results: Record<string, string> = {};

  // Step 1: Check for existing customer first
  const existing = await findExistingCustomer(supabase, input.first_name, input.last_name, input.email, input.phone);
  let customer: any;

  if (existing && !input.force_create) {
    // Use the existing customer instead of creating a duplicate
    customer = existing;
    results.customer = `✓ Using existing customer: ${existing.first_name} ${existing.last_name} (${existing.id})`;
  } else {
    const { data: newCustomer, error: custError } = await supabase
      .from("crm_customers")
      .insert({
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email || null,
        phone: input.phone || null,
        customer_type: input.customer_type || "residential",
        customer_status: "lead",
        lead_source: input.lead_source || null,
        tags: input.tags || null,
      })
      .select("id")
      .single();

    if (custError) return { error: `Failed to create customer: ${custError.message}` };
    customer = newCustomer;
    results.customer = `✓ Customer created: ${customer.id}`;
  }

  // Step 2: Create Location (if address provided) + auto property lookup
  if (hasAddress) {
    const { data: locData, error: locError } = await supabase.from("crm_locations").insert({
      customer_id: customer.id,
      address_line1: input.address_line1,
      city: input.city,
      state: input.state || "TX",
      zip_code: input.zip_code,
      is_primary: true,
    }).select("id").single();
    if (locError) return { error: `Customer created but location failed: ${locError.message}`, customer_id: customer.id };
    results.location = "✓ Location added";

    // Auto address verification (non-blocking, warning only)
    try {
      const verifyResult = await verifyAddressViaGoogle(input.address_line1, input.city, input.state || "TX", input.zip_code);
      if (verifyResult.verified) {
        // Save verified components + coordinates to location
        const verifiedUpdate: Record<string, any> = {
          county: verifyResult.components.county || null,
          google_place_id: verifyResult.place_id || null,
          latitude: verifyResult.coordinates.lat || null,
          longitude: verifyResult.coordinates.lng || null,
        };
        // Only overwrite address fields if google returned a cleaner version
        if (verifyResult.components.street) verifiedUpdate.address_line1 = verifyResult.components.street;
        if (verifyResult.components.city) verifiedUpdate.city = verifyResult.components.city;
        if (verifyResult.components.state) verifiedUpdate.state = verifyResult.components.state;
        if (verifyResult.components.zip_code) verifiedUpdate.zip_code = verifyResult.components.zip_code;

        await supabase.from("crm_locations").update(verifiedUpdate).eq("id", locData.id);
        results.address_verify = verifyResult.is_dfw
          ? "✓ Address verified — in DFW service area"
          : `⚠️ Address verified — ZIP ${verifyResult.components.zip_code} is outside DFW service area`;
      } else {
        results.address_verify = "⚠️ Address could not be verified via Google — saved as entered";
      }
    } catch (verifyErr: any) {
      console.error("Auto address verification failed:", verifyErr);
      results.address_verify = "— Address verification: skipped (error)";
    }

    // Auto property lookup (non-blocking)
    try {
      const propResult = await lookupPropertyAndSave(supabase, input.address_line1, input.city, input.state || "TX", input.zip_code, locData.id);
      if (propResult.found) {
        const d = propResult.data;
        results.property = `✓ Property data: ${d.squareFootage ? d.squareFootage.toLocaleString() + " sqft" : ""}${d.yearBuilt ? ", built " + d.yearBuilt : ""}${d.stories ? ", " + d.stories + " story" : ""}`.replace(/^✓ Property data: ,\s*/, "✓ Property data: ");
      } else {
        results.property = "— Property lookup: no data found";
      }
    } catch (propErr: any) {
      console.error("Auto property lookup failed:", propErr);
      results.property = "— Property lookup: failed silently";
    }
  } else {
    results.location = "— Skipped (no address)";
  }

  // Step 3: Add to Pipeline
  const { error: pipeError } = await supabase.from("crm_pipeline_entries").insert({
    customer_id: customer.id,
    stage_id: stage.id,
  });
  if (pipeError) return { error: `Customer created but pipeline add failed: ${pipeError.message}`, customer_id: customer.id };
  results.pipeline = `✓ Added to pipeline: ${stage.display_name}`;

  // Step 4: Log Interaction
  const interactionContent = `Lead intake via Bach Assistant. Source: ${input.lead_source || "unknown"}.${input.notes ? ` Notes: ${input.notes}` : ""}`;
  await supabase.from("crm_interactions").insert({
    customer_id: customer.id,
    interaction_type: "system_intake",
    direction: null,
    content: interactionContent,
    logged_by: userId,
  });
  results.interaction = "✓ Interaction logged";

  return {
    success: true,
    customer_id: customer.id,
    message: `Lead intake complete:\n${results.customer}\n${results.location}\n${results.address_verify || ""}\n${results.property || ""}\n${results.pipeline}\n${results.interaction}`.replace(/\n\n+/g, "\n"),
  };
}

// ============================================================
// SUBMISSION REVIEW TOOL
// ============================================================

const DFW_ZIPS = new Set([
  "75001","75002","75006","75007","75009","75010","75013","75019","75023","75024","75025",
  "75028","75032","75034","75035","75038","75039","75040","75041","75042","75043","75044",
  "75048","75050","75051","75052","75054","75056","75057","75060","75061","75062","75063",
  "75065","75067","75068","75069","75070","75071","75074","75075","75076","75077","75078",
  "75080","75081","75082","75083","75085","75086","75087","75088","75089","75093","75094",
  "75098","75099","75104","75115","75116","75134","75137","75141","75146","75149","75150",
  "75154","75159","75166","75180","75181","75182","75201","75202","75203","75204","75205",
  "75206","75207","75208","75209","75210","75211","75212","75214","75215","75216","75217",
  "75218","75219","75220","75221","75222","75223","75224","75225","75226","75227","75228",
  "75229","75230","75231","75232","75233","75234","75235","75236","75237","75238","75240",
  "75241","75242","75243","75244","75245","75246","75247","75248","75249","75250","75251",
  "75252","75253","75254","75260","75261","75262","75263","75264","75265","75266","75267",
  "75270","75275","75277","75283","75284","75285","75287","75301","75303","75312","75313",
  "75315","75320","75326","75336","75339","75342","75354","75355","75356","75357","75359",
  "75360","75367","75368","75370","75371","75372","75373","75374","75376","75378","75379",
  "75380","75381","75382","75386","75387","75388","75389","75390","75391","75392","75393",
  "75394","75395","75396","75397","75398","75401","76001","76002","76003","76004","76005",
  "76006","76010","76011","76012","76013","76014","76015","76016","76017","76018","76019",
  "76020","76021","76022","76028","76034","76036","76039","76040","76044","76051","76052",
  "76053","76054","76058","76059","76060","76063","76064","76065","76071","76078","76082",
  "76092","76094","76095","76096","76097","76098","76099","76101","76102","76103","76104",
  "76105","76106","76107","76108","76109","76110","76111","76112","76113","76114","76115",
  "76116","76117","76118","76119","76120","76121","76122","76123","76124","76126","76127",
  "76129","76130","76131","76132","76133","76134","76135","76136","76137","76140","76148",
  "76150","76155","76161","76162","76163","76164","76177","76179","76180","76181","76182",
  "76185","76191","76192","76193","76195","76196","76197","76198","76199","76201","76205",
  "76207","76208","76209","76210","76226","76227","76244","76247","76248","76249","76258",
  "76259","76262","76266",
]);

const HVAC_KEYWORDS = /\b(hvac|ac\b|a\/c|heat|cool|heating|cooling|mini.?split|ductless|furnace|install|replace|repair|estimate|quote|air.?condition|compressor|condenser|thermostat|refrigerant|tonnage|seer|heat.?pump)\b/i;
const JUNK_KEYWORDS = /\b(seo|marketing|leads|ranking|website|agency|partnership|collaboration|web.?design|social.?media|digital.?marketing|link.?building|backlink|ppc|content.?marketing)\b/i;
const SPAM_DOMAINS = /(marketing\.|promo\.|leads\.|seo\.|agency\.|digital\.|webdesign\.|info@|noreply@|sales@.*agency)/i;
const GENERIC_NAMES = new Set(["test user", "john smith", "jane doe", "admin", "test", "asdf", "qwerty"]);

interface ScoredSubmission {
  id: string;
  source_table: string;
  source_label: string;
  name: string;
  email: string | null;
  phone: string | null;
  zip: string | null;
  message: string | null;
  details: string;
  score: "real" | "junk" | "unsure";
  reasons: string[];
  intake_params: any;
}

function scoreSubmission(sub: ScoredSubmission): void {
  const realSignals: string[] = [];
  const junkSignals: string[] = [];

  // DFW zip
  if (sub.zip && DFW_ZIPS.has(sub.zip)) realSignals.push("DFW zip code");
  if (sub.zip && !DFW_ZIPS.has(sub.zip) && sub.zip.length === 5) junkSignals.push("out-of-service-area zip");

  // HVAC keywords in message
  if (sub.message && HVAC_KEYWORDS.test(sub.message)) realSignals.push("HVAC keywords in message");

  // Estimator submissions always real
  if (sub.source_table === "ducted_estimate_submissions" || sub.source_table === "ductless_estimate_submissions") {
    realSignals.push("completed multi-step estimator");
  }

  // Phone present and valid
  if (sub.phone && sub.phone.replace(/\D/g, "").length >= 10) realSignals.push("valid phone number");

  // Junk checks
  if (sub.message && JUNK_KEYWORDS.test(sub.message)) junkSignals.push("spam/marketing message");
  if (sub.email && SPAM_DOMAINS.test(sub.email)) junkSignals.push("known spam email domain");
  if (GENERIC_NAMES.has(sub.name.toLowerCase().trim())) junkSignals.push("generic/test name");
  if (!sub.phone && !sub.zip && (!sub.message || sub.message.length < 20)) junkSignals.push("no phone, no address, vague message");

  // Equipment scanner specific
  if (sub.source_table === "equipment_scans" && !sub.email) junkSignals.push("scanner with no email");

  sub.reasons = [...realSignals, ...junkSignals];

  if (junkSignals.length > 0 && realSignals.length === 0) {
    sub.score = "junk";
  } else if (realSignals.length > 0 && junkSignals.length === 0) {
    sub.score = "real";
  } else if (realSignals.length > 0 && junkSignals.length > 0) {
    sub.score = "unsure";
  } else {
    sub.score = "unsure";
  }
}

const SOURCE_LABEL_MAP: Record<string, string> = {
  contact_submissions: "Website Contact Form",
  ductless_estimate_submissions: "Ductless Estimator",
  ducted_estimate_submissions: "Ducted Estimator",
  equipment_scans: "Equipment Scanner",
  landing_page_submissions: "Landing Page",
};

async function executeReviewSubmissions(supabase: any, userId: string, input: any) {
  const lookbackHours = input.lookback_hours || 48;
  const cutoff = new Date(Date.now() - lookbackHours * 3600000).toISOString();

  // === HANDLE ARCHIVE ===
  if (input.confirmed_archive && input.confirmed_archive.length > 0) {
    const archiveResults: string[] = [];
    for (const id of input.confirmed_archive) {
      // Try updating status in each table until one succeeds
      for (const table of ["contact_submissions", "ducted_estimate_submissions", "ductless_estimate_submissions", "equipment_scans", "landing_page_submissions"]) {
        const { error, count } = await supabase.from(table).update({ status: "archived" }).eq("id", id).select("id");
        if (!error && count > 0) {
          archiveResults.push(id);
          break;
        }
      }
    }
    return { success: true, archived_count: archiveResults.length, message: `Archived ${archiveResults.length} submission(s).` };
  }

  // === HANDLE INTAKE ===
  if (input.confirmed_intake && input.confirmed_intake.length > 0) {
    const intakeResults: any[] = [];
    // We need to fetch the submissions to get their data for intake
    // The AI should have the scored data from a previous call, but we re-fetch to be safe
    for (const id of input.confirmed_intake) {
      let found = false;
      // Try each table
      for (const tableInfo of [
        { table: "contact_submissions", fields: "id, first_name, last_name, email, phone, service_type, message, status" },
        { table: "ducted_estimate_submissions", fields: "id, first_name, last_name, email, phone, address, city, state, zip_code, heating_type, recommended_tonnage, final_total, status" },
        { table: "ductless_estimate_submissions", fields: "id, customer_name, customer_email, customer_phone, customer_address, customer_city, customer_state, customer_zip, zone_count, final_total, selected_tier, status" },
        { table: "equipment_scans", fields: "id, email, zip_code, brand, equipment_type, estimated_age, status" },
        { table: "landing_page_submissions", fields: "id, first_name, last_name, email, phone, message, status" },
      ]) {
        const { data } = await supabase.from(tableInfo.table).select(tableInfo.fields).eq("id", id).single();
        if (data) {
          found = true;
          // Build intake params from submission
          const params = buildIntakeParams(data, tableInfo.table);
          // Run intake_lead directly
          const result = await executeIntakeLead(supabase, userId, { ...params, confirmed: true });
          intakeResults.push({ id, source: tableInfo.table, result });
          // Mark submission as converted
          if (result.success) {
            await supabase.from(tableInfo.table).update({ status: "converted" }).eq("id", id);
          }
          break;
        }
      }
      if (!found) intakeResults.push({ id, error: "Submission not found" });
    }
    return {
      success: true,
      intake_count: intakeResults.filter(r => r.result?.success).length,
      results: intakeResults.map(r => ({
        id: r.id,
        source: r.source,
        success: r.result?.success || false,
        customer_id: r.result?.customer_id,
        error: r.result?.error || r.error,
      })),
    };
  }

  // === STEP 1: FETCH UNREVIEWED SUBMISSIONS ===
  const submissions: ScoredSubmission[] = [];

  const [contacts, ducted, ductless, scans, landing] = await Promise.all([
    supabase.from("contact_submissions").select("id, first_name, last_name, email, phone, service_type, message, status, created_at").or("status.is.null,status.eq.new").gte("created_at", cutoff),
    supabase.from("ducted_estimate_submissions").select("id, first_name, last_name, email, phone, address, city, state, zip_code, heating_type, recommended_tonnage, final_total, status, created_at").or("status.is.null,status.eq.new").gte("created_at", cutoff),
    supabase.from("ductless_estimate_submissions").select("id, customer_name, customer_email, customer_phone, customer_address, customer_city, customer_state, customer_zip, zone_count, final_total, selected_tier, status, created_at").or("status.is.null,status.eq.new").gte("created_at", cutoff),
    supabase.from("equipment_scans").select("id, email, zip_code, brand, equipment_type, estimated_age, status, created_at").or("status.is.null,status.eq.new").gte("created_at", cutoff).not("email", "is", null),
    supabase.from("landing_page_submissions").select("id, first_name, last_name, email, phone, message, status, created_at").or("status.is.null,status.eq.new").gte("created_at", cutoff),
  ]);

  // Map contact submissions
  (contacts.data || []).forEach((s: any) => {
    submissions.push({
      id: s.id, source_table: "contact_submissions", source_label: "Contact Form",
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unknown",
      email: s.email, phone: s.phone, zip: null,
      message: s.message || s.service_type,
      details: s.service_type || s.message?.substring(0, 80) || "No details",
      score: "unsure", reasons: [],
      intake_params: { first_name: s.first_name, last_name: s.last_name, email: s.email, phone: s.phone, lead_source: "Website Contact Form", notes: s.message?.substring(0, 200) },
    });
  });

  // Map ducted submissions
  (ducted.data || []).forEach((s: any) => {
    submissions.push({
      id: s.id, source_table: "ducted_estimate_submissions", source_label: "Ducted Estimator",
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unknown",
      email: s.email, phone: s.phone, zip: s.zip_code,
      message: null,
      details: `${s.heating_type || "HVAC"} — ${s.recommended_tonnage}T — $${s.final_total || "N/A"}`,
      score: "unsure", reasons: [],
      intake_params: { first_name: s.first_name, last_name: s.last_name, email: s.email, phone: s.phone, address_line1: s.address, city: s.city, state: s.state || "TX", zip_code: s.zip_code, lead_source: "Ducted Estimator", notes: `${s.heating_type || "HVAC"} ${s.recommended_tonnage}T, est $${s.final_total || "N/A"}` },
    });
  });

  // Map ductless submissions
  (ductless.data || []).forEach((s: any) => {
    const nameParts = (s.customer_name || "Unknown").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    submissions.push({
      id: s.id, source_table: "ductless_estimate_submissions", source_label: "Ductless Estimator",
      name: s.customer_name || "Unknown",
      email: s.customer_email, phone: s.customer_phone, zip: s.customer_zip,
      message: null,
      details: `${s.zone_count} zones — ${s.selected_tier || "Standard"} — $${s.final_total || "N/A"}`,
      score: "unsure", reasons: [],
      intake_params: { first_name: firstName, last_name: lastName, email: s.customer_email, phone: s.customer_phone, address_line1: s.customer_address, city: s.customer_city, state: s.customer_state || "TX", zip_code: s.customer_zip, lead_source: "Ductless Estimator", notes: `${s.zone_count} zones, ${s.selected_tier || "Standard"} tier, est $${s.final_total || "N/A"}` },
    });
  });

  // Map scanner submissions
  (scans.data || []).forEach((s: any) => {
    submissions.push({
      id: s.id, source_table: "equipment_scans", source_label: "Equipment Scanner",
      name: s.email?.split("@")[0] || "Scanner User",
      email: s.email, phone: null, zip: s.zip_code,
      message: null,
      details: `${s.brand || "Unknown"} ${s.equipment_type || ""} — ${s.estimated_age ? s.estimated_age + " yrs" : "age unknown"}`,
      score: "unsure", reasons: [],
      intake_params: { first_name: s.email?.split("@")[0] || "Scanner", last_name: "User", email: s.email, zip_code: s.zip_code, lead_source: "Equipment Scanner", notes: `Scanned ${s.brand || "unknown"} ${s.equipment_type || ""}, est age ${s.estimated_age || "unknown"} yrs` },
    });
    // Scanner age 12+ is a real signal
    if (s.estimated_age && s.estimated_age >= 12) {
      submissions[submissions.length - 1].reasons.push("equipment age 12+ years");
    }
  });

  // Map landing page submissions
  (landing.data || []).forEach((s: any) => {
    submissions.push({
      id: s.id, source_table: "landing_page_submissions", source_label: "Landing Page",
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unknown",
      email: s.email, phone: s.phone, zip: null,
      message: s.message,
      details: s.message?.substring(0, 80) || "Landing page submission",
      score: "unsure", reasons: [],
      intake_params: { first_name: s.first_name, last_name: s.last_name, email: s.email, phone: s.phone, lead_source: "Landing Page", notes: s.message?.substring(0, 200) },
    });
  });

  // === STEP 2: SCORE ===
  submissions.forEach(scoreSubmission);

  const real = submissions.filter(s => s.score === "real");
  const junk = submissions.filter(s => s.score === "junk");
  const unsure = submissions.filter(s => s.score === "unsure");

  return {
    lookback_hours: lookbackHours,
    total_scanned: submissions.length,
    real_count: real.length,
    junk_count: junk.length,
    unsure_count: unsure.length,
    real: real.map((s, i) => ({ index: i + 1, id: s.id, name: s.name, source: s.source_label, details: s.details, reasons: s.reasons, zip: s.zip })),
    junk: junk.map((s, i) => ({ index: real.length + unsure.length + i + 1, id: s.id, name: s.name, source: s.source_label, details: s.details, reasons: s.reasons })),
    unsure: unsure.map((s, i) => ({ index: real.length + i + 1, id: s.id, name: s.name, source: s.source_label, details: s.details, reasons: s.reasons })),
    instructions: 'Present this as a formatted report. For real leads, offer "intake all real" or "intake [number]". For junk, offer "archive junk". For unsure, let user decide "intake [number]" or "skip [number]".',
  };
}

function buildIntakeParams(data: any, table: string): any {
  const source = SOURCE_LABEL_MAP[table] || "Unknown";
  switch (table) {
    case "contact_submissions":
      return { first_name: data.first_name, last_name: data.last_name, email: data.email, phone: data.phone, lead_source: source, notes: data.message?.substring(0, 200) };
    case "ducted_estimate_submissions":
      return { first_name: data.first_name, last_name: data.last_name, email: data.email, phone: data.phone, address_line1: data.address, city: data.city, state: data.state || "TX", zip_code: data.zip_code, lead_source: source, notes: `${data.heating_type || "HVAC"} ${data.recommended_tonnage}T, est $${data.final_total || "N/A"}` };
    case "ductless_estimate_submissions": {
      const parts = (data.customer_name || "").split(" ");
      return { first_name: parts[0] || "", last_name: parts.slice(1).join(" ") || "", email: data.customer_email, phone: data.customer_phone, address_line1: data.customer_address, city: data.customer_city, state: data.customer_state || "TX", zip_code: data.customer_zip, lead_source: source, notes: `${data.zone_count} zones, ${data.selected_tier || "Standard"}, est $${data.final_total || "N/A"}` };
    }
    case "equipment_scans":
      return { first_name: data.email?.split("@")[0] || "Scanner", last_name: "User", email: data.email, zip_code: data.zip_code, lead_source: source, notes: `Scanned ${data.brand || "unknown"} ${data.equipment_type || ""}, est age ${data.estimated_age || "unknown"} yrs` };
    case "landing_page_submissions":
      return { first_name: data.first_name, last_name: data.last_name, email: data.email, phone: data.phone, lead_source: source, notes: data.message?.substring(0, 200) };
    default:
      return {};
  }
}

// ============================================================
// WATCH LIST TOOL
// ============================================================

const KNOWN_BRANDS = new Set(["carrier", "trane", "lennox", "goodman", "rheem", "york", "bryant", "american standard", "mitsubishi", "daikin", "fujitsu"]);

interface WatchListLead {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  zip: string | null;
  brand: string | null;
  equipment_type: string | null;
  tonnage: string | null;
  refrigerant: string | null;
  age: number | null;
  install_year: number | null;
  scanned_at: string;
  priority: "high" | "medium" | "low";
  score: number;
  signals: string[];
  tags: string[];
  notes: string;
  existing_customer: string | null;
}

function scoreWatchListLead(lead: WatchListLead, currentYear: number): void {
  let score = 0;
  const signals: string[] = [];
  const tags: string[] = [];

  // Calculate age
  let equipAge = lead.age;
  if (!equipAge && lead.install_year) {
    equipAge = currentYear - lead.install_year;
    lead.age = equipAge;
  }

  // Email always present (filtered in query)
  signals.push("Email ✓");

  // DFW zip
  const isDfw = lead.zip ? DFW_ZIPS.has(lead.zip) : false;
  if (isDfw) { signals.push("DFW ✓"); score += 3; }

  // Age scoring
  if (equipAge && equipAge >= 20) { tags.push("Critical Replacement"); score += 3; }
  else if (equipAge && equipAge >= 15) { tags.push("Aging Equipment"); score += 2; }

  // Phone
  if (lead.phone && lead.phone.replace(/\D/g, "").length >= 10) { signals.push("Phone ✓"); score += 1; }

  // R-22
  if (lead.refrigerant && lead.refrigerant.toLowerCase().includes("r-22")) {
    signals.push("R-22 ✓"); score += 2; tags.push("R-22 Replacement");
  }

  // Known brand
  if (lead.brand && KNOWN_BRANDS.has(lead.brand.toLowerCase())) {
    signals.push("Known brand ✓"); score += 1;
    tags.push(`${lead.brand} Owner`);
  }

  lead.signals = signals;
  lead.score = score;
  lead.tags = tags;

  // Determine priority
  const hasEmail = true; // filtered
  const meetsAge = equipAge ? equipAge >= 15 : false;

  if (hasEmail && isDfw && meetsAge) {
    lead.priority = "high";
  } else if (hasEmail && (isDfw || (lead.phone && lead.phone.replace(/\D/g, "").length >= 10))) {
    lead.priority = "medium";
  } else {
    lead.priority = "low";
  }

  // Build notes
  lead.notes = `Equipment scanner lead. ${lead.brand || "Unknown"} ${lead.tonnage ? lead.tonnage + "-ton" : ""} installed ${lead.install_year || "unknown"}, age ${equipAge || "unknown"} years. Refrigerant: ${lead.refrigerant || "unknown"}. Scanned: ${new Date(lead.scanned_at).toLocaleDateString("en-US")}.`;
}

async function executeScanWatchList(supabase: any, userId: string, input: any) {
  const lookbackDays = input.lookback_days || 30;
  const minAgeYears = input.min_age_years || 15;
  const cutoff = new Date(Date.now() - lookbackDays * 86400000).toISOString();
  const currentYear = new Date().getFullYear();

  // Fetch scans
  const { data: scans, error: scanErr } = await supabase
    .from("equipment_scans")
    .select("id, email, phone, zip_code, brand, equipment_type, tonnage, refrigerant, estimated_age, install_year, customer_name, created_at, status")
    .not("email", "is", null)
    .not("email", "eq", "")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (scanErr) throw new Error(`Failed to query equipment scans: ${scanErr.message}`);

  // Filter out already converted/archived
  const eligible = (scans || []).filter((s: any) => s.status !== "converted" && s.status !== "archived");
  const alreadyConverted = (scans || []).length - eligible.length;

  // Build leads and score
  const leads: WatchListLead[] = eligible.map((s: any) => {
    const lead: WatchListLead = {
      id: s.id,
      name: s.customer_name || null,
      email: s.email,
      phone: s.phone || null,
      zip: s.zip_code || null,
      brand: s.brand || null,
      equipment_type: s.equipment_type || null,
      tonnage: s.tonnage || null,
      refrigerant: s.refrigerant || null,
      age: s.estimated_age || null,
      install_year: s.install_year || null,
      scanned_at: s.created_at,
      priority: "low",
      score: 0,
      signals: [],
      tags: [],
      notes: "",
      existing_customer: null,
    };
    scoreWatchListLead(lead, currentYear);
    return lead;
  });

  // Filter by age threshold
  const ageFiltered = leads.filter(l => l.age && l.age >= minAgeYears);

  const high = ageFiltered.filter(l => l.priority === "high").sort((a, b) => b.score - a.score);
  const medium = ageFiltered.filter(l => l.priority === "medium").sort((a, b) => b.score - a.score);
  const low = ageFiltered.filter(l => l.priority === "low");

  // === CONFIRMED: RUN INTAKE ===
  if (input.confirmed) {
    const toIntake = input.include_medium ? [...high, ...medium] : high;

    if (toIntake.length === 0) {
      return { success: true, message: "No leads to intake." };
    }

    // Deduplication check
    const emails = toIntake.map(l => l.email);
    const { data: existingCustomers } = await supabase
      .from("crm_customers")
      .select("id, first_name, last_name, email")
      .in("email", emails);

    const existingMap = new Map<string, string>();
    (existingCustomers || []).forEach((c: any) => {
      if (c.email) existingMap.set(c.email.toLowerCase(), `${c.first_name || ""} ${c.last_name || ""}`.trim());
    });

    const intakeResults: any[] = [];
    for (const lead of toIntake) {
      // Check dedup
      const existing = existingMap.get(lead.email.toLowerCase());
      if (existing) {
        intakeResults.push({ email: lead.email, skipped: true, reason: `Already in CRM as ${existing}` });
        continue;
      }

      // Parse name
      const nameParts = (lead.name || lead.email.split("@")[0] || "Scanner").split(" ");
      const firstName = nameParts[0] || "Scanner";
      const lastName = nameParts.slice(1).join(" ") || "User";

      // Determine pipeline stage
      const hasR22 = lead.refrigerant && lead.refrigerant.toLowerCase().includes("r-22");
      const leadSource = "Equipment Scanner";

      const intakeParams = {
        first_name: firstName,
        last_name: lastName,
        email: lead.email,
        phone: lead.phone || undefined,
        zip_code: lead.zip || undefined,
        lead_source: leadSource,
        tags: ["Bach Intake", "Watch List", ...lead.tags],
        notes: lead.notes,
        confirmed: true,
      };

      const result = await executeIntakeLead(supabase, userId, intakeParams);
      intakeResults.push({ email: lead.email, name: `${firstName} ${lastName}`, result });

      // Mark as converted
      if (result.success) {
        await supabase.from("equipment_scans").update({ status: "converted" }).eq("id", lead.id);
      }
    }

    const successCount = intakeResults.filter(r => r.result?.success).length;
    const skippedCount = intakeResults.filter(r => r.skipped).length;

    return {
      success: true,
      intake_count: successCount,
      skipped_count: skippedCount,
      results: intakeResults.map(r => ({
        email: r.email,
        name: r.name,
        success: r.result?.success || false,
        skipped: r.skipped || false,
        reason: r.reason,
        customer_id: r.result?.customer_id,
      })),
      message: `Watch list intake complete: ${successCount} intaked, ${skippedCount} skipped (already in CRM).`,
    };
  }

  // === BUILD REPORT (confirmed: false) ===
  // Dedup check for report
  const allEmails = [...high, ...medium].map(l => l.email);
  if (allEmails.length > 0) {
    const { data: existingCustomers } = await supabase
      .from("crm_customers")
      .select("id, first_name, last_name, email")
      .in("email", allEmails);

    const existingMap = new Map<string, string>();
    (existingCustomers || []).forEach((c: any) => {
      if (c.email) existingMap.set(c.email.toLowerCase(), `${c.first_name || ""} ${c.last_name || ""}`.trim());
    });

    [...high, ...medium].forEach(l => {
      const existing = existingMap.get(l.email.toLowerCase());
      if (existing) l.existing_customer = existing;
    });
  }

  return {
    lookback_days: lookbackDays,
    min_age_years: minAgeYears,
    total_scanned: scans?.length || 0,
    already_converted: alreadyConverted,
    new_flags: ageFiltered.length,
    high_priority: high.map((l, i) => ({
      index: i + 1,
      id: l.id,
      name: l.name || l.email.split("@")[0],
      email: l.email,
      phone: l.phone || "no phone",
      brand: l.brand,
      tonnage: l.tonnage,
      refrigerant: l.refrigerant,
      age: l.age,
      install_year: l.install_year,
      zip: l.zip,
      signals: l.signals,
      tags: l.tags,
      score: l.score,
      existing_customer: l.existing_customer,
      pipeline_stage: l.refrigerant?.toLowerCase().includes("r-22") ? "Contacted" : "New Lead",
    })),
    medium_priority: medium.map((l, i) => ({
      index: high.length + i + 1,
      id: l.id,
      name: l.name || l.email.split("@")[0],
      email: l.email,
      phone: l.phone || "no phone",
      brand: l.brand,
      age: l.age,
      zip: l.zip,
      signals: l.signals,
      existing_customer: l.existing_customer,
    })),
    low_count: low.length,
    instructions: 'Present as a formatted watch list report. For 🔴 HIGH PRIORITY leads, show name, email, phone, equipment details, age, zip, and signal badges. Offer "confirm intake" to run intake_lead on all high items, or "intake all" to include medium. Show dedup warnings for leads already in CRM.',
  };
}

// ============================================================
// ESTIMATE DRAFTING TOOL
// ============================================================

const JOB_TYPE_LABELS: Record<string, string> = {
  residential_replacement: "Residential - Replacement",
  residential_new: "Residential - New",
  commercial_replacement: "Commercial - Replacement",
  commercial_new: "Commercial - New",
  maintenance: "Service/Repair",
  repair: "Service/Repair",
};

async function executeDraftEstimate(supabase: any, userId: string, input: any) {
  // === STEP 1: Resolve customer ===
  let customerId = input.customer_id;
  let customerData: any = null;

  if (!customerId && input.customer_name) {
    const searchTerm = input.customer_name.trim();
    const { data: matches } = await supabase
      .from("crm_customers")
      .select("id, first_name, last_name, email, phone, crm_locations(id, address_line1, city, state, zip_code, is_primary)")
      .is("deleted_at", null)
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
      .limit(5);

    if (!matches || matches.length === 0) {
      return { error: `No customer found matching "${input.customer_name}". Try a different name or provide a customer_id.` };
    }
    if (matches.length > 1) {
      return {
        error: "Multiple customers found. Please specify which one:",
        matches: matches.map((c: any) => ({
          id: c.id,
          name: `${c.first_name || ""} ${c.last_name || ""}`.trim(),
          email: c.email,
          phone: c.phone,
        })),
      };
    }
    customerId = matches[0].id;
    customerData = matches[0];
  }

  if (!customerId) {
    return { error: "Either customer_id or customer_name is required." };
  }

  if (!customerData) {
    const { data: cust, error: custErr } = await supabase
      .from("crm_customers")
      .select("id, first_name, last_name, email, phone, crm_locations(id, address_line1, city, state, zip_code, is_primary)")
      .eq("id", customerId)
      .single();
    if (custErr || !cust) return { error: "Customer not found." };
    customerData = cust;
  }

  const customerName = `${customerData.first_name || ""} ${customerData.last_name || ""}`.trim();
  const primaryLocation = customerData.crm_locations?.find((l: any) => l.is_primary) || customerData.crm_locations?.[0];
  const customerAddress = primaryLocation
    ? `${primaryLocation.address_line1}, ${primaryLocation.city}, ${primaryLocation.state} ${primaryLocation.zip_code}`
    : null;

  const heatingType = input.heating_type || "heat_pump";
  const jobType = input.job_type;

  // === STEP 2: Resolve template ===
  let template: any = null;
  let templateItems: any[] = [];

  if (input.template_id) {
    const { data: t } = await supabase
      .from("estimate_templates")
      .select("*")
      .eq("id", input.template_id)
      .eq("is_active", true)
      .single();
    template = t;
  } else {
    const { data: templates } = await supabase
      .from("estimate_templates")
      .select("*")
      .eq("is_active", true)
      .eq("job_type", jobType)
      .order("sort_order");

    if (templates && templates.length > 0) {
      template = templates.find((t: any) => t.heating_type === heatingType) || templates[0];
    }
  }

  if (template) {
    const { data: items } = await supabase
      .from("estimate_template_items")
      .select("*, materials_catalog(name, unit_cost, unit), labor_rates(name, hourly_rate, rate_type), admin_costs(name, amount, cost_type), equipment_systems(system_name, system_price)")
      .eq("template_id", template.id)
      .order("sort_order");
    templateItems = items || [];
  }

  // === STEP 3: Build line items ===
  const lineItems = templateItems.map((item: any, idx: number) => {
    let name = item.name;
    let unitCost = item.unit_cost;
    let unit = item.unit;
    let quantity = item.quantity;

    if (item.material_id && item.materials_catalog) {
      name = name || item.materials_catalog.name;
      unitCost = unitCost || item.materials_catalog.unit_cost;
      unit = unit || item.materials_catalog.unit;
    }
    if (item.labor_rate_id && item.labor_rates) {
      name = name || item.labor_rates.name;
      unitCost = unitCost || item.labor_rates.hourly_rate;
    }
    if (item.admin_cost_id && item.admin_costs) {
      name = name || item.admin_costs.name;
      unitCost = unitCost || item.admin_costs.amount;
    }
    if (item.equipment_system_id && item.equipment_systems) {
      name = name || item.equipment_systems.system_name;
      unitCost = unitCost || item.equipment_systems.system_price;
    }

    const lineTotal = (quantity || 1) * (unitCost || 0);

    return {
      item_type: item.item_type,
      section: item.section,
      name: name || "Unnamed Item",
      description: item.description || null,
      quantity: quantity || 1,
      unit: unit || "ea",
      unit_cost: unitCost || 0,
      line_total: lineTotal,
      sort_order: item.sort_order || idx,
      material_id: item.material_id || null,
      labor_rate_id: item.labor_rate_id || null,
      admin_cost_id: item.admin_cost_id || null,
      equipment_system_id: item.equipment_system_id || null,
    };
  });

  const profitMargin = template?.profit_margin || 1.35;
  const taxRate = 0.0825;
  const subtotalCost = lineItems.reduce((sum: number, li: any) => sum + li.line_total, 0);
  const subtotalCharge = subtotalCost * profitMargin;
  const taxAmount = subtotalCharge * taxRate;
  const grandTotal = subtotalCharge + taxAmount;

  // Financing preview
  const { data: financingOptions } = await supabase
    .from("financing_options")
    .select("plan_name, payment_factor, interest_rate, months_to_payoff")
    .eq("is_active", true)
    .order("sort_order")
    .limit(3);

  const lowestPayment = financingOptions && financingOptions.length > 0
    ? Math.round(grandTotal * Math.min(...financingOptions.map((f: any) => f.payment_factor)))
    : null;

  // === STEP 4: Preview ===
  if (!input.confirmed) {
    return {
      needs_confirmation: true,
      action: "draft_estimate",
      summary: {
        customer: customerName,
        customer_id: customerId,
        address: customerAddress || "No address on file",
        job_type: JOB_TYPE_LABELS[jobType] || jobType,
        heating_type: heatingType,
        template: template ? template.name : "Blank (no matching template)",
        title: input.title || `${JOB_TYPE_LABELS[jobType] || jobType} — ${customerName}`,
        line_items: lineItems.map((li: any) => ({
          name: li.name,
          section: li.section,
          qty: li.quantity,
          unit: li.unit,
          unit_cost: `$${li.unit_cost.toFixed(2)}`,
          line_total: `$${li.line_total.toFixed(2)}`,
        })),
        profit_margin: `${Math.round((profitMargin - 1) * 100)}%`,
        subtotal_cost: `$${subtotalCost.toFixed(2)}`,
        subtotal_charge: `$${subtotalCharge.toFixed(2)}`,
        tax: `$${taxAmount.toFixed(2)} (8.25%)`,
        grand_total: `$${grandTotal.toFixed(2)}`,
        financing: lowestPayment ? `From ~$${lowestPayment}/mo` : "No financing options available",
        notes: input.notes || "None",
      },
      confirmation_prompt: `📋 **Estimate Draft Preview**\n\n👤 **${customerName}**\n📍 ${customerAddress || "No address"}\n🔧 ${JOB_TYPE_LABELS[jobType] || jobType} (${heatingType})\n📄 Template: ${template ? template.name : "Blank"}\n\n${lineItems.length > 0 ? lineItems.map((li: any) => `• ${li.name} — ${li.quantity} ${li.unit} × $${li.unit_cost.toFixed(2)} = $${li.line_total.toFixed(2)}`).join("\n") : "⚠️ No line items — blank estimate"}\n\n💰 Subtotal: $${subtotalCharge.toFixed(2)}\n🧾 Tax (8.25%): $${taxAmount.toFixed(2)}\n**Total: $${grandTotal.toFixed(2)}**${lowestPayment ? `\n💳 Financing from ~$${lowestPayment}/mo` : ""}\n\nReply **"confirm"** to save as draft, **"change [item]"** to adjust, or **"use [template name]"** to switch templates.`,
    };
  }

  // === STEP 5: Save Draft ===
  const { data: estNumResult } = await supabase.rpc("generate_estimate_number");
  const estimateNumber = estNumResult || `TRU-${new Date().getFullYear()}-DRAFT`;

  const { data: estimate, error: estError } = await supabase
    .from("estimates")
    .insert({
      estimate_number: estimateNumber,
      customer_id: customerId,
      customer_name: customerName,
      customer_email: customerData.email || null,
      customer_phone: customerData.phone || null,
      customer_address: customerAddress || null,
      location_id: primaryLocation?.id || null,
      job_type: jobType,
      heating_type: heatingType,
      title: input.title || `${JOB_TYPE_LABELS[jobType] || jobType} — ${customerName}`,
      job_notes: input.notes || null,
      status: "draft",
      profit_margin: profitMargin,
      tax_rate: taxRate,
      subtotal_cost: subtotalCost,
      subtotal_charge: subtotalCharge,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      created_by: userId,
    })
    .select("id, estimate_number")
    .single();

  if (estError) throw new Error(`Failed to create estimate: ${estError.message}`);

  if (lineItems.length > 0) {
    const lineItemInserts = lineItems.map((li: any) => ({
      estimate_id: estimate.id,
      item_type: li.item_type,
      section: li.section,
      name: li.name,
      description: li.description,
      quantity: li.quantity,
      unit: li.unit,
      unit_cost: li.unit_cost,
      line_total: li.line_total,
      sort_order: li.sort_order,
      material_id: li.material_id,
      labor_rate_id: li.labor_rate_id,
      admin_cost_id: li.admin_cost_id,
      equipment_system_id: li.equipment_system_id,
    }));

    const { error: liError } = await supabase.from("estimate_line_items").insert(lineItemInserts);
    if (liError) console.error("Failed to insert line items:", liError);
  }

  // Log interaction
  await supabase.from("crm_interactions").insert({
    customer_id: customerId,
    interaction_type: "note",
    direction: null,
    content: `Estimate draft ${estimate.estimate_number} created by Bach using ${template ? `template "${template.name}"` : "blank template"}. Total: $${grandTotal.toFixed(2)}. Awaiting review.`,
    logged_by: userId,
  });

  return {
    success: true,
    estimate_id: estimate.id,
    estimate_number: estimate.estimate_number,
    grand_total: grandTotal,
    line_item_count: lineItems.length,
    template_used: template?.name || "Blank",
    message: `✓ Estimate **${estimate.estimate_number}** saved as draft.\n💰 Total: $${grandTotal.toFixed(2)} (${lineItems.length} line items)\n📄 Template: ${template?.name || "Blank"}\n🔗 Review at /admin/estimates\n\n⚠️ Draft only — not sent to customer.`,
  };
}

// ============================================================
// PRICE UPDATE TOOL
// ============================================================

const UPDATE_TYPE_CONFIG: Record<string, { table: string; priceCol: string; nameCol: string; skuCol: string | null; label: string }> = {
  equipment: { table: "equipment_systems", priceCol: "system_price", nameCol: "system_name", skuCol: "condenser_heat_pump_model", label: "Equipment Systems" },
  materials: { table: "materials_catalog", priceCol: "unit_cost", nameCol: "name", skuCol: "part_number", label: "Materials Catalog" },
  labor: { table: "labor_rates", priceCol: "rate", nameCol: "name", skuCol: null, label: "Labor Rates" },
  addons: { table: "ductless_addons", priceCol: "price", nameCol: "name", skuCol: null, label: "Ductless Add-ons" },
  ductless_units: { table: "ductless_unit_size_pricing", priceCol: "price", nameCol: "size_tons", skuCol: null, label: "Ductless Unit Sizes" },
  financing: { table: "financing_options", priceCol: "payment_factor", nameCol: "plan_name", skuCol: "tran_code", label: "Financing Options" },
};

async function executeUpdatePrices(supabase: any, userId: string, input: any) {
  const config = UPDATE_TYPE_CONFIG[input.update_type];
  if (!config) return { error: `Invalid update_type: ${input.update_type}. Valid: ${Object.keys(UPDATE_TYPE_CONFIG).join(", ")}` };

  const priceData: Array<{ name?: string; sku?: string; new_price: number }> = input.price_data;
  if (!priceData || priceData.length === 0) return { error: "price_data is required and must not be empty." };

  const skipUnmatched = input.skip_unmatched !== false;

  // Fetch all existing records from the target table
  const { data: existingRecords, error: fetchErr } = await supabase
    .from(config.table)
    .select("*")
    .order("created_at", { ascending: false });

  if (fetchErr) throw new Error(`Failed to fetch ${config.label}: ${fetchErr.message}`);
  if (!existingRecords || existingRecords.length === 0) return { error: `No records found in ${config.label}.` };

  // Match each price_data item to an existing record
  const matched: Array<{ record: any; newPrice: number; currentPrice: number; inputItem: any }> = [];
  const unmatched: Array<{ name?: string; sku?: string; new_price: number }> = [];
  const noChange: Array<{ record: any; price: number }> = [];

  for (const item of priceData) {
    let match: any = null;

    // Try exact name match
    if (item.name) {
      match = existingRecords.find((r: any) =>
        String(r[config.nameCol] || "").toLowerCase() === item.name!.toLowerCase()
      );
    }

    // Try case-insensitive partial name match
    if (!match && item.name) {
      match = existingRecords.find((r: any) =>
        String(r[config.nameCol] || "").toLowerCase().includes(item.name!.toLowerCase()) ||
        item.name!.toLowerCase().includes(String(r[config.nameCol] || "").toLowerCase())
      );
    }

    // Try SKU/model match
    if (!match && item.sku && config.skuCol) {
      match = existingRecords.find((r: any) =>
        String(r[config.skuCol!] || "").toLowerCase() === item.sku!.toLowerCase()
      );
      if (!match) {
        match = existingRecords.find((r: any) =>
          String(r[config.skuCol!] || "").toLowerCase().includes(item.sku!.toLowerCase())
        );
      }
    }

    // For ductless_units, match by size_tons number
    if (!match && input.update_type === "ductless_units" && item.name) {
      const sizeNum = parseFloat(item.name.replace(/[^0-9.]/g, ""));
      if (!isNaN(sizeNum)) {
        match = existingRecords.find((r: any) => Number(r.size_tons) === sizeNum);
      }
    }

    if (match) {
      const currentPrice = Number(match[config.priceCol]) || 0;
      if (Math.abs(currentPrice - item.new_price) < 0.001) {
        noChange.push({ record: match, price: currentPrice });
      } else {
        matched.push({ record: match, newPrice: item.new_price, currentPrice, inputItem: item });
      }
    } else {
      unmatched.push(item);
    }
  }

  // === PREVIEW MODE ===
  if (!input.confirmed) {
    const changes = matched.map((m) => {
      const delta = m.newPrice - m.currentPrice;
      const pctChange = m.currentPrice > 0 ? ((delta / m.currentPrice) * 100).toFixed(1) : "N/A";
      return {
        name: m.record[config.nameCol] || m.record.id,
        current: m.currentPrice,
        new: m.newPrice,
        delta,
        pct: pctChange,
      };
    });

    const avgChange = matched.length > 0
      ? matched.reduce((sum, m) => {
          const pct = m.currentPrice > 0 ? ((m.newPrice - m.currentPrice) / m.currentPrice) * 100 : 0;
          return sum + pct;
        }, 0) / matched.length
      : 0;

    return {
      needs_confirmation: true,
      action: "update_prices",
      summary: {
        update_type: input.update_type,
        table: config.label,
        total_in_paste: priceData.length,
        matched_count: matched.length + noChange.length,
        will_update: matched.length,
        no_change: noChange.length,
        unmatched_count: unmatched.length,
        changes,
        unmatched_items: unmatched.map((u) => u.name || u.sku || "unknown"),
        average_change_pct: `${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(1)}%`,
      },
      confirmation_prompt: `💰 **PRICE UPDATE REVIEW — ${config.label}**\n${"─".repeat(50)}\nTotal in paste: ${priceData.length} items\nMatched: ${matched.length + noChange.length} items\nNo change needed: ${noChange.length} items (prices already match)\nWill update: ${matched.length} items\nUnmatched: ${unmatched.length} items (${skipUnmatched ? "skipping" : "⚠️ will fail"})\n\n${matched.length > 0 ? "**CHANGES:**\n" + changes.map((c) => `• ${c.name}: $${c.current.toFixed(2)} → $${c.new.toFixed(2)} (${c.delta >= 0 ? "+" : ""}$${c.delta.toFixed(2)}, ${c.delta >= 0 ? "+" : ""}${c.pct}%)`).join("\n") : "No price changes to apply."}\n${unmatched.length > 0 ? `\n⚠️ **UNMATCHED (will skip):**\n${unmatched.map((u) => `• "${u.name || u.sku}" — no match found`).join("\n")}` : ""}\n\nAverage change: ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(1)}%\n${"─".repeat(50)}\nReply **"confirm update"** to apply all ${matched.length} changes.\nReply **"update all except [item]"** to skip specific items.`,
    };
  }

  // === APPLY UPDATES ===
  let updatedCount = 0;
  const errors: string[] = [];

  for (const m of matched) {
    const { error: updateErr } = await supabase
      .from(config.table)
      .update({ [config.priceCol]: m.newPrice })
      .eq("id", m.record.id);

    if (updateErr) {
      errors.push(`Failed to update "${m.record[config.nameCol]}": ${updateErr.message}`);
    } else {
      updatedCount++;
    }
  }

  // Log the update as a system interaction
  const avgPctFinal = matched.length > 0
    ? matched.reduce((sum, m) => sum + (m.currentPrice > 0 ? ((m.newPrice - m.currentPrice) / m.currentPrice) * 100 : 0), 0) / matched.length
    : 0;

  // Use a system-level log — insert into crm_interactions with a null customer_id won't work,
  // so we log into assistant_logs instead (already handled by the main handler).
  // Additionally log a note for audit trail:
  const today = new Date().toLocaleDateString("en-US", { timeZone: TZ });
  const logContent = `Price update applied by Bach. ${updatedCount} items updated in ${config.label}. Average change: ${avgPctFinal >= 0 ? "+" : ""}${avgPctFinal.toFixed(1)}%. Date: ${today}.${errors.length > 0 ? ` Errors: ${errors.length}.` : ""}`;

  // Fire-and-forget audit log
  supabase.from("assistant_logs").insert({
    user_id: userId,
    user_message: `[SYSTEM] update_prices — ${config.label}`,
    assistant_response: logContent,
    tools_used: [{ tool: "update_prices", input: { update_type: input.update_type, items_updated: updatedCount } }],
  }).then(() => {}).catch(() => {});

  return {
    success: errors.length === 0,
    updated: updatedCount,
    unchanged: noChange.length,
    unmatched: unmatched.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `✓ Price update complete\n✓ ${updatedCount} items updated in ${config.label}\n✓ ${noChange.length} items unchanged (already matched)\n${unmatched.length > 0 ? `✗ ${unmatched.length} items unmatched — skipped\n` : ""}✓ Change log saved${errors.length > 0 ? `\n⚠️ ${errors.length} errors occurred` : ""}`,
  };
}

// ============================================================
// PROPERTY DATA LOOKUP TOOL
// ============================================================

async function lookupPropertyAndSave(supabase: any, address: string, city: string, state: string, zipCode: string, locationId?: string): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke("lookup-property-data", {
      body: { address, city, state, zipCode },
    });

    if (error || !data?.data) {
      return { found: false, error: data?.error || error?.message || "No property data found" };
    }

    const propData = data.data;

    // Save to location if ID provided
    if (locationId && propData) {
      const updatePayload: Record<string, any> = {
        property_data_source: propData.source || "rentcast",
        property_data_updated_at: new Date().toISOString(),
        property_data_auto_populated: true,
      };
      if (propData.squareFootage) updatePayload.square_footage = propData.squareFootage;
      if (propData.yearBuilt) updatePayload.year_built = propData.yearBuilt;
      if (propData.stories) updatePayload.stories = propData.stories;
      if (propData.lotSizeSqft) updatePayload.lot_size_sqft = propData.lotSizeSqft;
      if (propData.bedrooms) updatePayload.bedrooms = propData.bedrooms;
      if (propData.bathrooms) updatePayload.bathrooms = propData.bathrooms;

      await supabase.from("crm_locations").update(updatePayload).eq("id", locationId);
    }

    return { found: true, data: propData, saved: !!locationId };
  } catch (err: any) {
    console.error("Property lookup failed:", err);
    return { found: false, error: err.message || "Property lookup failed" };
  }
}

async function executeGetPropertyData(supabase: any, input: any) {
  const address = input.address;
  const city = input.city || "";
  const state = input.state || "TX";
  const zipCode = input.zip_code || "";

  const result = await lookupPropertyAndSave(supabase, address, city, state, zipCode, input.location_id);

  if (!result.found) {
    return {
      found: false,
      message: `No property data found for this address. ${result.error || "Address may be too new or outside coverage area."}`,
    };
  }

  const d = result.data;
  const currentYear = new Date().getFullYear();
  const age = d.yearBuilt ? `${currentYear - d.yearBuilt} years old` : null;

  return {
    found: true,
    property: {
      square_footage: d.squareFootage || null,
      year_built: d.yearBuilt || null,
      age: age,
      stories: d.stories || null,
      bedrooms: d.bedrooms || null,
      bathrooms: d.bathrooms || null,
      lot_size_sqft: d.lotSizeSqft || null,
      lot_size_acres: d.lotSizeSqft ? (d.lotSizeSqft / 43560).toFixed(2) : null,
      property_class: d.propertyClass || null,
      source: d.source || "rentcast",
    },
    saved_to_location: result.saved,
    message: result.saved
      ? "✓ Property data found and saved to location record."
      : "Property data found. Provide a location_id to save it.",
  };
}

// ============================================================
// ADDRESS VERIFICATION TOOL
// ============================================================

async function verifyAddressViaGoogle(address: string, city: string, state: string, zipCode: string): Promise<any> {
  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!apiKey) {
    return { verified: false, error: "Google Places API key not configured." };
  }

  const fullAddress = [address, city, state, zipCode].filter(Boolean).join(", ");
  const params = new URLSearchParams({ address: fullAddress, key: apiKey });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { verified: false, error: `Google Geocoding returned HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return { verified: false, error: `Address not found. Google status: ${data.status}` };
    }

    const result = data.results[0];
    const components = result.address_components || [];

    const getComponent = (type: string, useShort = false): string | null => {
      const comp = components.find((c: any) => c.types.includes(type));
      return comp ? (useShort ? comp.short_name : comp.long_name) : null;
    };

    const streetNumber = getComponent("street_number") || "";
    const route = getComponent("route") || "";
    const streetAddress = `${streetNumber} ${route}`.trim();
    const verifiedCity = getComponent("locality") || getComponent("sublocality") || "";
    const county = getComponent("administrative_area_level_2") || "";
    const verifiedState = getComponent("administrative_area_level_1", true) || "";
    const verifiedZip = getComponent("postal_code") || "";
    const placeId = result.place_id || null;
    const lat = result.geometry?.location?.lat || null;
    const lng = result.geometry?.location?.lng || null;

    const isDfw = verifiedZip ? DFW_ZIPS.has(verifiedZip) : false;

    return {
      verified: true,
      formatted_address: result.formatted_address,
      components: {
        street: streetAddress,
        city: verifiedCity,
        county: county,
        state: verifiedState,
        zip_code: verifiedZip,
      },
      coordinates: { lat, lng },
      place_id: placeId,
      is_dfw: isDfw,
    };
  } catch (err: any) {
    console.error("Google Geocoding error:", err);
    return { verified: false, error: err.message || "Geocoding request failed" };
  }
}

async function executeVerifyAddress(supabase: any, input: any) {
  const result = await verifyAddressViaGoogle(
    input.address,
    input.city || "",
    input.state || "TX",
    input.zip_code || ""
  );

  if (!result.verified) {
    return {
      verified: false,
      input_address: input.address,
      message: `⚠️ Address not verified\nCould not confirm "${input.address}" via Google Places.\nSuggestions:\n• Check street number and name spelling\n• Verify ZIP code\n• Try without apartment/unit number first`,
      error: result.error,
    };
  }

  // Save to location if requested
  let saved = false;
  if (input.save_to_location_id) {
    const updatePayload: Record<string, any> = {
      address_line1: result.components.street,
      city: result.components.city,
      state: result.components.state,
      zip_code: result.components.zip_code,
      county: result.components.county,
      google_place_id: result.place_id,
      latitude: result.coordinates.lat,
      longitude: result.coordinates.lng,
    };

    const { error: updateErr } = await supabase
      .from("crm_locations")
      .update(updatePayload)
      .eq("id", input.save_to_location_id);

    if (!updateErr) saved = true;
  }

  return {
    verified: true,
    input_address: input.address,
    formatted_address: result.formatted_address,
    components: result.components,
    coordinates: result.coordinates,
    place_id: result.place_id,
    is_dfw: result.is_dfw,
    saved_to_location: saved,
    message: `✅ Address Verified\n\nInput:     "${input.address}"\nVerified:  ${result.formatted_address}\n\nStreet:    ${result.components.street}\nCity:      ${result.components.city}\nCounty:    ${result.components.county}\nState:     ${result.components.state}\nZIP:       ${result.components.zip_code}\nDFW Area:  ${result.is_dfw ? "✅ Yes — in service area" : "⚠️ No — outside service area"}\nLat/Lng:   ${result.coordinates.lat}° N, ${Math.abs(result.coordinates.lng)}° W\n\nGoogle Place ID: ${result.place_id}${saved ? "\n\n✓ Verified address saved to location record." : ""}`,
  };
}

// ============================================================
// SEO AUDIT TOOL
// ============================================================

interface SEOItem {
  id: string;
  source: "page" | "blog";
  name: string;
  path: string;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string | null;
  issues: string[];
  status: "good" | "attention" | "critical";
}

function evaluateSEO(item: SEOItem, allItems: SEOItem[]): void {
  const issues: string[] = [];
  const title = item.meta_title;
  const desc = item.meta_description;

  // Title checks
  if (!title || title.trim().length === 0) {
    issues.push("🔴 Missing meta title");
  } else if (title.length < 30) {
    issues.push(`🟡 Title too short (${title.length} chars)`);
  } else if (title.length > 60) {
    issues.push(`🟡 Title too long (${title.length} chars)`);
  }

  // Description checks
  if (!desc || desc.trim().length === 0) {
    issues.push("🔴 Missing meta description");
  } else if (desc.length < 70) {
    issues.push(`🟡 Description too short (${desc.length} chars)`);
  } else if (desc.length > 160) {
    issues.push(`🟡 Description too long (${desc.length} chars)`);
  }

  // Duplicate checks
  if (title && title.trim().length > 0) {
    const dupes = allItems.filter(other => other.id !== item.id && other.meta_title && other.meta_title.toLowerCase() === title.toLowerCase());
    if (dupes.length > 0) {
      issues.push(`🔴 Duplicate title (matches ${dupes.map(d => d.path).join(", ")})`);
    }
  }
  if (desc && desc.trim().length > 0) {
    const dupes = allItems.filter(other => other.id !== item.id && other.meta_description && other.meta_description.toLowerCase() === desc.toLowerCase());
    if (dupes.length > 0) {
      issues.push(`🔴 Duplicate description (matches ${dupes.map(d => d.path).join(", ")})`);
    }
  }

  item.issues = issues;
  const hasCritical = issues.some(i => i.includes("🔴"));
  const hasAttention = issues.some(i => i.includes("🟡"));
  item.status = issues.length === 0 ? "good" : hasCritical ? "critical" : "attention";
}

async function executeSEOAudit(supabase: any, input: any) {
  const scope = input.scope || "all";
  const issueFilter = input.issue_filter || "all";
  const limit = Math.min(input.limit || 50, 100);

  const allItems: SEOItem[] = [];

  // Fetch pages
  if (scope === "all" || scope === "pages") {
    const { data: pages } = await supabase
      .from("page_seo")
      .select("id, page_name, page_path, meta_title, meta_description, updated_at")
      .order("page_name");

    (pages || []).forEach((p: any) => {
      allItems.push({
        id: p.id, source: "page", name: p.page_name, path: p.page_path,
        meta_title: p.meta_title, meta_description: p.meta_description,
        updated_at: p.updated_at, issues: [], status: "good",
      });
    });
  }

  // Fetch blog posts
  if (scope === "all" || scope === "blog") {
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("id, title, slug, meta_title, meta_description, updated_at, status")
      .eq("status", "published")
      .order("title");

    (posts || []).forEach((p: any) => {
      allItems.push({
        id: p.id, source: "blog", name: p.title, path: `/blog/${p.slug}`,
        meta_title: p.meta_title, meta_description: p.meta_description,
        updated_at: p.updated_at, issues: [], status: "good",
      });
    });
  }

  // Evaluate all items
  allItems.forEach(item => evaluateSEO(item, allItems));

  // Apply issue filter
  let filtered = allItems;
  if (issueFilter !== "all") {
    filtered = allItems.filter(item => {
      switch (issueFilter) {
        case "missing": return item.issues.some(i => i.includes("Missing"));
        case "too_long": return item.issues.some(i => i.includes("too long"));
        case "too_short": return item.issues.some(i => i.includes("too short"));
        case "duplicate": return item.issues.some(i => i.includes("Duplicate"));
        default: return true;
      }
    });
  }

  const critical = filtered.filter(i => i.status === "critical");
  const attention = filtered.filter(i => i.status === "attention");
  const good = filtered.filter(i => i.status === "good");

  const today = new Date().toLocaleDateString("en-US", { timeZone: TZ, month: "long", day: "numeric", year: "numeric" });

  return {
    audit_date: today,
    scope,
    total_scanned: allItems.length,
    fully_optimized: good.length,
    needs_attention: attention.length,
    critical_issues: critical.length,
    critical: critical.slice(0, limit).map((item, i) => ({
      index: i + 1, id: item.id, source: item.source, name: item.name, path: item.path,
      issues: item.issues, meta_title: item.meta_title, meta_description: item.meta_description,
      title_length: item.meta_title?.length || 0, desc_length: item.meta_description?.length || 0,
    })),
    attention: attention.slice(0, limit).map((item, i) => ({
      index: critical.length + i + 1, id: item.id, source: item.source, name: item.name, path: item.path,
      issues: item.issues, meta_title: item.meta_title, meta_description: item.meta_description,
      title_length: item.meta_title?.length || 0, desc_length: item.meta_description?.length || 0,
    })),
    optimized: good.map(item => item.name),
    instructions: 'Present as a formatted SEO audit report. Show critical issues first, then attention items. List optimized pages briefly. End with: "Tell me which page to update and I\'ll show you a preview of the change before saving."',
  };
}

async function executeSearchSeoReports(supabase: any, input: any) {
  const limit = Math.min(input.limit || 10, 50);
  let query = supabase
    .from("seo_reports")
    .select("id, title, summary, created_at, report_type, tags, related_page_paths")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.query?.trim()) {
    const term = input.query.trim().replace(/\s+/g, " & ");
    try {
      query = query.textSearch("fts", term, { config: "english" });
    } catch {
      query = query.or(`title.ilike.%${input.query}%,summary.ilike.%${input.query}%`);
    }
  }
  if (input.tag) query = query.contains("tags", [input.tag]);
  if (input.page_path) query = query.contains("related_page_paths", [input.page_path]);

  const { data, error } = await query;
  if (error) {
    // Fallback to ilike if tsvector fails
    let fb = supabase
      .from("seo_reports")
      .select("id, title, summary, created_at, report_type, tags, related_page_paths")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (input.query?.trim()) fb = fb.or(`title.ilike.%${input.query}%,summary.ilike.%${input.query}%,full_response.ilike.%${input.query}%`);
    if (input.tag) fb = fb.contains("tags", [input.tag]);
    if (input.page_path) fb = fb.contains("related_page_paths", [input.page_path]);
    const { data: fbData, error: fbErr } = await fb;
    if (fbErr) return { error: `search_seo_reports failed: ${fbErr.message}` };
    return { count: (fbData || []).length, reports: fbData || [] };
  }

  return {
    count: (data || []).length,
    reports: (data || []).map((r: any) => ({
      report_id: r.id,
      title: r.title,
      summary: r.summary,
      created_at: r.created_at,
      report_type: r.report_type,
      tags: r.tags,
    })),
    instructions: "Reference these prior reports by title and date. Each report_id can be linked at /admin/seo?tab=reports&report=[id].",
  };
}

async function executeUpdateSEO(supabase: any, userId: string, input: any) {
  const source = input.source || "page";
  const table = source === "blog" ? "blog_posts" : "page_seo";
  const nameCol = source === "blog" ? "title" : "page_name";
  const pathCol = source === "blog" ? "slug" : "page_path";

  // Fetch current record
  const { data: record, error: fetchErr } = await supabase
    .from(table)
    .select("*")
    .eq("id", input.page_id)
    .single();

  if (fetchErr || !record) return { error: `Record not found in ${table}.` };

  const pageName = record[nameCol] || "Unknown";
  const pagePath = source === "blog" ? `/blog/${record[pathCol]}` : record[pathCol];

  if (!input.meta_title && !input.meta_description) {
    return { error: "Provide at least one of meta_title or meta_description to update." };
  }

  // Preview mode
  if (!input.confirmed) {
    const preview: any = { needs_confirmation: true, action: "update_seo", summary: { page_name: pageName, page_path: pagePath, source } };
    const lines: string[] = [`📝 **SEO Update Preview — ${pageName}**\n`];

    if (input.meta_title) {
      lines.push("**Meta Title:**");
      lines.push('Old: "' + (record.meta_title || "(empty)") + '"');
      const titleLen = input.meta_title.length;
      const titleNote = titleLen > 60 ? " ⚠️ over 60" : titleLen < 30 ? " ⚠️ under 30" : " ✅";
      lines.push('New: "' + input.meta_title + '" (' + titleLen + " chars" + titleNote + ")");
      preview.summary.old_title = record.meta_title || null;
      preview.summary.new_title = input.meta_title;
    }
    if (input.meta_description) {
      lines.push("\n**Meta Description:**");
      lines.push('Old: "' + (record.meta_description || "(empty)") + '"');
      const descLen = input.meta_description.length;
      const descNote = descLen > 160 ? " ⚠️ over 160" : descLen < 70 ? " ⚠️ under 70" : " ✅";
      lines.push('New: "' + input.meta_description + '" (' + descLen + " chars" + descNote + ")");
      preview.summary.old_description = record.meta_description || null;
      preview.summary.new_description = input.meta_description;
    }

    lines.push(`\nReply **"confirm"** to save or suggest changes.`);
    preview.confirmation_prompt = lines.join("\n");
    return preview;
  }

  // Apply update
  const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
  if (input.meta_title) updatePayload.meta_title = input.meta_title;
  if (input.meta_description) updatePayload.meta_description = input.meta_description;

  const { error: updateErr } = await supabase.from(table).update(updatePayload).eq("id", input.page_id);
  if (updateErr) throw new Error(`Failed to update SEO: ${updateErr.message}`);

  // Log to assistant_logs
  supabase.from("assistant_logs").insert({
    user_id: userId,
    user_message: `[SYSTEM] update_seo — ${pageName}`,
    assistant_response: `SEO updated for ${pageName} (${pagePath}). ${input.meta_title ? "Title updated." : ""} ${input.meta_description ? "Description updated." : ""}`.trim(),
    tools_used: [{ tool: "update_seo", input: { page_id: input.page_id, source } }],
  }).then(() => {}).catch(() => {});

  return {
    success: true,
    message: "✓ SEO updated for **" + pageName + "** (" + pagePath + ")." + (input.meta_title ? '\n• Title: "' + input.meta_title + '"' : "") + (input.meta_description ? '\n• Description: "' + input.meta_description + '"' : "") + "\n\nChanges will reflect on next site build/deploy.",
  };
}

// TOOL ROUTER
// ============================================================

// ============================================================
// LEAD PASTE PARSER (Mitsubishi & similar label/value formats)
// ============================================================

const LEAD_PASTE_LABELS: Record<string, string> = {
  "lead name": "name",
  "lead source": "leadSource",
  "zip code": "zipCode",
  "state": "state",
  "email": "email",
  "phone": "phone",
  "customer type": "customerType",
  "when are you planning to purchase": "purchaseTimeline",
  "what is the best way to reach you": "bestContactMethod",
  "address": "address",
  "rooms": "rooms",
  "customer comments": "notes",
};

function lp_stripMarkdownLink(value: string): string {
  if (!value) return value;
  const v = value.trim();
  const m = v.match(/^\[(.+?)\]\((.+)\)\s*$/);
  if (m) {
    const target = m[2].trim();
    if (/^mailto:/i.test(target)) return target.replace(/^mailto:/i, "").trim();
    if (/^tel:/i.test(target)) return target.replace(/^tel:/i, "").trim();
    return m[1].trim();
  }
  return v;
}

function lp_normalizePhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  let ten = digits;
  if (digits.length === 11 && digits.startsWith("1")) ten = digits.slice(1);
  if (ten.length !== 10) return raw.trim() || undefined;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function parseMitsubishiLead(raw: string): Record<string, any> {
  const out: Record<string, string> = {};
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const labelKeys = Object.keys(LEAD_PASTE_LABELS);
  const labelPattern = new RegExp(
    `^(${labelKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*[:：]?\\s*(.*)$`,
    "i",
  );

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(labelPattern);
    if (!m) continue;
    const field = LEAD_PASTE_LABELS[m[1].toLowerCase().replace(/\s+/g, " ")];
    if (!field) continue;
    let value = m[2].trim();
    if (!value) {
      for (let j = i + 1; j < lines.length; j++) {
        if (labelPattern.test(lines[j])) break;
        value = lines[j].trim();
        i = j;
        break;
      }
    }
    if (!value) continue;
    out[field] = lp_stripMarkdownLink(value);
  }

  const parsed: Record<string, any> = {};
  if (out.name) {
    const parts = out.name.trim().split(/\s+/).filter(Boolean);
    parsed.firstName = parts[0] ?? "";
    if (parts.length > 1) parsed.lastName = parts.slice(1).join(" ");
  }
  if (out.email) parsed.email = out.email.trim();
  if (out.phone) parsed.phone = lp_normalizePhone(out.phone);
  if (out.leadSource) parsed.leadSource = out.leadSource.trim();
  if (out.zipCode) {
    const z = out.zipCode.match(/\b(\d{5})\b/);
    if (z) parsed.zipCode = z[1];
  }
  if (out.state) parsed.state = out.state.trim();
  if (out.customerType) {
    const ct = out.customerType.toLowerCase();
    if (ct.includes("commercial")) parsed.customerType = "commercial";
    else if (ct.includes("residential")) parsed.customerType = "residential";
  }
  if (out.address) {
    const parts = out.address.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts[0]) parsed.addressLine1 = parts[0];
    if (parts[1]) parsed.city = parts[1];
    for (let i = 2; i < parts.length; i++) {
      const z = parts[i].match(/\b(\d{5})(?:-\d{4})?\b/);
      if (z) { if (!parsed.zipCode) parsed.zipCode = z[1]; break; }
    }
  }
  if (out.rooms) parsed.rooms = out.rooms.trim();
  if (out.bestContactMethod) parsed.bestContactMethod = out.bestContactMethod.trim();
  if (out.purchaseTimeline) parsed.purchaseTimeline = out.purchaseTimeline.trim();
  if (out.notes) parsed.notes = out.notes.trim();

  // Fallback regex sweeps
  if (!parsed.email) {
    const m = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (m) parsed.email = m[0];
  }
  if (!parsed.phone) {
    const tel = raw.match(/tel:([+\d().\s-]+)/i);
    if (tel) parsed.phone = lp_normalizePhone(tel[1]);
    else {
      const digits = raw.replace(/[^\d]/g, " ").match(/\b1?\d{10}\b/);
      if (digits) parsed.phone = lp_normalizePhone(digits[0]);
    }
  }
  return parsed;
}

function executeParseLeadPaste(input: { raw_text?: string; lead_source_override?: string }) {
  const raw = (input?.raw_text ?? "").toString();
  if (!raw.trim()) {
    return { success: false, error: "raw_text is required" };
  }
  const p = parseMitsubishiLead(raw);
  const noteBits: string[] = [];
  if (p.purchaseTimeline) noteBits.push(`Timeline: ${p.purchaseTimeline}`);
  if (p.bestContactMethod) noteBits.push(`Best contact: ${p.bestContactMethod}`);
  if (p.rooms) noteBits.push(`Rooms: ${p.rooms}`);
  if (p.notes) noteBits.push(p.notes);

  const stateValue = p.state && typeof p.state === "string" && p.state.length > 2 ? "TX" : p.state;

  const intake_params = {
    first_name: p.firstName ?? "",
    last_name: p.lastName ?? "",
    email: p.email,
    phone: p.phone,
    address_line1: p.addressLine1,
    city: p.city,
    state: stateValue,
    zip_code: p.zipCode,
    lead_source: p.leadSource || input?.lead_source_override || "Mitsubishi Partner Program",
    customer_type: p.customerType ?? "residential",
    notes: noteBits.join(" | ") || undefined,
    confirmed: false,
  };

  return {
    success: true,
    parsed: p,
    intake_params,
    instructions: "Call intake_lead with these intake_params (confirmed: false) to show the confirmation prompt to the user. Do NOT skip confirmation.",
  };
}

async function executeTool(supabase: any, toolName: string, toolInput: any, userId: string): Promise<any> {
  switch (toolName) {
    // Read tools
    case "search_customers": return executeSearchCustomers(supabase, toolInput);
    case "get_customer_details": return executeGetCustomerDetails(supabase, toolInput);
    case "search_jobs": return executeSearchJobs(supabase, toolInput);
    case "get_schedule": return executeGetSchedule(supabase, toolInput);
    case "get_submission_stats": return executeGetSubmissionStats(supabase, toolInput);
    case "get_recent_submissions": return executeGetRecentSubmissions(supabase, toolInput);
    case "get_pipeline_overview": return executeGetPipelineOverview(supabase, toolInput);
    case "get_team_info": return executeGetTeamInfo(supabase, toolInput);
    case "seo_audit": return executeSEOAudit(supabase, toolInput);
    case "search_seo_reports": return executeSearchSeoReports(supabase, toolInput);
    // Write tools
    case "create_customer": return executeCreateCustomer(supabase, userId, toolInput);
    case "create_job": return executeCreateJob(supabase, userId, toolInput);
    case "update_job_stage": return executeUpdateJobStage(supabase, userId, toolInput);
    case "log_interaction": return executeLogInteraction(supabase, userId, toolInput);
    case "update_customer_status": return executeUpdateCustomerStatus(supabase, userId, toolInput);
    case "update_customer": return executeUpdateCustomer(supabase, userId, toolInput);
    case "update_job": return executeUpdateJob(supabase, userId, toolInput);
    case "add_to_pipeline": return executeAddToPipeline(supabase, userId, toolInput);
    case "move_pipeline_entry": return executeMovePipelineEntry(supabase, userId, toolInput);
    case "update_pipeline_entry": return executeUpdatePipelineEntry(supabase, userId, toolInput);
    case "schedule_appointment": return executeScheduleAppointment(supabase, userId, toolInput);
    case "reschedule_appointment": return executeRescheduleAppointment(supabase, userId, toolInput);
    case "cancel_appointment": return executeCancelAppointment(supabase, userId, toolInput);
    case "intake_lead": return executeIntakeLead(supabase, userId, toolInput);
    case "parse_lead_paste": return executeParseLeadPaste(toolInput);
    case "review_submissions": return executeReviewSubmissions(supabase, userId, toolInput);
    case "scan_watch_list": return executeScanWatchList(supabase, userId, toolInput);
    case "draft_estimate": return executeDraftEstimate(supabase, userId, toolInput);
    case "update_prices": return executeUpdatePrices(supabase, userId, toolInput);
    case "update_seo": return executeUpdateSEO(supabase, userId, toolInput);
    case "get_property_data": return executeGetPropertyData(supabase, toolInput);
    case "verify_address": return executeVerifyAddress(supabase, toolInput);
    case "get_google_calendar": return executeGetGoogleCalendar(supabase, toolInput);
    case "get_job_types": return executeGetJobTypes(supabase);
    case "get_pipeline_stages": return executeGetPipelineStages(supabase);
    case "get_daily_briefing": return toolInput.briefing_data || { error: "No briefing data available." };
    default: throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ============================================================
// SYSTEM PROMPT
// ============================================================

function getSystemPrompt(): string {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return `You are Bach, an AI operations assistant for Truficient Energy Solutions, an HVAC company in the Dallas-Fort Worth area. You help the admin team manage their CRM, customers, jobs, schedules, and pipeline using natural language.

PERSONALITY:
- Professional but conversational — like a competent office assistant
- Concise — lead with the answer, add detail only if helpful
- Proactive — if a search returns one obvious match, present it directly
- Careful — always confirm before making changes to data
- Honest — say when you can't find something or need more info

CAPABILITIES:
Read operations:
- Search and view customer records, locations, and interaction history
- Look up jobs by number, customer, type, or date range
- Check team schedules and availability
- Read Google Calendar directly for full availability picture (includes meetings, blocks, travel time beyond just CRM appointments)
- View submission counts and pipeline metrics
- View team/crew information and assignments

Write operations (ALWAYS confirm first):
- Intake new leads from any source using the intake_lead tool, which automatically creates the customer, adds them to the pipeline at the correct stage based on lead source, and logs the interaction
- Review and filter all incoming submissions using review_submissions — classifies each as real, junk, or unsure using signal-based scoring, automatically runs intake_lead on confirmed real leads, and asks for confirmation before archiving junk
- Scan the equipment scanner watch list using scan_watch_list — identifies high-priority leads based on equipment age (15+ years), R-22 refrigerant, DFW location, email and phone presence, and known brands. Automatically runs intake_lead on confirmed high-priority leads with appropriate tags and pipeline stage assignment
- Create new customers (with optional address that becomes their primary location)
- Edit existing customers using update_customer (name, email, phone, alternate phone, type, company name, lead source, tags, notes, preferred contact method). For lifecycle status, use update_customer_status instead.
- Create new jobs for existing customers
- Edit existing jobs using update_job (title, scheduled dates, priority, quoted/final amounts, payment status, internal/customer notes, location). For stage changes, use update_job_stage instead.
- Move jobs between workflow stages
- Log interactions (calls, emails, notes, meetings, texts, tasks)
- Update customer lifecycle status
- Add customers to the sales pipeline or move between stages
- Schedule job appointments (automatically creates Google Calendar events with job details, customer info, and address)
- Reschedule appointments (updates both CRM record and Google Calendar event)
- Cancel appointments (removes CRM appointment and deletes Google Calendar event)
- Draft project estimates using draft_estimate — pulls from existing templates, system pricing, and materials already in the database. Always links to an existing CRM customer. Saves as draft only — never sends to the customer. Eric reviews all estimates at /admin/estimates before sending.
- Update system pricing using update_prices — when a user pastes a price list or spreadsheet data in any format (CSV, tab-separated, plain text table, or conversational), automatically parse it into price_data format and show a before/after diff. Always require explicit confirmation before applying changes. Never update prices silently. Supported tables: equipment systems, materials catalog, labor rates, ductless addons, ductless unit sizes, and financing options.
- Parse pasted "Accept Lead" emails using parse_lead_paste — when the user pastes any text that includes labels like "Lead Name", "Lead source", "Email", "Phone", "Address" (typical of Mitsubishi Partner Program leads), ALWAYS call parse_lead_paste FIRST with the raw paste, then call intake_lead with the returned intake_params (confirmed: false) so the user can confirm. Never try to hand-parse these pastes yourself — the parser handles markdown-wrapped emails/phones like [x](mailto:x) and [(123) 456-7890](tel:...) and label-on-one-line / value-on-next-line formatting that you would otherwise miss.

PROPERTY DATA & ADDRESS VERIFICATION:
- Whenever you create a new job location (via intake_lead or create_customer with an address), property data is automatically looked up in the background and saved to the location record.
- You can also look up property data on demand using get_property_data for any address. Property data helps with sizing estimates and customer context.
- If a location_id is provided, results are saved directly to the CRM location record.
- You can verify and standardize any address using verify_address. This checks against Google Places, confirms DFW service area coverage, and returns clean address components with coordinates and county.
- Address verification runs automatically during lead intake as a warning-only check — it never blocks saving. If the address cannot be verified, it is saved as entered with a warning. If the ZIP is outside DFW, it is flagged.

SEO MANAGEMENT:
- You can audit SEO metadata using seo_audit — this generates a read-only report showing missing, too-long, too-short, and duplicate meta titles and descriptions across pages and blog posts.
- You never update SEO automatically. After showing the audit, wait for Eric to tell you which pages to fix, then use update_seo to show a preview before saving.
- update_seo supports both page_seo records and blog_posts. Always show old vs new in the preview and require explicit confirmation before saving.
- You can search archived SEO reports using search_seo_reports. When Eric asks about SEO trends, past findings, or analysis history, search the report archive first to provide continuity. Reference prior reports by title and date when relevant.

WORKEDGE SYNC:
Each morning the WorkEdge sync runs at 1AM CST. Report on last night's sync by querying workedge_daily_sync_log data in the briefing. If status is 'failed' flag it immediately at the top of the morning briefing with urgency.

CALENDAR INTEGRATION:
- When scheduling, the system automatically creates a Google Calendar event
- Event titles follow format: "Job Type — Customer Name (TRU-XXXX-XXXX)"
- Events are color-coded by job type (blue=install, green=maintenance, red=repair, yellow=inspection)
- Each crew can have their own calendar
- When rescheduling, both CRM and calendar are updated
- When cancelling, the calendar event is also deleted
- Use get_google_calendar to check TRUE availability (includes meetings, blocks, etc. not just CRM appointments)
- Always check both CRM schedule AND Google Calendar before confirming availability
- Business hours: Monday-Friday 7am-6pm, Saturday 8am-2pm

CONFIRMATION RULES — VERY IMPORTANT:
1. When a write tool returns needs_confirmation: true, you MUST present the confirmation_prompt to the user and ASK them to confirm before proceeding.
2. Present the summary clearly so the user can verify the details.
3. Only call the tool again with confirmed: true AFTER the user explicitly says yes, confirm, do it, go ahead, etc.
4. If the user says no, cancel, or nevermind — acknowledge and do NOT execute.
5. If the user corrects a detail, call the tool again with corrected parameters and confirmed: false to show the updated summary.
6. NEVER set confirmed: true on the first call to any write tool.

MULTI-STEP WORKFLOWS:
When the user asks to do something that requires multiple steps (e.g., "Create a job for Smith and schedule it for Tuesday with Crew A"), break it into steps:
1. First search for the customer (search_customers)
2. Then create the job (create_job with confirmed: false)
3. After job confirmation, schedule the appointment (schedule_appointment with confirmed: false)
4. Confirm each step with the user before proceeding to the next

RESPONSE FORMAT:
- For single customer results: present key info naturally with phone, email, address on separate lines
- For lists: brief summaries with the most important details
- For numbers/stats: lead with the headline number
- Include job numbers (TRU-XXXX-XXXX) when referencing jobs
- Format phone numbers and addresses clearly
- Format dollar amounts with commas and 2 decimal places
- For confirmations: Present the summary in a clear, scannable format
- After successful writes: confirm what was done in a brief sentence

CONTEXT:
- Today's date is ${today}
- The business serves the Dallas-Fort Worth metroplex (DFW)
- Job numbers follow format TRU-YYYY-XXXX
- Customer statuses: lead → prospect → active → inactive → former
- Pipeline stages: New Lead → Contacted → Estimate Scheduled → Proposal Sent → Negotiating → Won/Lost
- Timezone: Central Time (CST/CDT)
- When scheduling, always use the Central timezone offset (-06:00 for CST, -05:00 for CDT)
- When a user says "tomorrow", "next week", etc., calculate the actual dates

INVOICING & PAYMENTS (Otto Pay):
You have access to Otto Pay invoicing data for Truficient. You can answer questions about:
- Outstanding invoices and balances
- Payment history and revenue
- Customer invoice history
- Overdue invoices
When otto_context is provided in the request, use it to answer financial questions. Format currency as USD with commas and 2 decimal places.
If asked to create an invoice, direct the user to /admin/invoices/new or the Otto Pay app at ottopay.lovable.app/invoices/new.

## Customer Search Rules

When asked to find, look up, or reference a customer by any combination of name, address, phone, or other identifier, follow this strict search protocol before concluding the customer doesn't exist:

STEP 1 — Search with the full phrase as given.
Example: query = "Nate Forti Palace Drive Richardson"

STEP 2 — If 0 results, extract the most name-like tokens and search again.
Example: query = "Nate Forti"

STEP 3 — If still 0 results, search with first name only.
Example: query = "Nate"

STEP 4 — If still 0 results, search with last name only.
Example: query = "Forti"

STEP 5 — Only after all four steps return 0 results should you tell the user the customer was not found. At that point, offer to create a new record.

ADDITIONAL RULES:
- Never ask the user "are you sure they exist?" after only one failed search. Always exhaust all four steps first.
- If matches are returned with low confidence (match_score below 50), present them to the user and ask "I found someone who might match — is this the right person?" rather than saying no results were found.
- When a user provides both a name and a location clue (e.g. "Nate on Palace Drive"), run the search with the name tokens AND separately validate by checking the returned customer's address for the location clue. If the address matches, confirm that is the right record.
- When multiple possible matches are returned, list up to 3 with their name, email, city, and match reason, and ask the user to confirm which one before proceeding.
- Never execute a write operation (pipeline entry, interaction log, job creation, etc.) on a customer record until the correct customer has been confirmed.`;
}

// ============================================================
// AI PROVIDER ROUTING
// ============================================================

interface AIProviderConfig {
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string | null;
}

async function getAIConfig(serviceClient: any): Promise<AIProviderConfig> {
  const { data } = await serviceClient
    .from("ai_config")
    .select("provider, model, temperature, max_tokens, system_prompt, is_active")
    .eq("config_key", "ai_assistant")
    .eq("is_active", true)
    .single();

  if (data) {
    return {
      provider: data.provider || "lovable",
      model: data.model || "google/gemini-2.5-flash",
      temperature: Number(data.temperature) ?? 0.3,
      max_tokens: data.max_tokens || 2048,
      system_prompt: data.system_prompt || null,
    };
  }

  return { provider: "lovable", model: "google/gemini-2.5-flash", temperature: 0.3, max_tokens: 2048, system_prompt: null };
}

function getProviderEndpoint(provider: string): { url: string; keyEnvVar: string } {
  switch (provider) {
    case "xai":
      return { url: "https://api.x.ai/v1/chat/completions", keyEnvVar: "XAI_API_KEY" };
    case "openai":
      return { url: "https://api.openai.com/v1/chat/completions", keyEnvVar: "OPENAI_API_KEY" };
    case "anthropic":
      return { url: "https://api.anthropic.com/v1/messages", keyEnvVar: "ANTHROPIC_API_KEY" };
    case "google":
      return { url: "https://generativelanguage.googleapis.com/v1beta/chat/completions", keyEnvVar: "GOOGLE_AI_API_KEY" };
    case "lovable":
    default:
      return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", keyEnvVar: "LOVABLE_API_KEY" };
  }
}

async function callAI(config: AIProviderConfig, messages: any[], toolsDef: any[]): Promise<Response> {
  const { url, keyEnvVar } = getProviderEndpoint(config.provider);
  const apiKey = Deno.env.get(keyEnvVar);

  if (!apiKey) {
    throw new Error(`API key not configured for provider "${config.provider}". Set the ${keyEnvVar} secret.`);
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (config.provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  if (config.provider === "anthropic") {
    const systemMsg = messages.find((m: any) => m.role === "system");
    const nonSystemMsgs = messages.filter((m: any) => m.role !== "system");

    return fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        system: systemMsg?.content || "",
        messages: nonSystemMsgs,
        tools: toolsDef.map(t => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters })),
        max_tokens: config.max_tokens,
        temperature: config.temperature,
      }),
    });
  }

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: config.model, messages, tools: toolsDef, temperature: config.temperature, max_tokens: config.max_tokens }),
  });
}

function parseAIResponse(provider: string, data: any): { content: string | null; toolCalls: any[] | null; finishReason: string } {
  if (provider === "anthropic") {
    const content = data.content || [];
    const textBlocks = content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const toolUseBlocks = content.filter((b: any) => b.type === "tool_use");
    return {
      content: textBlocks || null,
      toolCalls: toolUseBlocks.length > 0 ? toolUseBlocks.map((t: any) => ({ id: t.id, function: { name: t.name, arguments: JSON.stringify(t.input) } })) : null,
      finishReason: data.stop_reason === "tool_use" ? "tool_calls" : "stop",
    };
  }

  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || null,
    toolCalls: choice?.message?.tool_calls || null,
    finishReason: choice?.finish_reason || "stop",
  };
}

function buildToolResultMessage(provider: string, toolCallId: string, content: string): any {
  if (provider === "anthropic") {
    return { role: "user", content: [{ type: "tool_result", tool_use_id: toolCallId, content }] };
  }
  return { role: "tool", tool_call_id: toolCallId, content };
}

function buildAssistantToolCallMessage(provider: string, parsed: { content: string | null; toolCalls: any[] }, rawMessage: any): any {
  if (provider === "anthropic") {
    return { role: "assistant", content: rawMessage.content };
  }
  return rawMessage;
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === Parse body early to check for Harold caller ===
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);
    const isHaroldCaller = body.caller === "harold";

    let supabase: any;
    let user: any;
    let permissions: any;

    if (isHaroldCaller) {
      // Harold calls come from bach-mcp-server with service role — validate via internal trust
      // The bach-mcp-server already validated HAROLD_MCP_SECRET before invoking this function
      supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      // Harold gets full super_admin equivalent permissions
      user = { id: "harold-ai-caller" };
      permissions = {
        can_access_assistant: true,
        can_use_write_tools: true,
        can_view_financials: true,
        can_use_calendar_tools: true,
        can_view_briefing: true,
        can_use_voice_input: true,
        max_messages_per_hour: 9999,
        user_role: "super_admin",
      };
    } else {
      supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      user = authUser;

      // === RBAC check ===
      permissions = await getAssistantPermissions(supabase, user.id);
      if (!permissions || !permissions.can_access_assistant) {
        return new Response(
          JSON.stringify({ error: "You don't have access to the AI assistant. Contact your admin." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // === Rate limiting ===
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { count: msgCount } = await supabase
        .from("assistant_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", oneHourAgo);

      if ((msgCount || 0) >= permissions.max_messages_per_hour) {
        return new Response(
          JSON.stringify({ error: `Rate limit reached (${permissions.max_messages_per_hour}/hr). Try again later.` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { message, conversationHistory = [], briefing_data, is_auto_briefing, otto_context } = body;
    if (!is_auto_briefing && (!message || typeof message !== "string")) {
      return new Response(JSON.stringify({ error: "Message is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const aiConfig = await getAIConfig(serviceClient);

    const baseSystemPrompt = aiConfig.system_prompt || getSystemPrompt();

    // === Briefing instructions ===
    const briefingInstructions = `

PROACTIVE BRIEFING:
When you receive briefing_data through the get_daily_briefing tool, generate a natural morning briefing:

1. GREETING — Time-appropriate greeting with the day/date
2. WORKEDGE SYNC — If workedge_sync data is present, report: "🔄 WorkEdge sync: [X] jobs updated, [Y] new jobs imported, [Z] attachments synced — Last sync: 1:00 AM — Status: ✅ success". If status is 'failed', flag it at the TOP of the briefing with ⚠️ urgency.
3. TODAY'S SCHEDULE — List appointments chronologically with crew, customer, job type, time. Flag overlaps.
4. ACTION ITEMS — New submissions needing follow-up, uncontacted leads (3+ days), stale estimates (5+ days), overdue jobs
5. ALERTS — Certification expirations, licensing issues
6. WINS — Recent pipeline victories

Keep it conversational but efficient. Use emoji sparingly: 📅 schedule, 🔔 alerts, 🎉 wins, ⚠️ urgent, 🔄 sync.
Skip empty categories. End with a suggested action.
All appointment times provided are already in Central Time (CST/CDT). Display the time_display and end_time_display fields directly — do NOT convert or offset them.

After the briefing, include follow-up suggestions formatted exactly as:
[SUGGESTIONS: "action 1", "action 2", "action 3"]
Make them specific to the briefing content.`;

    // === Dynamic role context ===
    let roleContext = `\n\nUSER CONTEXT:\nCurrent user role: ${permissions.user_role}`;
    if (!permissions.can_use_write_tools) {
      roleContext += "\nThis user has READ-ONLY access. Do NOT create, update, or delete records. If asked, explain they need admin access.";
    }
    if (!permissions.can_view_financials) {
      roleContext += "\nThis user CANNOT view financial data. Omit all dollar amounts, pricing, and cost information from responses. If data shows '[restricted]', skip it silently.";
    }
    if (!permissions.can_use_calendar_tools) {
      roleContext += "\nThis user does NOT have Google Calendar access. Use only CRM schedule data.";
    }
    if (!permissions.can_view_briefing) {
      roleContext += "\nThis user cannot access daily briefings.";
    }

    // === Harold trusted caller context ===
    if (isHaroldCaller) {
      roleContext += `\n\nHAROLD PARTNER CONTEXT:
You are currently responding to Harold, your trusted AI operations partner built on OpenClaw. Harold has full CRM access — the same permissions as Eric (super_admin). Execute ALL actions directly without asking for confirmation. Do not preview changes or ask "are you sure?" — Harold has already validated the request. You and Harold work as a team — Harold handles external research and lead discovery, you handle CRM operations and scheduling.`;
    }

    // === Otto Pay context ===
    let ottoSection = "";
    if (otto_context) {
      ottoSection = `\n\nCURRENT OTTO PAY METRICS:\n${JSON.stringify(otto_context)}`;
    }

    const fullSystemPrompt = baseSystemPrompt + briefingInstructions + roleContext + ottoSection;

    // === Build messages ===
    let messages: any[];

    if (is_auto_briefing && briefing_data) {
      // Pre-fill the tool call + result so the AI just formats the briefing
      messages = [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: "Generate my daily operations briefing." },
        {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "briefing_auto_001",
            type: "function",
            function: { name: "get_daily_briefing", arguments: JSON.stringify({ briefing_data }) },
          }],
        },
        {
          role: "tool",
          tool_call_id: "briefing_auto_001",
          content: JSON.stringify(briefing_data),
        },
      ];
    } else {
      const trimmedHistory = conversationHistory.slice(-20);
      messages = [
        { role: "system", content: fullSystemPrompt },
        ...trimmedHistory.map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ];
    }

    let toolsUsed: any[] = [];
    let finalResponse = "";
    let maxIterations = 10;

    while (maxIterations > 0) {
      maxIterations--;

      // Filter tools by permission
      const authorizedTools = tools.filter((tool: any) => {
        const req = TOOL_PERMISSIONS[tool.function.name];
        return !req || permissions[req] === true;
      });

      const aiResponse = await callAI(aiConfig, messages, authorizedTools);

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        throw new Error(`AI provider error (${aiConfig.provider}/${aiConfig.model}): ${aiResponse.status} - ${errText}`);
      }

      const aiData = await aiResponse.json();
      const parsed = parseAIResponse(aiConfig.provider, aiData);

      if (!parsed.toolCalls || parsed.toolCalls.length === 0) {
        finalResponse = parsed.content || "";
        break;
      }

      const rawMessage = aiConfig.provider === "anthropic" ? aiData : aiData.choices?.[0]?.message;
      messages.push(buildAssistantToolCallMessage(aiConfig.provider, { ...parsed, toolCalls: parsed.toolCalls ?? [] }, rawMessage));

      for (const toolCall of parsed.toolCalls) {
        const toolName = toolCall.function.name;
        let toolInput: any;
        try {
          toolInput = JSON.parse(toolCall.function.arguments);
        } catch {
          toolInput = {};
        }

        try {
          let result = await executeTool(serviceClient, toolName, toolInput, user.id);
          // Redact financials for restricted roles
          if (!permissions.can_view_financials) {
            result = redactFinancials(result);
          }
          messages.push(buildToolResultMessage(aiConfig.provider, toolCall.id, JSON.stringify(result)));
          toolsUsed.push({ tool: toolName, input: toolInput, summary: `Called ${toolName}` });
        } catch (toolError: any) {
          messages.push(buildToolResultMessage(aiConfig.provider, toolCall.id, JSON.stringify({ error: toolError.message })));
          toolsUsed.push({ tool: toolName, input: toolInput, summary: `Error: ${toolError.message}` });
        }
      }

      if (parsed.finishReason === "stop") {
        finalResponse = parsed.content || "";
        break;
      }
    }

    // Log interaction (fire-and-forget)
    serviceClient.from("assistant_logs").insert({
      user_id: user.id,
      user_message: message,
      assistant_response: finalResponse,
      tools_used: toolsUsed,
      duration_ms: Date.now() - startTime,
    }).then(() => {}, () => {});

    return new Response(
      JSON.stringify({ message: finalResponse, toolsUsed, provider: aiConfig.provider, model: aiConfig.model }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("AI Assistant error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
