import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: any[];
  actions: any[];
  is_active: boolean;
}

interface TriggerEvent {
  type: string;
  data: Record<string, any>;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    switch (action) {
      case "process-event":
        return await processEvent(supabase, params, startTime);

      case "list-automations":
        return await listAutomations(supabase);

      case "execute-automation":
        return await executeAutomation(supabase, params, startTime);

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Automation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processEvent(supabase: any, params: any, startTime: number): Promise<Response> {
  const { triggerType, eventData } = params;

  // Fetch matching active automations
  const { data: automations, error } = await supabase
    .from("automations")
    .select("*")
    .eq("trigger_type", triggerType)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to fetch automations: ${error.message}`);
  }

  if (!automations || automations.length === 0) {
    return new Response(
      JSON.stringify({ message: "No matching automations found", processed: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const results = [];

  for (const automation of automations) {
    try {
      // Check conditions
      const conditionsMet = evaluateConditions(automation.conditions, eventData);
      
      if (!conditionsMet) {
        console.log(`Conditions not met for automation: ${automation.name}`);
        continue;
      }

      // Execute actions
      const actionResults = await executeActions(supabase, automation.actions, eventData);

      // Log execution
      await supabase.from("automation_logs").insert({
        automation_id: automation.id,
        trigger_event: { type: triggerType, data: eventData, timestamp: new Date().toISOString() },
        actions_executed: actionResults,
        status: actionResults.every((r: any) => r.success) ? "success" : "partial",
        duration_ms: Date.now() - startTime,
      });

      // Update automation stats
      await supabase
        .from("automations")
        .update({
          run_count: automation.run_count + 1,
          last_run_at: new Date().toISOString(),
        })
        .eq("id", automation.id);

      results.push({
        automationId: automation.id,
        automationName: automation.name,
        success: true,
        actionResults,
      });
    } catch (err) {
      console.error(`Failed to execute automation ${automation.id}:`, err);

      // Log failure
      await supabase.from("automation_logs").insert({
        automation_id: automation.id,
        trigger_event: { type: triggerType, data: eventData, timestamp: new Date().toISOString() },
        actions_executed: [],
        status: "failed",
        error_message: err instanceof Error ? err.message : "Unknown error",
        duration_ms: Date.now() - startTime,
      });

      results.push({
        automationId: automation.id,
        automationName: automation.name,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function listAutomations(supabase: any): Promise<Response> {
  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch automations: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ automations: data }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function executeAutomation(supabase: any, params: any, startTime: number): Promise<Response> {
  const { automationId, testData } = params;

  const { data: automation, error } = await supabase
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .single();

  if (error || !automation) {
    return new Response(
      JSON.stringify({ error: "Automation not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const actionResults = await executeActions(supabase, automation.actions, testData || {});

  // Log execution
  await supabase.from("automation_logs").insert({
    automation_id: automationId,
    trigger_event: { type: "manual", data: testData || {}, timestamp: new Date().toISOString() },
    actions_executed: actionResults,
    status: actionResults.every((r: any) => r.success) ? "success" : "partial",
    duration_ms: Date.now() - startTime,
  });

  return new Response(
    JSON.stringify({ success: true, actionResults }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function evaluateConditions(conditions: any[], eventData: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) => {
    const { field, operator, value } = condition;
    const fieldValue = getNestedValue(eventData, field);

    switch (operator) {
      case "equals":
        return fieldValue === value;
      case "not_equals":
        return fieldValue !== value;
      case "contains":
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case "greater_than":
        return Number(fieldValue) > Number(value);
      case "less_than":
        return Number(fieldValue) < Number(value);
      case "is_empty":
        return !fieldValue || fieldValue === "";
      case "is_not_empty":
        return !!fieldValue && fieldValue !== "";
      default:
        console.warn(`Unknown operator: ${operator}`);
        return true;
    }
  });
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

async function executeActions(supabase: any, actions: any[], eventData: Record<string, any>): Promise<any[]> {
  const results = [];

  for (const action of actions) {
    try {
      let result: any = { type: action.type, success: true };

      switch (action.type) {
        case "update_customer_status":
          if (eventData.customer_id) {
            await supabase
              .from("crm_customers")
              .update({ customer_status: action.config?.status || "active" })
              .eq("id", eventData.customer_id);
            result.message = `Updated customer status to ${action.config?.status}`;
          }
          break;

        case "log_interaction":
          if (eventData.customer_id) {
            await supabase.from("crm_interactions").insert({
              customer_id: eventData.customer_id,
              interaction_type: action.config?.type || "system",
              subject: action.config?.subject || "Automation triggered",
              content: action.config?.content || `Automation action executed`,
              direction: "outbound",
            });
            result.message = "Interaction logged";
          }
          break;

        case "create_job":
          if (eventData.customer_id) {
            const { data: jobTypes } = await supabase
              .from("crm_job_types")
              .select("id")
              .eq("slug", action.config?.job_type || "service-call")
              .single();

            if (jobTypes) {
              await supabase.from("crm_jobs").insert({
                customer_id: eventData.customer_id,
                job_type_id: jobTypes.id,
                title: action.config?.title || "New Job from Automation",
                priority: action.config?.priority || "normal",
                location_id: eventData.location_id || null,
              });
              result.message = "Job created";
            }
          }
          break;

        case "send_notification":
          // This would send an internal notification
          result.message = `Notification: ${action.config?.message || "No message"}`;
          break;

        case "webhook":
          if (action.config?.url) {
            const webhookResponse = await fetch(action.config.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: eventData,
                automation_action: action.config,
              }),
            });
            result.message = `Webhook called: ${webhookResponse.status}`;
            result.success = webhookResponse.ok;
          }
          break;

        default:
          result.message = `Unknown action type: ${action.type}`;
          result.success = false;
      }

      results.push(result);
    } catch (err) {
      console.error(`Action ${action.type} failed:`, err);
      results.push({
        type: action.type,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}
