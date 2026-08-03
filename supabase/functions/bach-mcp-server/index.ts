// supabase/functions/bach-mcp-server/index.ts
// MCP (Model Context Protocol) Server — Exposes Bach's CRM tools to Harold (OpenClaw)
// Protocol: JSON-RPC 2.0 over HTTP (MCP Streamable HTTP spec)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ============================================================
// CORS
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-caller",
};

// ============================================================
// JSON-RPC ERROR CODES
// ============================================================

const RPC_PARSE_ERROR = -32700;
const RPC_INVALID_REQUEST = -32600;
const RPC_METHOD_NOT_FOUND = -32601;
const RPC_INTERNAL_ERROR = -32603;

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function jsonRpcResult(id: string | number | null, result: any) {
  return { jsonrpc: "2.0", id, result };
}

// ============================================================
// CST TIMEZONE UTILITIES (copied from ai-assistant)
// ============================================================

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

// ============================================================
// MCP TOOL DEFINITIONS (JSON Schema format for MCP)
// ============================================================

const MCP_TOOLS = [
  // === READ TOOLS ===
  {
    name: "search_customers",
    description: "Search CRM customers by name, email, phone, address, or status. Returns matching customer records with primary location.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term — name, email, phone, or partial address" },
        status: { type: "string", enum: ["lead", "prospect", "active", "inactive", "former"], description: "Filter by customer lifecycle status" },
        limit: { type: "number", description: "Max results (default 10, max 25)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_customer_details",
    description: "Get comprehensive details for a specific customer by ID. Returns profile, locations, recent interactions, active jobs, and linked submissions.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "The UUID of the customer" },
      },
      required: ["customer_id"],
    },
  },
  {
    name: "search_jobs",
    description: "Search for jobs by job number (e.g., TRU-2026-0042), customer name, job type, current stage, or date range.",
    inputSchema: {
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
  {
    name: "get_schedule",
    description: "Get scheduled job appointments for a date range. Shows who is working where and when.",
    inputSchema: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "Start date YYYY-MM-DD (defaults to today)" },
        date_to: { type: "string", description: "End date YYYY-MM-DD (defaults to 7 days out)" },
        team_id: { type: "string", description: "Optional team UUID filter" },
      },
    },
  },
  {
    name: "get_submission_stats",
    description: "Get submission counts across all form types.",
    inputSchema: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "Start date YYYY-MM-DD" },
        date_to: { type: "string", description: "End date YYYY-MM-DD" },
        source: { type: "string", enum: ["ducted", "ductless", "scanner", "contact", "landing_page", "all"], description: "Filter by source" },
      },
    },
  },
  {
    name: "get_recent_submissions",
    description: "Get the most recent form submissions across all types.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number to return (default 10, max 25)" },
        source: { type: "string", enum: ["ducted", "ductless", "scanner", "contact", "landing_page"], description: "Optional filter" },
      },
    },
  },
  {
    name: "get_pipeline_overview",
    description: "Get sales pipeline summary with count and estimated value per stage.",
    inputSchema: {
      type: "object",
      properties: {
        include_entries: { type: "boolean", description: "Include individual entries (default false)" },
      },
    },
  },
  {
    name: "get_team_info",
    description: "Get information about teams/crews and their members.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Team or member name to search" },
        team_id: { type: "string", description: "Specific team ID" },
      },
    },
  },
  {
    name: "get_property_data",
    description: "Look up property data (square footage, year built, stories, bedrooms, bathrooms) for any address using RentCast. Optionally saves to CRM location.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Full street address" },
        city: { type: "string", description: "City" },
        state: { type: "string", description: "State abbreviation (default TX)" },
        zip_code: { type: "string", description: "ZIP code" },
        location_id: { type: "string", description: "Optional CRM location UUID to save data to" },
      },
      required: ["address"],
    },
  },
  {
    name: "verify_address",
    description: "Verify and standardize an address using Google Geocoding. Returns clean components, coordinates, county, and DFW service area check.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Raw address input" },
        city: { type: "string", description: "City" },
        state: { type: "string", description: "State (default TX)" },
        zip_code: { type: "string", description: "ZIP code" },
        save_to_location_id: { type: "string", description: "Optional CRM location UUID to update" },
      },
      required: ["address"],
    },
  },
  {
    name: "seo_audit",
    description: "Audit SEO metadata across all pages and blog posts. Returns read-only report of missing, too-long, too-short, and duplicate meta titles/descriptions.",
    inputSchema: {
      type: "object",
      properties: {
        scope: { type: "string", enum: ["all", "pages", "blog"], description: "Which content to audit (default: all)" },
        issue_filter: { type: "string", enum: ["all", "missing", "too_long", "too_short", "duplicate"], description: "Filter by issue type" },
        limit: { type: "number", description: "Max items to return (default 50)" },
      },
    },
  },
  {
    name: "search_seo_reports",
    description: "Search archived SEO reports by keyword, tag, page path, or date. Use when referencing past audits or asking 'what did we find about X'. Returns title, summary, date, and report_id for each match.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text search across title, summary, response" },
        tag: { type: "string", description: "Filter by tag" },
        page_path: { type: "string", description: "Filter to reports referencing this page path" },
        limit: { type: "number", description: "Max results, default 10" },
      },
    },
  },
  {
    name: "get_google_calendar",
    description: "Read events directly from Google Calendar for a date range. Shows all events including non-job items.",
    inputSchema: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "Start date (YYYY-MM-DD). Defaults to today." },
        date_to: { type: "string", description: "End date (YYYY-MM-DD). Defaults to 7 days from start." },
        team_id: { type: "string", description: "Optional team ID" },
      },
    },
  },
  {
    name: "get_job_types",
    description: "Get available job types and slugs. Read-only.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_pipeline_stages",
    description: "Get all pipeline stage definitions. Read-only.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_daily_briefing",
    description: "Generate today's operations briefing — appointments, submission stats, pipeline summary, alerts.",
    inputSchema: { type: "object", properties: {} },
  },
  // === WRITE TOOLS ===
  {
    name: "create_customer",
    description: "Create a new customer in the CRM. Optionally adds a primary location with auto property lookup.",
    inputSchema: {
      type: "object",
      properties: {
        first_name: { type: "string", description: "Customer's first name" },
        last_name: { type: "string", description: "Customer's last name" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number" },
        address_line1: { type: "string", description: "Street address (creates primary location)" },
        city: { type: "string", description: "City" },
        state: { type: "string", description: "State abbreviation (default TX)" },
        zip_code: { type: "string", description: "ZIP code" },
        lead_source: { type: "string", description: "How the customer was acquired" },
        customer_type: { type: "string", enum: ["residential", "commercial"], description: "Customer type (default residential)" },
        tags: { type: "array", items: { type: "string" }, description: "Tags" },
      },
      required: ["first_name", "last_name"],
    },
  },
  {
    name: "create_job",
    description: "Create a new job for an existing customer.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "UUID of the customer" },
        location_id: { type: "string", description: "UUID of the service location (optional, uses primary)" },
        job_type_slug: { type: "string", description: "Job type slug (e.g., 'ductless-install', 'repair')" },
        scheduled_date: { type: "string", description: "Scheduled date YYYY-MM-DD" },
        notes: { type: "string", description: "Notes for the job" },
      },
      required: ["customer_id", "job_type_slug"],
    },
  },
  {
    name: "update_job_stage",
    description: "Move a job to a different workflow stage.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "UUID of the job" },
        target_stage_name: { type: "string", description: "Stage name to move to" },
        notes: { type: "string", description: "Optional notes" },
      },
      required: ["job_id", "target_stage_name"],
    },
  },
  {
    name: "log_interaction",
    description: "Add an interaction (call, email, note, text, meeting, task) to a customer's timeline.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "UUID of the customer" },
        interaction_type: { type: "string", enum: ["call", "email", "text", "meeting", "note", "task"], description: "Type of interaction" },
        direction: { type: "string", enum: ["inbound", "outbound"], description: "Direction" },
        content: { type: "string", description: "Content/summary" },
        outcome: { type: "string", description: "Outcome" },
      },
      required: ["customer_id", "interaction_type", "content"],
    },
  },
  {
    name: "update_customer_status",
    description: "Change a customer's lifecycle status.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "UUID of the customer" },
        new_status: { type: "string", enum: ["lead", "prospect", "active", "inactive", "former"], description: "New status" },
        reason: { type: "string", description: "Reason for change" },
      },
      required: ["customer_id", "new_status"],
    },
  },
  {
    name: "add_to_pipeline",
    description: "Add a customer to the sales pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "UUID of the customer" },
        stage_name: { type: "string", description: "Pipeline stage name" },
        estimated_value: { type: "number", description: "Estimated deal value in dollars" },
        probability: { type: "number", description: "Win probability percentage (0-100)" },
        expected_close_date: { type: "string", description: "Expected close date YYYY-MM-DD" },
      },
      required: ["customer_id", "stage_name"],
    },
  },
  {
    name: "move_pipeline_entry",
    description: "Move an existing pipeline entry to a different stage.",
    inputSchema: {
      type: "object",
      properties: {
        entry_id: { type: "string", description: "UUID of the pipeline entry" },
        target_stage_name: { type: "string", description: "Stage to move to" },
      },
      required: ["entry_id", "target_stage_name"],
    },
  },
  {
    name: "update_pipeline_entry",
    description: "Update fields on an existing pipeline entry (estimated value, probability, expected close date, notes).",
    inputSchema: {
      type: "object",
      properties: {
        entry_id: { type: "string", description: "UUID of the pipeline entry" },
        customer_id: { type: "string", description: "UUID of customer (alternative to entry_id)" },
        estimated_value: { type: "number", description: "New estimated deal value in dollars" },
        probability: { type: "number", description: "New win probability (0-100)" },
        expected_close_date: { type: "string", description: "New expected close date YYYY-MM-DD" },
        notes: { type: "string", description: "Updated notes" },
      },
    },
  },
  {
    name: "schedule_appointment",
    description: "Create a timed appointment for an existing job with start/end time and optional team assignment. Creates Google Calendar event.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "UUID of the job" },
        start_datetime: { type: "string", description: "Start in ISO 8601 (e.g., '2026-03-15T09:00:00-06:00')" },
        end_datetime: { type: "string", description: "End in ISO 8601" },
        team_id: { type: "string", description: "UUID of team/crew" },
        notes: { type: "string", description: "Appointment notes" },
        skip_calendar: { type: "boolean", description: "Skip Google Calendar event creation (default false)" },
      },
      required: ["job_id", "start_datetime", "end_datetime"],
    },
  },
  {
    name: "reschedule_appointment",
    description: "Reschedule an existing job appointment to a new date/time. Updates CRM and Google Calendar.",
    inputSchema: {
      type: "object",
      properties: {
        appointment_id: { type: "string", description: "UUID of the appointment" },
        new_start_datetime: { type: "string", description: "New start time in ISO 8601" },
        new_end_datetime: { type: "string", description: "New end time in ISO 8601" },
        new_team_id: { type: "string", description: "Optional new team assignment" },
        reason: { type: "string", description: "Reason for rescheduling" },
      },
      required: ["appointment_id", "new_start_datetime", "new_end_datetime"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Cancel a job appointment. Removes CRM record and deletes Google Calendar event.",
    inputSchema: {
      type: "object",
      properties: {
        appointment_id: { type: "string", description: "UUID of the appointment" },
        reason: { type: "string", description: "Reason for cancellation" },
      },
      required: ["appointment_id"],
    },
  },
  {
    name: "intake_lead",
    description: "Full lead intake pipeline — creates customer, location, pipeline entry, logs interaction, syncs to GoHighLevel in one operation.",
    inputSchema: {
      type: "object",
      properties: {
        first_name: { type: "string", description: "Lead's first name" },
        last_name: { type: "string", description: "Lead's last name" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number" },
        address_line1: { type: "string", description: "Street address" },
        city: { type: "string", description: "City" },
        state: { type: "string", description: "State (default TX)" },
        zip_code: { type: "string", description: "ZIP code" },
        lead_source: { type: "string", description: "How the lead arrived (e.g. 'Referral', 'Google Ads')" },
        customer_type: { type: "string", enum: ["residential", "commercial"], description: "Customer type (default residential)" },
        tags: { type: "array", items: { type: "string" }, description: "Tags" },
        notes: { type: "string", description: "Additional context about the lead" },
      },
      required: ["first_name", "last_name"],
    },
  },
  {
    name: "review_submissions",
    description: "Scan and classify recent unreviewed submissions as real leads, junk, or unsure. Can archive junk or intake real leads.",
    inputSchema: {
      type: "object",
      properties: {
        lookback_hours: { type: "number", description: "How far back to scan (default 48 hours)" },
        confirmed_archive: { type: "array", items: { type: "string" }, description: "Submission IDs to archive" },
        confirmed_intake: { type: "array", items: { type: "string" }, description: "Submission IDs to intake" },
      },
    },
  },
  {
    name: "scan_watch_list",
    description: "Scan the equipment scanner database for high-priority leads based on equipment age, R-22 refrigerant, DFW location.",
    inputSchema: {
      type: "object",
      properties: {
        lookback_days: { type: "number", description: "How far back to scan (default 30 days)" },
        min_age_years: { type: "number", description: "Equipment age threshold in years (default 15)" },
        include_medium: { type: "boolean", description: "Include medium priority leads on intake (default false)" },
      },
    },
  },
  {
    name: "draft_estimate",
    description: "Draft a project estimate for a CRM customer using system pricing (1.35 margin, 8.25% tax). Saves as draft only.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "UUID of the CRM customer" },
        customer_name: { type: "string", description: "Customer name to search if ID unknown" },
        job_type: { type: "string", enum: ["residential_replacement", "residential_new", "commercial_replacement", "commercial_new", "maintenance", "repair"], description: "Job type" },
        heating_type: { type: "string", enum: ["gas", "electric", "heat_pump", "dual_fuel"], description: "Heating type (default heat_pump)" },
        template_id: { type: "string", description: "Optional template UUID" },
        title: { type: "string", description: "Custom title" },
        notes: { type: "string", description: "Job notes" },
      },
      required: ["job_type"],
    },
  },
  {
    name: "update_prices",
    description: "Update prices in system pricing tables (equipment, materials, labor, addons, ductless units, financing).",
    inputSchema: {
      type: "object",
      properties: {
        update_type: { type: "string", enum: ["equipment", "materials", "labor", "addons", "ductless_units", "financing"], description: "Which pricing table to update" },
        price_data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Item name to match" },
              sku: { type: "string", description: "SKU or model number" },
              new_price: { type: "number", description: "New price value" },
            },
            required: ["new_price"],
          },
          description: "Array of items with name/sku and new_price",
        },
        skip_unmatched: { type: "boolean", description: "Skip unmatched items (default true)" },
      },
      required: ["update_type", "price_data"],
    },
  },
  {
    name: "update_seo",
    description: "Update SEO metadata (meta title and/or description) for a page or blog post.",
    inputSchema: {
      type: "object",
      properties: {
        page_id: { type: "string", description: "UUID of the page_seo or blog_posts record" },
        source: { type: "string", enum: ["page", "blog"], description: "Record type (default: page)" },
        meta_title: { type: "string", description: "New meta title" },
        meta_description: { type: "string", description: "New meta description" },
      },
      required: ["page_id"],
    },
  },
  // === SEO LOCATION PAGE TOOLS ===
  {
    name: "list_location_pages",
    description: "List all SEO location pages with optional filters. Returns neighborhood, city, cluster, url_slug, primary_service, published status.",
    inputSchema: {
      type: "object",
      properties: {
        cluster: { type: "string", description: "Filter by cluster name (e.g. 'Oak Cliff', 'East Dallas')" },
        published: { type: "boolean", description: "Filter by published status" },
        limit: { type: "number", description: "Max results (default 50, max 200)" },
      },
    },
  },
  {
    name: "get_location_page",
    description: "Get full details of a specific SEO location page by ID or URL slug.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID of the location page" },
        url_slug: { type: "string", description: "URL slug (alternative to id)" },
      },
    },
  },
  {
    name: "create_location_page",
    description: "Create a new SEO location page. Also creates a linked page_seo entry for SEO tracking.",
    inputSchema: {
      type: "object",
      properties: {
        neighborhood: { type: "string", description: "Neighborhood/area name" },
        city: { type: "string", description: "City (default Dallas)" },
        state: { type: "string", description: "State (default TX)" },
        zip_code: { type: "string", description: "ZIP code" },
        cluster: { type: "string", description: "Cluster group (e.g. 'Oak Cliff', 'East Dallas', 'North Dallas')" },
        page_type: { type: "string", description: "Page type (default 'Neighborhood Hub')" },
        url_slug: { type: "string", description: "URL slug (e.g. '/mini-split-installation-oak-cliff-dallas/')" },
        h1_title: { type: "string", description: "Page H1 title" },
        meta_title: { type: "string", description: "Meta title (max 60 chars)" },
        meta_description: { type: "string", description: "Meta description (max 160 chars)" },
        target_keyword: { type: "string", description: "Target keyword" },
        housing_stock: { type: "string", description: "Local housing stock description" },
        local_landmark: { type: "string", description: "Nearby landmark" },
        utility_note: { type: "string", description: "Utility/energy note" },
        primary_service: { type: "string", description: "Primary service offered" },
        recommended_system: { type: "string", description: "Recommended HVAC system" },
        case_study_url: { type: "string", description: "Link to related case study" },
        template: { type: "string", description: "Template name" },
        schema_enabled: { type: "boolean", description: "Enable JSON-LD schema (default true)" },
        schema_description: { type: "string", description: "Schema description override" },
        published: { type: "boolean", description: "Publish immediately (default true)" },
      },
      required: ["neighborhood", "url_slug"],
    },
  },
  {
    name: "update_location_page",
    description: "Update an existing SEO location page by ID. Only provided fields are updated.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID of the location page" },
        neighborhood: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zip_code: { type: "string" },
        cluster: { type: "string" },
        page_type: { type: "string" },
        url_slug: { type: "string" },
        h1_title: { type: "string" },
        meta_title: { type: "string", description: "Updates linked page_seo record" },
        meta_description: { type: "string", description: "Updates linked page_seo record" },
        housing_stock: { type: "string" },
        local_landmark: { type: "string" },
        utility_note: { type: "string" },
        primary_service: { type: "string" },
        recommended_system: { type: "string" },
        case_study_url: { type: "string" },
        template: { type: "string" },
        schema_enabled: { type: "boolean" },
        schema_description: { type: "string" },
        published: { type: "boolean" },
        add_to_service_areas_hub: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_location_page",
    description: "Delete an SEO location page and its linked page_seo entry.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID of the location page to delete" },
      },
      required: ["id"],
    },
  },
  // === KNOWLEDGE BASE TOOLS ===
  {
    name: "list_knowledge_base",
    description: "List all knowledge base instruction documents. Optionally filter by category or tag.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category" },
        tag: { type: "string", description: "Filter by tag" },
        active_only: { type: "boolean", description: "Only active docs (default true)" },
      },
    },
  },
  {
    name: "get_knowledge_doc",
    description: "Get the full content of a knowledge base document by slug or ID.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Document slug" },
        id: { type: "string", description: "Document UUID (alternative to slug)" },
      },
    },
  },
  {
    name: "update_knowledge_doc",
    description: "Update an existing knowledge base document's content, title, category, tags, or active status.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID of the document" },
        slug: { type: "string", description: "Slug (alternative to id)" },
        title: { type: "string", description: "New title" },
        content: { type: "string", description: "New content" },
        category: { type: "string", description: "New category" },
        tags: { type: "array", items: { type: "string" }, description: "New tags" },
        is_active: { type: "boolean", description: "Active status" },
      },
    },
  },
  {
    name: "create_knowledge_doc",
    description: "Create a new knowledge base instruction document.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Document title" },
        slug: { type: "string", description: "URL-safe slug for referencing" },
        category: { type: "string", description: "Category (e.g. general, process, pricing, scheduling)" },
        content: { type: "string", description: "Full content/instructions" },
        tags: { type: "array", items: { type: "string" }, description: "Tags" },
      },
      required: ["title", "slug", "content"],
    },
  },
  // === NATURAL LANGUAGE PASSTHROUGH ===
  {
    name: "ask_bach",
    description: "Send a natural language request to Bach. Use this when you want Bach to reason about what to do, handle multi-step tasks, or when you're not sure which specific tool to call. Bach will figure out the right tools and execute them.",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Plain English request. Examples: 'Review new submissions and intake the real leads', 'Draft an estimate for Jane Smith for a residential replacement', 'What does today's schedule look like?'",
        },
        context: {
          type: "string",
          description: "Optional context Harold wants to share with Bach — e.g. customer info already known, prior conversation summary",
        },
      },
      required: ["message"],
    },
  },
];

