import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: { email: string }[];
  colorId?: string;
}

// Cache for access tokens
let cachedToken: { token: string; expiresAt: number } | null = null;

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function createJWT(credentials: ServiceAccountCredentials): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: credentials.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Import the private key
  const pemContents = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${signatureInput}.${encodedSignature}`;
}

async function getAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  // Check cache
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const jwt = await createJWT(credentials);

  const response = await fetch(credentials.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

async function listCalendars(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list calendars: ${error}`);
  }

  return response.json();
}

async function getEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get events: ${error}`);
  }

  return response.json();
}

async function createEvent(
  accessToken: string,
  calendarId: string,
  event: GoogleCalendarEvent
) {
  // Remove attendees - service accounts cannot invite without Domain-Wide Delegation
  const { attendees, ...eventWithoutAttendees } = event;
  
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventWithoutAttendees),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create event: ${error}`);
  }

  return response.json();
}

async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: GoogleCalendarEvent
) {
  // Remove attendees - service accounts cannot invite without Domain-Wide Delegation
  const { attendees, ...eventWithoutAttendees } = event;
  
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventWithoutAttendees),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update event: ${error}`);
  }

  return response.json();
}

async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok && response.status !== 410 && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete event: ${error}`);
  }

  return { success: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get service account credentials
    const credentialsJson = Deno.env.get("GOOGLE_CALENDAR_SERVICE_ACCOUNT");
    if (!credentialsJson) {
      return new Response(
        JSON.stringify({ error: "Google Calendar service account not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const credentials: ServiceAccountCredentials = JSON.parse(credentialsJson);
    const accessToken = await getAccessToken(credentials);

    const { action, ...params } = await req.json();

    switch (action) {
      case "list-calendars": {
        const calendars = await listCalendars(accessToken);
        return new Response(JSON.stringify(calendars), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync-calendars": {
        const calendarsResponse = await listCalendars(accessToken);
        const calendars = calendarsResponse.items || [];

        // Upsert calendars to database
        for (const cal of calendars) {
          await supabase.from("google_calendars").upsert(
            {
              calendar_id: cal.id,
              name: cal.summary || cal.id,
              description: cal.description,
              color: cal.backgroundColor || "#4285f4",
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: "calendar_id" }
          );
        }

        // Get updated list from database
        const { data: dbCalendars } = await supabase
          .from("google_calendars")
          .select("*")
          .order("name");

        return new Response(JSON.stringify({ calendars: dbCalendars }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-events": {
        const { calendarId, timeMin, timeMax } = params;
        const events = await getEvents(accessToken, calendarId, timeMin, timeMax);
        return new Response(JSON.stringify(events), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-all-events": {
        const { timeMin, timeMax, calendarIds } = params;
        const allEvents: any[] = [];

        for (const calId of calendarIds) {
          try {
            const events = await getEvents(accessToken, calId, timeMin, timeMax);
            if (events.items) {
              allEvents.push(
                ...events.items.map((e: any) => ({ ...e, calendarId: calId }))
              );
            }
          } catch (err) {
            console.error(`Failed to fetch events for calendar ${calId}:`, err);
          }
        }

        return new Response(JSON.stringify({ items: allEvents }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create-event": {
        const { calendarId, event } = params;
        const createdEvent = await createEvent(accessToken, calendarId, event);
        return new Response(JSON.stringify(createdEvent), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update-event": {
        const { calendarId, eventId, event } = params;
        const updatedEvent = await updateEvent(
          accessToken,
          calendarId,
          eventId,
          event
        );
        return new Response(JSON.stringify(updatedEvent), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete-event": {
        const { calendarId, eventId } = params;
        const result = await deleteEvent(accessToken, calendarId, eventId);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "check-availability": {
        const { calendarIds, timeMin, timeMax, excludeEventId } = params;
        const conflicts: any[] = [];

        for (const calId of calendarIds) {
          try {
            const events = await getEvents(accessToken, calId, timeMin, timeMax);
            if (events.items) {
              const filtered = excludeEventId
                ? events.items.filter((e: any) => e.id !== excludeEventId)
                : events.items;
              conflicts.push(...filtered.map((e: any) => ({ ...e, calendarId: calId })));
            }
          } catch (err) {
            console.error(`Failed to check availability for ${calId}:`, err);
          }
        }

        return new Response(
          JSON.stringify({ hasConflicts: conflicts.length > 0, conflicts }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "add-calendar": {
        const { calendarId } = params;
        if (!calendarId) {
          return new Response(
            JSON.stringify({ error: "Calendar ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fetch calendar metadata directly by ID
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to access calendar:", errorText);
          return new Response(
            JSON.stringify({ 
              error: "Cannot access this calendar. Ensure it's shared with the service account.",
              details: errorText 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const calData = await response.json();

        // Upsert to database
        const { error: upsertError } = await supabase.from("google_calendars").upsert(
          {
            calendar_id: calendarId,
            name: calData.summary || calendarId,
            description: calData.description,
            color: calData.backgroundColor || "#4285f4",
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "calendar_id" }
        );

        if (upsertError) {
          console.error("Failed to save calendar:", upsertError);
          return new Response(
            JSON.stringify({ error: "Failed to save calendar to database" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, calendar: calData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Google Calendar sync error:", error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
