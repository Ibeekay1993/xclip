import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CaptionBlock = {
  start: number;
  end: number;
  text: string;
  emphasis: boolean;
};

function parseTime(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return Math.max(0, asNumber);
  }
  return 0;
}

function chunkWords(text: string, size = 4): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks;
}

function buildCaptions(transcript: string, clipStart: number, clipEnd: number, style: string): CaptionBlock[] {
  const plainText = transcript
    .replace(/^\d{1,2}:\d{2}(?::\d{2})?\s*-\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) return [];

  const chunks = chunkWords(plainText, style === "viral" ? 3 : 4);
  const duration = Math.max(8, clipEnd - clipStart);
  const blockDuration = Math.max(1.3, Math.min(4, duration / Math.max(1, chunks.length)));

  return chunks.map((chunk, index) => {
    const start = index * blockDuration;
    const end = Math.min(duration, start + blockDuration);
    const emphasis = /(!|\?|wait|secret|wow|insane|crazy|best|top|hack)/i.test(chunk);
    return {
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2)),
      text: style === "meme" ? chunk.toUpperCase() : chunk,
      emphasis,
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transcript, clipStart = 0, clipEnd = 30, style = "default" } = await req.json();
    if (typeof transcript !== "string" || transcript.trim().length === 0) {
      throw new Error("Transcript is required");
    }

    const safeStart = parseTime(clipStart);
    const safeEnd = Math.max(safeStart + 1, parseTime(clipEnd));
    const captions = buildCaptions(transcript, safeStart, safeEnd, String(style));

    return new Response(
      JSON.stringify({
        success: true,
        captions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating captions:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