// ============================================================
// TOOL EXECUTION — Delegates to the ai-assistant edge function
// via direct Supabase calls (same logic, service role)
// We invoke the ai-assistant's executeTool pattern directly
// by importing the same DB queries.
// 
// APPROACH: Instead of duplicating 3700 lines, we call the
// ai-assistant edge function internally with a special
// "direct tool execution" mode. But since that function requires
// auth, we instead replicate the executeTool router and import
// the execution functions inline. Given the massive size,
// we'll use a simpler approach: invoke the harold-api which
// already has this exact pattern.
//
// BEST APPROACH: Call the existing harold-api endpoint which
// already wraps Bach's tool execution. But that creates a
// circular dependency. Instead, we directly call the
// ai-assistant function with service role.
//
// FINAL APPROACH: Direct DB operations using the service client.
// We replicate the executeTool switch but delegate to the
// harold-api's internal tool calling by sending a natural
// language message. BUT for MCP we want deterministic tool
// calls, not NL interpretation.
//
// CLEANEST: We invoke supabase.functions.invoke("ai-assistant")
// with a system-level message that forces a specific tool call.
// This is fragile. Instead, let's just duplicate the executeTool
// router and all execute* functions by reading from the same
// Supabase tables with service role.
//
// PRAGMATIC: Since we can't import from ai-assistant/index.ts
// in edge functions, and the tool logic is 3000+ lines,
// we'll call the existing harold-api endpoint internally.
// harold-api already does NL → tool routing. For MCP,
// Harold sends structured tool calls, but we can translate
// them to NL prompts for Bach.
//
// ACTUALLY: The cleanest MCP approach is to execute tools
// directly against the DB. Let's do that by copying the
// executeTool router and all execute* functions here.
// But that's 3000 lines. 
//
// COMPROMISE: We'll invoke the harold-api function internally
// with precise prompts that map 1:1 to tool calls.
// ============================================================

