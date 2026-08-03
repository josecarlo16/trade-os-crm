import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// === CST Timezone Utilities ===
const TZ = "America/Chicago";

function getCSTDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ }); // "YYYY-MM-DD"
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
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateCST(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

serve(async (req) => {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: claimsData.claims.sub };

    // Check permissions
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "No role assigned" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: perms } = await supabase
      .from("assistant_role_permissions")
      .select("*")
      .eq("role_name", roleData.role)
      .single();

    if (!perms?.can_access_assistant || !perms?.can_view_briefing) {
      return new Response(JSON.stringify({ error: "Briefing access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const todayStr = getCSTDateStr(now);
    const tomorrowStr = getCSTDateStr(new Date(now.getTime() + 86400000));

    // Run all queries in parallel
    const [
      todayAppointments,
      tomorrowAppointments,
      newSubmissions,
      uncontactedLeads,
      staleEstimates,
      expiringCerts,
      recentPipelineWins,
      overdueJobs,
      workedgeSyncResult,
      openSeoActions,
      latestSeoReport,
    ] = await Promise.all([
      // Today's appointments
      supabase
        .from("crm_job_appointments")
        .select(`id, start_datetime, end_datetime, notes,
          crm_jobs(job_number, customer_id,
            crm_customers(first_name, last_name, phone),
            crm_job_types(name, category)),
          crm_teams(name, color)`)
        .gte("start_datetime", toCSTBoundary(todayStr, "00:00"))
        .lte("start_datetime", toCSTBoundary(todayStr, "23:59"))
        .order("start_datetime"),

      // Tomorrow's appointments
      supabase
        .from("crm_job_appointments")
        .select(`id, start_datetime, end_datetime,
          crm_jobs(job_number,
            crm_customers(first_name, last_name),
            crm_job_types(name)),
          crm_teams(name)`)
        .gte("start_datetime", toCSTBoundary(tomorrowStr, "00:00"))
        .lte("start_datetime", toCSTBoundary(tomorrowStr, "23:59"))
        .order("start_datetime"),

      // New submissions via RPC
      supabase.rpc("get_new_submission_counts").then(r => r, () => ({ data: { total: 0, new_last_24h: 0, breakdown: {} } })),

      // Uncontacted leads
      supabase
        .from("crm_customers")
        .select(`id, first_name, last_name, email, phone, created_at,
          crm_interactions(id, created_at)`)
        .eq("customer_status", "lead")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20),

      // Stale pipeline entries
      supabase
        .from("crm_pipeline_entries")
        .select(`id, estimated_value, created_at, updated_at,
          crm_customers(first_name, last_name),
          crm_pipeline_stages(name, display_name)`)
        .order("updated_at", { ascending: true })
        .limit(20),

      // Expiring certs
      supabase
        .from("crm_team_members")
        .select("id, first_name, last_name, license_number, license_expiry")
        .not("license_expiry", "is", null)
        .lte("license_expiry", new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0])
        .gte("license_expiry", todayStr),

      // Recent wins
      supabase
        .from("crm_pipeline_entries")
        .select(`id, estimated_value, updated_at,
          crm_customers(first_name, last_name),
          crm_pipeline_stages(name)`)
        .gte("updated_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .order("updated_at", { ascending: false })
        .limit(5),

      // Overdue jobs
      supabase
        .from("crm_jobs")
        .select(`id, job_number, scheduled_date,
          crm_customers(first_name, last_name),
          crm_job_types(name),
          crm_job_stages!crm_jobs_current_stage_id_fkey(name, stage_type)`)
        .lt("scheduled_date", todayStr)
        .is("deleted_at", null)
        .order("scheduled_date", { ascending: true })
        .limit(10),

      // WorkEdge daily sync — most recent log entry
      supabase
        .from("workedge_daily_sync_log")
        .select("*")
        .order("sync_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Open SEO action items
      supabase
        .from("seo_report_actions")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),

      // Most recent SEO report
      supabase
        .from("seo_reports")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Process uncontacted leads — filter to those with no interactions or last > 3 days
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const uncontactedList = (uncontactedLeads.data || []).filter((lead: any) => {
      const interactions = lead.crm_interactions || [];
      if (interactions.length === 0) return true;
      const lastInteraction = interactions.sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      return lastInteraction.created_at < threeDaysAgo;
    });

    // Process stale estimates — filter to proposal stages not updated in 5+ days
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    const staleList = (staleEstimates.data || []).filter((entry: any) => {
      const stageName = entry.crm_pipeline_stages?.name || "";
      return (stageName === "proposal_sent" || stageName === "estimate_scheduled") && entry.updated_at < fiveDaysAgo;
    });

    // Filter overdue jobs to exclude completed/closed
    const overdueList = (overdueJobs.data || []).filter((job: any) => {
      return job.crm_job_stages?.stage_type !== "end";
    });

    // Filter recent wins to won stages
    const winsList = (recentPipelineWins.data || []).filter((w: any) => {
      return w.crm_pipeline_stages?.name === "won";
    });

    // Build alerts
    const alerts: Array<{
      type: string;
      severity: "info" | "warning" | "urgent";
      title: string;
      detail: string;
      entity_id?: string;
      entity_type?: string;
    }> = [];

    // Cert alerts
    (expiringCerts.data || []).forEach((member: any) => {
      const daysUntil = Math.ceil(
        (new Date(member.license_expiry).getTime() - now.getTime()) / 86400000
      );
      alerts.push({
        type: "cert_expiring",
        severity: daysUntil <= 14 ? "urgent" : "warning",
        title: `${member.first_name} ${member.last_name}'s license expires ${daysUntil <= 0 ? "TODAY" : `in ${daysUntil} days`}`,
        detail: `License #${member.license_number || "N/A"} — expires ${member.license_expiry}`,
        entity_id: member.id,
        entity_type: "team_member",
      });
    });

    // Uncontacted lead alerts
    uncontactedList.slice(0, 5).forEach((lead: any) => {
      const daysOld = Math.ceil(
        (now.getTime() - new Date(lead.created_at).getTime()) / 86400000
      );
      alerts.push({
        type: "uncontacted_lead",
        severity: daysOld >= 5 ? "urgent" : "warning",
        title: `${lead.first_name} ${lead.last_name} — uncontacted for ${daysOld} days`,
        detail: lead.phone || lead.email || "No contact info",
        entity_id: lead.id,
        entity_type: "customer",
      });
    });

    // Stale estimate alerts
    staleList.slice(0, 5).forEach((entry: any) => {
      const daysStale = Math.ceil(
        (now.getTime() - new Date(entry.updated_at).getTime()) / 86400000
      );
      alerts.push({
        type: "stale_estimate",
        severity: "warning",
        title: `${entry.crm_customers?.first_name} ${entry.crm_customers?.last_name} — estimate sent ${daysStale} days ago`,
        detail: entry.estimated_value ? `$${Number(entry.estimated_value).toLocaleString()} estimated` : "No value set",
        entity_id: entry.id,
        entity_type: "pipeline_entry",
      });
    });

    // Overdue job alerts
    overdueList.forEach((job: any) => {
      alerts.push({
        type: "overdue_job",
        severity: "urgent",
        title: `${job.job_number} is past scheduled date`,
        detail: `${job.crm_customers?.first_name} ${job.crm_customers?.last_name} — ${job.crm_job_types?.name} — was due ${job.scheduled_date}`,
        entity_id: job.id,
        entity_type: "job",
      });
    });

    const submissionData = newSubmissions.data || { total: 0, new_last_24h: 0, breakdown: {} };

    const briefingData = {
      generated_at: now.toISOString(),
      today_appointments: (todayAppointments.data || []).map((apt: any) => ({
        id: apt.id,
        time: apt.start_datetime,
        end_time: apt.end_datetime,
        time_display: formatTimeCST(apt.start_datetime),
        end_time_display: formatTimeCST(apt.end_datetime),
        date_display: formatDateCST(apt.start_datetime),
        job_number: apt.crm_jobs?.job_number,
        customer: `${apt.crm_jobs?.crm_customers?.first_name || ""} ${apt.crm_jobs?.crm_customers?.last_name || ""}`.trim(),
        phone: apt.crm_jobs?.crm_customers?.phone,
        job_type: apt.crm_jobs?.crm_job_types?.name,
        team: apt.crm_teams?.name,
        team_color: apt.crm_teams?.color,
      })),
      tomorrow_appointments: (tomorrowAppointments.data || []).map((apt: any) => ({
        id: apt.id,
        time: apt.start_datetime,
        time_display: formatTimeCST(apt.start_datetime),
        end_time_display: apt.end_datetime ? formatTimeCST(apt.end_datetime) : undefined,
        job_number: apt.crm_jobs?.job_number,
        customer: `${apt.crm_jobs?.crm_customers?.first_name || ""} ${apt.crm_jobs?.crm_customers?.last_name || ""}`.trim(),
        job_type: apt.crm_jobs?.crm_job_types?.name,
        team: apt.crm_teams?.name,
      })),
      new_submissions_count: submissionData.total || 0,
      new_submissions_breakdown: submissionData.breakdown || {},
      uncontacted_leads_count: uncontactedList.length,
      stale_estimates_count: staleList.length,
      recent_wins: winsList.map((w: any) => ({
        customer: `${w.crm_customers?.first_name || ""} ${w.crm_customers?.last_name || ""}`.trim(),
        value: w.estimated_value,
        date: w.updated_at,
      })),
      recent_wins_total: winsList.reduce(
        (sum: number, w: any) => sum + (Number(w.estimated_value) || 0), 0
      ),
      workedge_sync: workedgeSyncResult.data ? {
        sync_at: workedgeSyncResult.data.sync_at,
        jobs_created: workedgeSyncResult.data.jobs_created,
        jobs_updated: workedgeSyncResult.data.jobs_updated,
        attachments_synced: workedgeSyncResult.data.attachments_synced,
        status: workedgeSyncResult.data.status,
        duration_ms: workedgeSyncResult.data.duration_ms,
        has_errors: !!workedgeSyncResult.data.errors,
      } : null,
      seo: {
        open_actions_count: (openSeoActions as any)?.count || 0,
        latest_report: (latestSeoReport as any)?.data ? {
          id: (latestSeoReport as any).data.id,
          title: (latestSeoReport as any).data.title,
          created_at: (latestSeoReport as any).data.created_at,
        } : null,
      },
      alerts,
      alerts_by_severity: {
        urgent: alerts.filter(a => a.severity === "urgent").length,
        warning: alerts.filter(a => a.severity === "warning").length,
        info: alerts.filter(a => a.severity === "info").length,
      },
      badge_count:
        alerts.filter(a => a.severity === "urgent").length +
        (submissionData.new_last_24h || 0),
    };

    return new Response(JSON.stringify(briefingData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Briefing error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
