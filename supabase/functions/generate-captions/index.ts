import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, clipStart, clipEnd, style = "default" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!transcript) {
      throw new Error("Transcript is required");
    }

    console.log("Generating captions for clip:", clipStart, "-", clipEnd);

    const stylePrompts: Record<string, string> = {
      default: "Standard captions with proper punctuation and timing",
      viral: "SHORT, PUNCHY captions with EMPHASIS on key words. Use ALL CAPS for important phrases. Maximum impact.",
      minimal: "Clean, simple captions. One thought per line. No filler words.",
      storytelling: "Flowing narrative captions that build suspense and engagement. Add '...' for dramatic pauses.",
      meme: "Casual, internet-style captions. Include reactions like 'wait for it...', 'no way 😱', 'this is insane'",
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional caption generator for viral short-form video content.

Style: ${stylePrompts[style] || stylePrompts.default}

Generate captions that:
1. Are perfectly timed for each phrase (2-5 words per caption block)
2. Use natural reading rhythm
3. Emphasize key words and phrases
4. Are optimized for TikTok/Reels/Shorts viewing
5. Include proper timing relative to clip start

Return ONLY valid JSON array:
[
  {
    "start": <seconds from clip start>,
    "end": <seconds from clip start>,
    "text": "caption text",
    "emphasis": true/false (highlight this caption)
  }
]`
          },
          {
            role: "user",
            content: `Generate ${style} style captions for this transcript segment (clip from ${clipStart}s to ${clipEnd}s):

${transcript}

Break into short, readable caption blocks with proper timing.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let captions = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        captions = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse captions:", e);
      throw new Error("Failed to generate captions");
    }

    console.log("Generated", captions.length, "caption blocks");

    return new Response(
      JSON.stringify({ success: true, captions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating captions:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