// We use a hybrid approach: for the MCP server, we invoke the
// harold-api edge function which already has full tool access.
// The harold-api sends a natural language message to Bach who
// calls the right tools. For MCP, we craft precise messages
// that will map directly to tool calls.
//
// WAIT — harold-api also does NL → Bach → tools. That adds
// latency and non-determinism. For a proper MCP server,
// we need direct tool execution.
//
// FINAL DECISION: Directly execute tools using service role
// Supabase client. We'll copy the executeTool router and
// all the execute functions from ai-assistant. This is a
// one-time duplication that gives us deterministic, fast
// tool execution for MCP.

// Rather than duplicating 3000+ lines, we use a shared approach:
// invoke the ai-assistant edge function with a synthetic request
// that forces deterministic tool execution. We craft it so Bach
// calls exactly the tool we want.

// ACTUALLY — simplest correct approach: we POST to the
// ai-assistant function using service role with a message like
// "Call search_customers with query='Jeff Karr'" and let Bach
// route it. This works because Bach is deterministic for
// explicit tool requests.

// BUT — for maximum reliability and speed, let's use the
// service role client to execute tools directly. We'll create
// a lightweight tool executor that handles the most common
// patterns without duplicating all the complex logic.

// DEFINITIVE APPROACH: Execute tools by invoking the ai-assistant
// edge function using supabase.functions.invoke with service
// role credentials internally. We construct a message that
// explicitly requests the tool call, and return Bach's response.

