import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return null;
  } catch {
    return null;
  }
}

function extractMetaTag(html: string, key: string): string | null {
  const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const match = html.match(regex);
  return match?.[1]?.trim() || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { videoUrl, clipNumber } = await req.json();

    if (typeof videoUrl === "string") {
      const youtubeId = extractYouTubeId(videoUrl);
      if (youtubeId) {
        return new Response(
          JSON.stringify({ success: true, thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`, generated: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const pageRes = await fetch(videoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        const html = await pageRes.text();
        const thumbnailUrl = extractMetaTag(html, "og:image") || extractMetaTag(html, "twitter:image");
        if (thumbnailUrl) {
          return new Response(
            JSON.stringify({ success: true, thumbnailUrl, generated: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        // fall through to placeholder
      }
    }

    return new Response(
      JSON.stringify({ success: true, thumbnailUrl: `/placeholder.svg?clip=${clipNumber || 1}`, generated: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error", thumbnailUrl: "/placeholder.svg" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
