import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseTimeToSeconds(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);

  if (typeof value === "string") {
    const ts = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (ts) {
      const a = Number(ts[1]);
      const b = Number(ts[2]);
      const c = ts[3] ? Number(ts[3]) : null;
      if (c !== null) return a * 3600 + b * 60 + c;
      return a * 60 + b;
    }

    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return Math.max(0, asNumber);
  }

  return 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { transcript, clipCount = 5 } = await req.json();
    if (!transcript || typeof transcript !== "string") throw new Error("Transcript is required");
    const lines = transcript
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const segments = lines.map((line, index) => {
      const [timePart, ...rest] = line.split(" - ");
      const start = parseTimeToSeconds(timePart || index * 8);
      const text = rest.join(" - ").trim();
      const words = text.split(/\s+/).filter(Boolean);
      const hookWords = ["wait", "secret", "why", "how", "best", "top", "hack", "shock", "wild", "insane", "clip", "moment"];
      const hookHits = words.reduce((count, word) => count + (hookWords.some((h) => word.toLowerCase().includes(h)) ? 1 : 0), 0);
      const score = Math.max(35, Math.min(100, 45 + hookHits * 10 + Math.min(words.length, 12)));
      return {
        start,
        end: start + Math.min(45, Math.max(12, 12 + words.length * 2)),
        reason: hookHits > 0 ? "Hook keywords detected" : "Engaging segment",
        hook_score: score,
        transcript: text,
      };
    });

    const formattedClips = segments
      .slice(0, clipCount)
      .map((clip, index) => {
        const start = Math.max(0, clip.start);
        let end = Math.max(start + 12, clip.end);
        if (end - start > 60) end = start + 60;
        return {
          clip_number: index + 1,
          start_time: Number(start.toFixed(2)),
          end_time: Number(end.toFixed(2)),
          duration: Number((end - start).toFixed(2)),
          reason: String(clip.reason || "Strong hook and self-contained moment"),
          hook_score: Math.max(1, Math.min(100, Number(clip.hook_score || 70))),
          transcript: String(clip.transcript || ""),
        };
      });

    return new Response(JSON.stringify({ clips: formattedClips }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-clips:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