async function executeToolViaBach(
  supabase: any,
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  // Non-system callers go through the standard confirm-before-write path.
  // Do NOT auto-inject confirmed=true here.

  const message = `[DIRECT_TOOL_CALL] Execute tool "${toolName}" with the following arguments: ${JSON.stringify(args)}. Follow the standard confirm-before-write flow for any write operation.`;

  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: {
      message,
      conversationHistory: [],
      context: { source: "bach-mcp-server", direct_tool_call: true },
    },
  });

  if (error) {
    throw new Error(`Tool execution failed: ${error.message}`);
  }

  return {
    message: data?.message || "Tool executed successfully.",
    toolsUsed: data?.toolsUsed || [],
  };
}

// For the daily briefing, we need to call the briefing edge function first
async function executeBriefingTool(supabase: any): Promise<any> {
  // Fetch briefing data
  const { data: briefingData, error: briefingError } = await supabase.functions.invoke("assistant-briefing", {
    body: {},
  });

  if (briefingError) {
    throw new Error(`Briefing fetch failed: ${briefingError.message}`);
  }

  // Now invoke ai-assistant with the briefing data
  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: {
      message: "Generate my daily briefing.",
      conversationHistory: [],
      briefing_data: briefingData,
      is_auto_briefing: true,
    },
  });

  if (error) throw new Error(`Briefing generation failed: ${error.message}`);

  return { message: data?.message || "Briefing unavailable." };
}

