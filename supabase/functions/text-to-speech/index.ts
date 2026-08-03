import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Strip markdown, emoji, suggestion tags, and truncate for TTS */
function cleanTextForSpeech(raw: string): string {
  let text = raw;

  // Remove [SUGGESTIONS:...] blocks
  text = text.replace(/\[SUGGESTIONS:.*?\]/gs, "");

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, "");

  // Remove markdown bold/italic
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/\*(.*?)\*/g, "$1");

  // Remove markdown links [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove bullet markers
  text = text.replace(/^[•\-]\s*/gm, "");

  // Remove emoji at start of lines
  text = text.replace(/^[📞📧📍🏠📅💰🔧👷⚠️✅🔗🔄❌🎵]\s*/gm, "");

  // Remove URLs
  text = text.replace(/https?:\/\/[^\s)]+/g, "");

  // Collapse whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  // Truncate at ~2000 chars at sentence boundary
  if (text.length > 2000) {
    const truncated = text.substring(0, 2000);
    const lastSentence = truncated.lastIndexOf(".");
    if (lastSentence > 1500) {
      text = truncated.substring(0, lastSentence + 1);
    } else {
      text = truncated;
    }
    text += " For the full details, check the text above.";
  }

  return text;
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
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voice_id } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const voiceId =
      voice_id ||
      Deno.env.get("ELEVENLABS_VOICE_ID") ||
      "nPczCjzI2devNBz1zQrb"; // Brian

    const cleanedText = cleanTextForSpeech(text);

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanedText,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorBody = await ttsResponse.text();
      console.error("ElevenLabs API error:", ttsResponse.status, errorBody);
      throw new Error(
        `ElevenLabs API failed [${ttsResponse.status}]: ${errorBody}`
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
