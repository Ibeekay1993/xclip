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

type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

function normalizeTranscriptInput(transcript: unknown): TranscriptSegment[] {
  if (Array.isArray(transcript)) {
    return transcript
      .map((segment) => ({
        start: parseTimeToSeconds((segment as any)?.start),
        end: Math.max(parseTimeToSeconds((segment as any)?.end), parseTimeToSeconds((segment as any)?.start) + 1),
        text: String((segment as any)?.text || "").trim(),
      }))
      .filter((segment) => segment.text.length > 0);
  }

  if (typeof transcript !== "string") return [];

  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [timePart, ...rest] = line.split(" - ");
      const start = parseTimeToSeconds(timePart || index * 8);
      const text = rest.join(" - ").trim();
      return {
        start,
        end: start + Math.max(10, Math.min(45, 10 + text.split(/\s+/).filter(Boolean).length * 1.5)),
        text,
      };
    })
    .filter((segment) => segment.text.length > 0);
}

function scoreSegment(text: string): number {
  const lower = text.toLowerCase();
  const hooks = [
    "wait for it",
    "you won't believe",
    "secret",
    "watch",
    "why",
    "how",
    "top",
    "best",
    "hack",
    "insane",
    "wild",
    "moment",
    "clip",
    "reaction",
  ];
  const questionBoost = lower.includes("?") ? 10 : 0;
  const hookBoost = hooks.reduce((count, hook) => count + (lower.includes(hook) ? 1 : 0), 0) * 12;
  const lengthBoost = Math.min(15, lower.split(/\s+/).filter(Boolean).length);
  const intensityBoost = /\b(oh|wow|holy|damn|crazy|brutal|amazing|incredible)\b/.test(lower) ? 8 : 0;
  return Math.max(35, Math.min(100, 40 + hookBoost + questionBoost + lengthBoost + intensityBoost));
}

function makeClipReason(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("?")) return "Question-driven engagement moment";
  if (lower.includes("wait") || lower.includes("secret") || lower.includes("watch")) return "Hook phrase detected";
  if (lower.includes("wow") || lower.includes("holy") || lower.includes("crazy")) return "High-energy reaction moment";
  return "Strong self-contained highlight";
}

function suppressOverlaps<T extends { start_time: number; end_time: number; hook_score: number }>(clips: T[]): T[] {
  const sorted = [...clips].sort((a, b) => b.hook_score - a.hook_score || a.start_time - b.start_time);
  const kept: T[] = [];

  for (const clip of sorted) {
    const overlaps = kept.some((existing) => !(clip.end_time <= existing.start_time + 3 || clip.start_time >= existing.end_time - 3));
    if (!overlaps) kept.push(clip);
  }

  return kept.sort((a, b) => a.start_time - b.start_time);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { transcript, clipCount = 5 } = await req.json();
    const segments = normalizeTranscriptInput(transcript);
    if (segments.length === 0) throw new Error("Transcript is required");

    const scoredSegments = segments.map((segment, index) => {
      const score = scoreSegment(segment.text);
      const duration = Math.max(12, Math.min(60, segment.end - segment.start));
      const startPadding = index === 0 ? 0 : 1.5;
      return {
        start_time: Number(Math.max(0, segment.start - startPadding).toFixed(2)),
        end_time: Number((segment.start - startPadding + duration).toFixed(2)),
        reason: makeClipReason(segment.text),
        hook_score: score,
        transcript: segment.text,
      };
    });

    const formattedClips = suppressOverlaps(
      scoredSegments
        .filter((clip) => clip.end_time > clip.start_time)
        .slice(0, Math.max(1, Number(clipCount) || 5))
    )
      .map((clip, index) => {
        const start = Math.max(0, clip.start_time);
        let end = Math.max(start + 12, clip.end_time);
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