// Natural language passthrough to Bach
async function executeAskBach(
  supabase: any,
  message: string,
  context?: string
): Promise<any> {
  const fullMessage = context
    ? `Context: ${context}\n\nRequest: ${message}`
    : message;

  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: {
      message: fullMessage,
      conversationHistory: [],
    },
  });

  if (error) {
    throw new Error(`Bach response failed: ${error.message}`);
  }

  return {
    message: data?.message || "No response from Bach.",
    toolsUsed: data?.toolsUsed || [],
    provider: data?.provider,
    model: data?.model,
  };
}

// ============================================================
// MCP METHOD HANDLERS
// ============================================================

function handleInitialize(id: string | number | null) {
  return jsonRpcResult(id, {
    protocolVersion: "2024-11-05",
    serverInfo: { name: "bach-crm-server", version: "1.0.0" },
    capabilities: {
      tools: {},
      resources: { subscribe: false, listChanged: false },
    },
  });
}

// ============================================================
// MCP RESOURCE DEFINITIONS
// ============================================================

const MCP_RESOURCES = [
  {
    uri: "crm://customers/recent",
    name: "Recent Customers",
    description: "Most recent 20 CRM customers",
    mimeType: "application/json",
  },
  {
    uri: "crm://pipeline/overview",
    name: "Pipeline Overview",
    description: "Current pipeline stages and lead counts with estimated values",
    mimeType: "application/json",
  },
  {
    uri: "crm://jobs/active",
    name: "Active Jobs",
    description: "All active jobs with current stage, customer, and job type",
    mimeType: "application/json",
  },
  {
    uri: "crm://schedule/today",
    name: "Today's Schedule",
    description: "Today's appointments with team assignments and job details",
    mimeType: "application/json",
  },
  {
    uri: "crm://submissions/unreviewed",
    name: "Unreviewed Submissions",
    description: "New submissions from the last 48 hours not yet processed",
    mimeType: "application/json",
  },
  {
    uri: "crm://watchlist/high-priority",
    name: "Watch List High Priority",
    description: "Equipment scanner leads with 15+ year old systems in DFW area",
    mimeType: "application/json",
  },
  {
    uri: "crm://briefing/latest",
    name: "Latest Morning Briefing",
    description: "Most recent Bach morning briefing data",
    mimeType: "application/json",
  },
  {
    uri: "seo://location-pages",
    name: "SEO Location Pages",
    description: "All published SEO location pages with cluster, service, and slug info",
    mimeType: "application/json",
  },
  {
    uri: "knowledge://documents",
    name: "Knowledge Base Documents",
    description: "All active instruction documents from the knowledge base",
    mimeType: "application/json",
  },
];

function handleResourcesList(id: string | number | null) {
  return jsonRpcResult(id, { resources: MCP_RESOURCES });
}

// ============================================================
// RESOURCE READ HANDLERS
// ============================================================

const DFW_ZIPS = new Set([
  "75001","75002","75006","75007","75009","75010","75013","75019","75023","75024",
  "75025","75028","75034","75035","75038","75039","75040","75041","75042","75043",
  "75044","75048","75050","75051","75052","75054","75056","75057","75060","75061",
  "75062","75063","75065","75067","75068","75069","75070","75071","75074","75075",
  "75076","75077","75078","75080","75081","75082","75083","75085","75087","75088",
  "75089","75093","75094","75098","75104","75115","75116","75134","75137","75141",
  "75142","75146","75149","75150","75152","75154","75159","75166","75180","75181",
  "75182","75189","75201","75202","75203","75204","75205","75206","75207","75208",
  "75209","75210","75211","75212","75214","75215","75216","75217","75218","75219",
  "75220","75223","75224","75225","75226","75227","75228","75229","75230","75231",
  "75232","75233","75234","75235","75236","75237","75238","75240","75241","75243",
  "75244","75246","75247","75248","75249","75251","75252","75253","75254","75270",
  "76001","76002","76003","76005","76006","76010","76011","76012","76013","76014",
  "76015","76016","76017","76018","76019","76020","76021","76022","76023","76028",
  "76034","76039","76040","76044","76051","76052","76053","76054","76060","76063",
  "76064","76065","76071","76078","76084","76085","76086","76092","76093","76094",
  "76101","76102","76103","76104","76105","76106","76107","76108","76109","76110",
  "76111","76112","76114","76115","76116","76117","76118","76119","76120","76123",
  "76126","76127","76129","76131","76132","76133","76134","76135","76137","76140",
  "76148","76155","76164","76177","76179","76180","76182","76244","76248","76262",
]);

