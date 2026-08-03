import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { action, payload } = await req.json();

    let messages: { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }[] = [];
    let tools: any[] | undefined;
    let tool_choice: any | undefined;

    switch (action) {
      case "line-item-assist": {
        messages = [
          {
            role: "system",
            content: "You are a professional invoice line item writer for a service business (HVAC, plumbing, electrical, etc). Given a rough description, rewrite it as a clear, professional invoice line item description. Keep it concise (1-2 sentences). Include specific work performed. Do not include pricing or quantities."
          },
          { role: "user", content: `Rewrite this as a professional invoice line item: "${payload.description}"` }
        ];
        break;
      }

      case "business-snapshot": {
        const m = payload.metrics;
        messages = [
          {
            role: "system",
            content: "You are a business analyst for a service company. Given financial metrics, write a 3-4 sentence plain-English summary of business health. Be direct and actionable. Mention specific numbers."
          },
          {
            role: "user",
            content: `Here are the current business metrics:
- Total Revenue (paid invoices): $${m.totalRevenue?.toFixed(2) || '0.00'}
- Outstanding Balance: $${m.outstanding?.toFixed(2) || '0.00'}
- Overdue Invoices: ${m.overdueCount || 0}
- Invoices This Month: ${m.thisMonth || 0}
- Recent Payments Count: ${m.recentPayments || 0}

Provide a business health summary.`
          }
        ];
        break;
      }

      case "scan-receipt": {
        messages = [
          {
            role: "system",
            content: "You are a receipt scanner AI. Extract structured data from receipt images or text descriptions. Return the data using the provided tool."
          },
          {
            role: "user",
            content: payload.imageBase64
              ? [
                  { type: "text", text: "Extract vendor name, total amount, date, and expense category from this receipt image." },
                  { type: "image_url", image_url: { url: `data:image/jpeg;base64,${payload.imageBase64}` } }
                ]
              : `Extract receipt data from this description: "${payload.description}"`
          }
        ];
        tools = [
          {
            type: "function",
            function: {
              name: "extract_receipt",
              description: "Extract structured receipt data",
              parameters: {
                type: "object",
                properties: {
                  vendor: { type: "string", description: "Vendor/store name" },
                  amount: { type: "number", description: "Total amount" },
                  date: { type: "string", description: "Date in YYYY-MM-DD format" },
                  category: {
                    type: "string",
                    enum: ["materials", "tools", "fuel", "office", "meals", "travel", "equipment", "supplies", "other"],
                    description: "Expense category"
                  }
                },
                required: ["vendor", "amount", "date", "category"],
                additionalProperties: false
              }
            }
          }
        ];
        tool_choice = { type: "function", function: { name: "extract_receipt" } };
        break;
      }

      case "photo-catalog": {
        messages = [
          {
            role: "system",
            content: "You are an equipment/parts identification AI for HVAC, plumbing, and electrical service businesses. Identify the item in the image and suggest catalog details."
          },
          {
            role: "user",
            content: payload.imageBase64
              ? [
                  { type: "text", text: "Identify this part/equipment and provide catalog details." },
                  { type: "image_url", image_url: { url: `data:image/jpeg;base64,${payload.imageBase64}` } }
                ]
              : `Identify this item and provide catalog details: "${payload.description}"`
          }
        ];
        tools = [
          {
            type: "function",
            function: {
              name: "create_catalog_item",
              description: "Create a catalog entry for the identified item",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Item name" },
                  category: { type: "string", description: "Category (e.g. compressor, thermostat, filter)" },
                  description: { type: "string", description: "Brief description" },
                  suggested_price: { type: "number", description: "Suggested unit price in USD" },
                  item_type: { type: "string", enum: ["material", "equipment"], description: "Whether this is a material or equipment" }
                },
                required: ["name", "category", "description", "suggested_price", "item_type"],
                additionalProperties: false
              }
            }
          }
        ];
        tool_choice = { type: "function", function: { name: "create_catalog_item" } };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const body: any = {
      model: "google/gemini-2.5-flash",
      messages,
      max_tokens: 1000,
    };
    if (tools) body.tools = tools;
    if (tool_choice) body.tool_choice = tool_choice;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const choice = result.choices?.[0];

    // Handle tool calls
    if (choice?.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ result: args, tool: toolCall.function.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle text response
    return new Response(JSON.stringify({ result: choice?.message?.content || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("otto-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