async function readResource(uri: string, supabase: any): Promise<any> {
  switch (uri) {
    case "crm://customers/recent": {
      const { data, error } = await supabase
        .from("crm_customers")
        .select("id, first_name, last_name, email, phone, customer_status, customer_type, lead_source, created_at, updated_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw new Error(`customers/recent: ${error.message}`);
      return data;
    }

    case "crm://pipeline/overview": {
      const { data: stages, error: stagesErr } = await supabase
        .from("crm_pipeline_stages")
        .select("id, name, display_name, sort_order, color, is_won_stage, is_lost_stage")
        .eq("is_active", true)
        .order("sort_order");
      if (stagesErr) throw new Error(`pipeline stages: ${stagesErr.message}`);

      const { data: entries, error: entriesErr } = await supabase
        .from("crm_pipeline_entries")
        .select("id, stage_id, estimated_value, probability, customer_id, crm_customers(first_name, last_name)")
      if (entriesErr) throw new Error(`pipeline entries: ${entriesErr.message}`);

      const stageMap = (stages || []).map((s: any) => {
        const stageEntries = (entries || []).filter((e: any) => e.stage_id === s.id);
        return {
          ...s,
          count: stageEntries.length,
          total_value: stageEntries.reduce((sum: number, e: any) => sum + (Number(e.estimated_value) || 0), 0),
          weighted_value: stageEntries.reduce((sum: number, e: any) => sum + (Number(e.estimated_value) || 0) * ((Number(e.probability) || 0) / 100), 0),
        };
      });
      return { stages: stageMap, total_entries: (entries || []).length };
    }

    case "crm://jobs/active": {
      const { data, error } = await supabase
        .from("crm_jobs")
        .select(`id, job_number, title, priority, scheduled_date, scheduled_end_date, created_at,
          crm_customers(id, first_name, last_name, phone),
          crm_job_types(name, slug, category),
          crm_job_stages!crm_jobs_current_stage_id_fkey(name, stage_type, color)`)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(`jobs/active: ${error.message}`);
      // Filter out completed/closed jobs
      return (data || []).filter((j: any) => j.crm_job_stages?.stage_type !== "end");
    }

    case "crm://schedule/today": {
      const now = new Date();
      const todayStr = getCSTDateStr(now);
      const dayStart = toCSTBoundary(todayStr, "00:00");
      const dayEnd = toCSTBoundary(todayStr, "23:59");

      const { data, error } = await supabase
        .from("crm_job_appointments")
        .select(`id, start_datetime, end_datetime, notes, title,
          crm_jobs(job_number, title, customer_id, scheduled_date,
            crm_customers(first_name, last_name, phone),
            crm_job_types(name, category),
            crm_locations(address_line1, city, state, zip_code)),
          crm_teams(name, color)`)
        .gte("start_datetime", dayStart)
        .lte("start_datetime", dayEnd)
        .order("start_datetime");
      if (error) throw new Error(`schedule/today: ${error.message}`);
      return (data || []).map((a: any) => ({
        ...a,
        start_display: formatTimeCST(a.start_datetime),
        end_display: a.end_datetime ? formatTimeCST(a.end_datetime) : null,
      }));
    }

    case "crm://submissions/unreviewed": {
      const cutoff = new Date(Date.now() - 48 * 3600000).toISOString();
      const [contact, landing, ductless, ducted, scanner] = await Promise.all([
        supabase.from("contact_submissions")
          .select("id, first_name, last_name, email, phone, service_type, created_at")
          .or("status.is.null,status.eq.new")
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false }),
        supabase.from("landing_page_submissions")
          .select("id, first_name, last_name, email, phone, service_type, created_at")
          .or("status.is.null,status.eq.new")
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false }),
        supabase.from("ductless_estimate_submissions")
          .select("id, customer_name, customer_email, customer_phone, created_at")
          .or("status.is.null,status.eq.new")
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false }),
        supabase.from("ducted_estimate_submissions")
          .select("id, customer_name, customer_email, customer_phone, created_at")
          .or("status.is.null,status.eq.new")
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false }),
        supabase.from("equipment_scans")
          .select("id, customer_name, email, phone, created_at, model_number, manufacturer, year, refrigerant_type, zip_code")
          .not("email", "is", null)
          .or("status.is.null,status.eq.new")
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false }),
      ]);
      return {
        contact: contact.data || [],
        landing_page: landing.data || [],
        ductless: ductless.data || [],
        ducted: ducted.data || [],
        scanner: scanner.data || [],
        total: (contact.data?.length || 0) + (landing.data?.length || 0) + (ductless.data?.length || 0) + (ducted.data?.length || 0) + (scanner.data?.length || 0),
      };
    }

    case "crm://watchlist/high-priority": {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from("equipment_scans")
        .select("id, customer_name, email, phone, model_number, manufacturer, year, refrigerant_type, zip_code, created_at")
        .not("email", "is", null)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(`watchlist: ${error.message}`);
      // Filter: age 15+, DFW zip, not already converted
      return (data || []).filter((s: any) => {
        const age = s.year ? currentYear - Number(s.year) : 0;
        const inDFW = s.zip_code && DFW_ZIPS.has(String(s.zip_code));
        return age >= 15 && inDFW;
      });
    }

    case "crm://briefing/latest": {
      // Call the briefing edge function to get fresh data
      const { data, error } = await supabase.functions.invoke("assistant-briefing", { body: {} });
      if (error) throw new Error(`briefing: ${error.message}`);
      return data;
    }

    case "seo://location-pages": {
      const { data, error } = await supabase
        .from("seo_location_pages")
        .select("id, neighborhood, city, state, cluster, url_slug, primary_service, published, schema_enabled, created_at")
        .order("cluster")
        .order("neighborhood")
        .limit(200);
      if (error) throw new Error(`location-pages: ${error.message}`);
      return data;
    }

    case "knowledge://documents": {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("id, title, slug, category, content, tags, is_active, created_at, updated_at")
        .eq("is_active", true)
        .order("category")
        .order("title");
      if (error) throw new Error(`knowledge docs: ${error.message}`);
      return data;
    }

    default:
      throw new Error(`Unknown resource URI: ${uri}`);
  }
}

async function handleResourcesRead(id: string | number | null, params: any, supabase: any) {
  const uri = params?.uri;
  if (!uri) {
    return jsonRpcError(id, RPC_INVALID_REQUEST, "Missing params.uri");
  }
  const validResource = MCP_RESOURCES.find(r => r.uri === uri);
  if (!validResource) {
    return jsonRpcError(id, RPC_METHOD_NOT_FOUND, `Unknown resource: ${uri}. Use resources/list to see available resources.`);
  }
  try {
    const data = await readResource(uri, supabase);
    return jsonRpcResult(id, {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data),
      }],
    });
  } catch (err: any) {
    return jsonRpcError(id, RPC_INTERNAL_ERROR, `Resource read failed: ${err.message}`);
  }
}

function handleToolsList(id: string | number | null) {
  return jsonRpcResult(id, { tools: MCP_TOOLS });
}

async function handleToolsCall(
  id: string | number | null,
  params: any,
  supabase: any
) {
  const toolName = params?.name;
  const args = params?.arguments || {};

  if (!toolName) {
    return jsonRpcError(id, RPC_INVALID_REQUEST, "Missing tool name in params.name");
  }

  const validTool = MCP_TOOLS.find(t => t.name === toolName);
  if (!validTool) {
    return jsonRpcError(id, RPC_METHOD_NOT_FOUND, `Unknown tool: ${toolName}. Use tools/list to see available tools.`);
  }

  try {
    let result: any;

    // Direct execution for location page tools (no need to route through Bach)
    if (toolName === "list_location_pages") {
      let query = supabase.from("seo_location_pages")
        .select("id, neighborhood, city, state, zip_code, cluster, url_slug, primary_service, h1_title, published, schema_enabled, add_to_service_areas_hub, created_at");
      if (args.cluster) query = query.eq("cluster", args.cluster);
      if (args.published !== undefined) query = query.eq("published", args.published);
      const limit = Math.min(args.limit || 50, 200);
      query = query.order("neighborhood").limit(limit);
      const { data, error } = await query;
      if (error) throw new Error(`list_location_pages: ${error.message}`);
      result = { message: JSON.stringify({ pages: data || [], count: (data || []).length }) };
    } else if (toolName === "get_location_page") {
      let query = supabase.from("seo_location_pages").select("*");
      if (args.id) query = query.eq("id", args.id);
      else if (args.url_slug) query = query.eq("url_slug", args.url_slug);
      else throw new Error("Provide either id or url_slug");
      const { data, error } = await query.single();
      if (error) throw new Error(`get_location_page: ${error.message}`);
      // Also fetch linked SEO data
      let seoData = null;
      if ((data as any).page_seo_id) {
        const { data: seo } = await supabase.from("page_seo").select("meta_title, meta_description, target_keyword, index_status").eq("id", (data as any).page_seo_id).single();
        seoData = seo;
      }
      result = { message: JSON.stringify({ ...data, seo: seoData }) };
    } else if (toolName === "create_location_page") {
      // 1. Create page_seo entry
      const pageName = args.h1_title || `${args.primary_service || 'HVAC Services'} in ${args.neighborhood}`;
      const { data: seoEntry, error: seoError } = await supabase.from("page_seo").insert({
        page_path: args.url_slug,
        page_name: pageName,
        meta_title: args.meta_title || null,
        meta_description: args.meta_description || null,
        page_type: args.page_type || "Neighborhood Hub",
        target_keyword: args.target_keyword || null,
        cluster: args.cluster || null,
        index_status: "Pending",
        schema_applied: args.schema_enabled !== false,
        robots: "index, follow",
      }).select("id").single();
      if (seoError) throw new Error(`create page_seo: ${seoError.message}`);
      // 2. Create location page
      const { data: locData, error: locError } = await supabase.from("seo_location_pages").insert({
        page_seo_id: (seoEntry as any).id,
        neighborhood: args.neighborhood,
        city: args.city || "Dallas",
        state: args.state || "TX",
        zip_code: args.zip_code || null,
        cluster: args.cluster || null,
        page_type: args.page_type || "Neighborhood Hub",
        url_slug: args.url_slug,
        h1_title: args.h1_title || null,
        housing_stock: args.housing_stock || null,
        local_landmark: args.local_landmark || null,
        utility_note: args.utility_note || null,
        primary_service: args.primary_service || null,
        recommended_system: args.recommended_system || null,
        case_study_url: args.case_study_url || null,
        template: args.template || "Standard Neighborhood Hub",
        schema_enabled: args.schema_enabled !== false,
        schema_description: args.schema_description || null,
        published: args.published !== false,
        add_to_service_areas_hub: true,
      }).select("id, url_slug").single();
      if (locError) throw new Error(`create location page: ${locError.message}`);
      result = { message: `Location page created: ${args.neighborhood} at ${args.url_slug} (ID: ${(locData as any).id})` };
    } else if (toolName === "update_location_page") {
      const updateFields: any = {};
      const seoFields: any = {};
      const locationFields = ["neighborhood", "city", "state", "zip_code", "cluster", "page_type", "url_slug", "h1_title", "housing_stock", "local_landmark", "utility_note", "primary_service", "recommended_system", "case_study_url", "template", "schema_enabled", "schema_description", "published", "add_to_service_areas_hub"];
      for (const f of locationFields) {
        if (args[f] !== undefined) updateFields[f] = args[f];
      }
      if (args.meta_title !== undefined) seoFields.meta_title = args.meta_title;
      if (args.meta_description !== undefined) seoFields.meta_description = args.meta_description;
      
      if (Object.keys(updateFields).length > 0) {
        const { error } = await supabase.from("seo_location_pages").update(updateFields).eq("id", args.id);
        if (error) throw new Error(`update location page: ${error.message}`);
      }
      // Update linked page_seo if SEO fields provided
      if (Object.keys(seoFields).length > 0) {
        const { data: loc } = await supabase.from("seo_location_pages").select("page_seo_id").eq("id", args.id).single();
        if (loc && (loc as any).page_seo_id) {
          await supabase.from("page_seo").update(seoFields).eq("id", (loc as any).page_seo_id);
        }
      }
      result = { message: `Location page ${args.id} updated successfully.` };
    } else if (toolName === "delete_location_page") {
      // Get page_seo_id first
      const { data: loc } = await supabase.from("seo_location_pages").select("page_seo_id, neighborhood").eq("id", args.id).single();
      if (!loc) throw new Error("Location page not found");
      const { error } = await supabase.from("seo_location_pages").delete().eq("id", args.id);
      if (error) throw new Error(`delete location page: ${error.message}`);
      if ((loc as any).page_seo_id) {
        await supabase.from("page_seo").delete().eq("id", (loc as any).page_seo_id);
      }
      result = { message: `Location page "${(loc as any).neighborhood}" deleted.` };
    } else if (toolName === "list_knowledge_base") {
      let query = supabase.from("knowledge_base")
        .select("id, title, slug, category, tags, is_active, created_at, updated_at");
      if (args.active_only !== false) query = query.eq("is_active", true);
      if (args.category) query = query.eq("category", args.category);
      query = query.order("category").order("title");
      const { data, error } = await query;
      if (error) throw new Error(`list_knowledge_base: ${error.message}`);
      let filtered = data || [];
      if (args.tag) filtered = filtered.filter((d: any) => d.tags?.includes(args.tag));
      result = { message: JSON.stringify({ documents: filtered, count: filtered.length }) };
    } else if (toolName === "get_knowledge_doc") {
      let query = supabase.from("knowledge_base").select("*");
      if (args.id) query = query.eq("id", args.id);
      else if (args.slug) query = query.eq("slug", args.slug);
      else throw new Error("Provide either id or slug");
      const { data, error } = await query.single();
      if (error) throw new Error(`get_knowledge_doc: ${error.message}`);
      result = { message: JSON.stringify(data) };
    } else if (toolName === "update_knowledge_doc") {
      const updateFields: any = {};
      for (const f of ["title", "content", "category", "tags", "is_active"]) {
        if (args[f] !== undefined) updateFields[f] = args[f];
      }
      if (Object.keys(updateFields).length === 0) throw new Error("No fields to update");
      let query = supabase.from("knowledge_base").update(updateFields);
      if (args.id) query = query.eq("id", args.id);
      else if (args.slug) query = query.eq("slug", args.slug);
      else throw new Error("Provide either id or slug");
      const { error } = await query;
      if (error) throw new Error(`update_knowledge_doc: ${error.message}`);
      result = { message: `Knowledge doc updated successfully.` };
    } else if (toolName === "create_knowledge_doc") {
      const { data, error } = await supabase.from("knowledge_base").insert({
        title: args.title, slug: args.slug, content: args.content,
        category: args.category || "general", tags: args.tags || [],
      }).select("id, slug").single();
      if (error) throw new Error(`create_knowledge_doc: ${error.message}`);
      result = { message: `Knowledge doc created: "${args.title}" (slug: ${(data as any).slug}, id: ${(data as any).id})` };
    } else if (toolName === "ask_bach") {
      result = await executeAskBach(supabase, args.message, args.context);
    } else if (toolName === "get_daily_briefing") {
      result = await executeBriefingTool(supabase);
    } else {
      result = await executeToolViaBach(supabase, toolName, args);
    }

    return jsonRpcResult(id, {
      content: [
        {
          type: "text",
          text: typeof result.message === "string" ? result.message : JSON.stringify(result),
        },
      ],
    });
  } catch (err: any) {
    return jsonRpcError(id, RPC_INTERNAL_ERROR, `Tool execution failed: ${err.message}`);
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify(jsonRpcError(null, RPC_INVALID_REQUEST, "Only POST is allowed")),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // === Authentication ===
  const mcpSecret = Deno.env.get("HAROLD_MCP_SECRET");
  if (!mcpSecret) {
    return new Response(
      JSON.stringify(jsonRpcError(null, RPC_INTERNAL_ERROR, "Server misconfigured: missing MCP secret")),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.replace("Bearer ", "") !== mcpSecret) {
    return new Response(
      JSON.stringify(jsonRpcError(null, RPC_INTERNAL_ERROR, "Unauthorized")),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // x-caller is optional and informational only — bearer token auth above is the gate.


  // === Parse JSON-RPC body ===
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify(jsonRpcError(null, RPC_PARSE_ERROR, "Invalid JSON")),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { method, params, id } = body;

  if (!method || typeof method !== "string") {
    return new Response(
      JSON.stringify(jsonRpcError(id || null, RPC_INVALID_REQUEST, "Missing or invalid method")),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // === Service role client for internal function invocations ===
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // === Log the request ===
  const startTime = Date.now();

  // === Route MCP methods ===
  let response: any;

  switch (method) {
    case "initialize":
      response = handleInitialize(id);
      break;
    case "tools/list":
      response = handleToolsList(id);
      break;
    case "tools/call":
      response = await handleToolsCall(id, params, supabase);
      break;
    case "resources/list":
      response = handleResourcesList(id);
      break;
    case "resources/read":
      response = await handleResourcesRead(id, params, supabase);
      break;
    default:
      response = jsonRpcError(id, RPC_METHOD_NOT_FOUND, `Unknown method: ${method}`);
  }

  // === Log to assistant_logs ===
  if (method === "tools/call" || method === "resources/read") {
    const logDetail = method === "tools/call"
      ? `${params?.name || "unknown"} — ${JSON.stringify(params?.arguments || {}).substring(0, 500)}`
      : `${params?.uri || "unknown"}`;
    supabase.from("assistant_logs").insert({
      user_id: null,
      user_message: `[HAROLD-MCP] ${method}: ${logDetail}`,
      assistant_response: JSON.stringify(response.result || response.error || {}).substring(0, 2000),
      tools_used: method === "tools/call" ? [{ tool: params?.name, input: params?.arguments }] : [{ tool: "resource_read", input: { uri: params?.uri } }],
      duration_ms: Date.now() - startTime,
    }).then(() => {}, () => {});
  }

  return new Response(
    JSON.stringify(response),
    {
      status: response.error ? (response.error.code === RPC_INTERNAL_ERROR ? 500 : 400) : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
