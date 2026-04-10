import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ParsedUrl = { platform: "youtube" | "kick" | "twitch" | "tiktok" | "direct"; videoId: string };
type Segment = { start: number; end: number; text: string };

function parseVideoUrl(url: string): ParsedUrl | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    if (urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be")) {
      let videoId = urlObj.searchParams.get("v");
      if (!videoId && urlObj.hostname.includes("youtu.be")) videoId = urlObj.pathname.slice(1);
      if (videoId) return { platform: "youtube", videoId };
    }

    if (urlObj.hostname.includes("kick.com")) {
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      const videoIdx = pathParts.indexOf("videos");
      if (videoIdx !== -1 && pathParts[videoIdx + 1]) {
        return { platform: "kick", videoId: pathParts[videoIdx + 1] };
      }
      if (pathParts.includes("clips")) {
        return { platform: "kick", videoId: pathParts[pathParts.length - 1] || "kick-clip" };
      }
    }

    if (urlObj.hostname.includes("twitch.tv")) {
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.includes("videos")) {
        return { platform: "twitch", videoId: pathParts[pathParts.length - 1] || "twitch-vod" };
      }
      if (pathParts.includes("clip")) {
        return { platform: "twitch", videoId: pathParts[pathParts.length - 1] || "twitch-clip" };
      }
    }

    if (urlObj.hostname.includes("tiktok.com")) {
      const match = urlObj.pathname.match(/video\/(\d+)/);
      if (match) return { platform: "tiktok", videoId: match[1] };
    }

    if (
      /\.(mp4|mov|webm|m4v|mkv|avi|quicktime)(\?|#|$)/i.test(urlObj.pathname) ||
      urlObj.hostname.includes("supabase.co") ||
      pathname.includes("/storage/v1/object/public/") ||
      pathname.includes("/storage/v1/object/sign/")
    ) {
      return { platform: "direct", videoId: urlObj.pathname.split("/").pop() || "uploaded-video" };
    }

    return null;
  } catch {
    return null;
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function extractMetaTag(html: string, key: string): string | null {
  const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const match = html.match(regex);
  return match?.[1]?.trim() || null;
}

async function fetchPageMetadata(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const html = await res.text();

    const title = extractMetaTag(html, "og:title") || html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || null;
    const description = extractMetaTag(html, "og:description") || extractMetaTag(html, "description");
    const thumbnailUrl = extractMetaTag(html, "og:image") || extractMetaTag(html, "twitter:image");

    return { title, description, thumbnailUrl };
  } catch {
    return { title: null, description: null, thumbnailUrl: null };
  }
}

function parseJson3Transcript(data: any): Segment[] {
  const events = Array.isArray(data?.events) ? data.events : [];
  const segments: Segment[] = [];

  for (const event of events) {
    if (!Array.isArray(event?.segs)) continue;
    const text = event.segs.map((seg: any) => seg?.utf8 || "").join("").replace(/\s+/g, " ").trim();
    if (!text) continue;

    const start = Math.max(0, Number(event?.tStartMs || 0) / 1000);
    const duration = Math.max(0.8, Number(event?.dDurationMs || 2000) / 1000);
    segments.push({ start, end: start + duration, text });
  }

  return segments;
}

async function fetchYouTubeTranscript(videoId: string) {
  const playerRes = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20250301.00.00",
          hl: "en",
          gl: "US",
        },
      },
    }),
  });

  if (!playerRes.ok) throw new Error(`YouTube player API error: ${playerRes.status}`);
  const playerData = await playerRes.json();

  const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No public captions available for this YouTube video");
  }

  const preferredTrack = tracks.find((track: any) => track?.languageCode === "en") || tracks[0];
  const baseUrl = preferredTrack?.baseUrl;
  if (!baseUrl) throw new Error("Caption track URL missing");

  const transcriptRes = await fetch(`${baseUrl}&fmt=json3`);
  if (!transcriptRes.ok) throw new Error(`YouTube transcript API error: ${transcriptRes.status}`);

  const transcriptData = await transcriptRes.json();
  const segments = parseJson3Transcript(transcriptData);
  if (segments.length === 0) throw new Error("No transcript segments found");

  const duration = Number(playerData?.videoDetails?.lengthSeconds || 0) || segments[segments.length - 1]?.end || 300;
  const title = playerData?.videoDetails?.title || null;
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    transcript: segments.map((segment) => `${formatTime(segment.start)} - ${segment.text}`).join("\n"),
    segments,
    duration,
    metadata: { title, thumbnailUrl, description: null },
  };
}

async function generateFallbackTranscript(platform: string, videoId: string, videoUrl: string, metadata: { title: string | null; description: string | null; thumbnailUrl: string | null }) {
  const textParts = [
    metadata.title || "",
    metadata.description || "",
    platform,
    videoId,
    videoUrl,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const keywords = Array.from(new Set(textParts)).slice(0, 18);
  const baseLines = keywords.length > 0
    ? keywords
    : [platform, "video", "clip", "moment", "highlight", "reaction"];

  const approxDuration = platform === "tiktok" ? 180 : platform === "kick" ? 900 : 600;
  const segments: Segment[] = baseLines.map((word, index) => {
    const start = index * 8;
    return {
      start,
      end: Math.min(start + 8, approxDuration),
      text: `${word} ${index % 2 === 0 ? "highlight" : "moment"}`,
    };
  });

  const transcript = segments.map((segment) => `${formatTime(segment.start)} - ${segment.text}`).join("\n");
  return { transcript, segments, duration: approxDuration };
}

function buildHeuristicTranscript(
  platform: string,
  videoId: string,
  videoUrl: string,
  metadata: { title: string | null; description: string | null; thumbnailUrl: string | null }
) {
  const sourceText = [
    metadata.title || "",
    metadata.description || "",
    platform,
    videoId,
    videoUrl,
  ]
    .join(" ")
    .toLowerCase();

  const keywords = Array.from(
    new Set(
      sourceText
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2)
    )
  ).slice(0, 24);

  const hooks = ["wait", "watch", "secret", "why", "how", "top", "best", "hack", "moment", "clip", "insane", "wild"];
  const base = keywords.length > 0 ? keywords : [platform, "highlight", "reaction", "moment", "hook"];

  const segments: Segment[] = base.map((word, index) => {
    const start = index * 7;
    const hook = hooks[index % hooks.length];
    return {
      start,
      end: start + 7,
      text: `${word} ${hook}`,
    };
  });

  return {
    transcript: segments.map((segment) => `${formatTime(segment.start)} - ${segment.text}`).join("\n"),
    segments,
    duration: Math.max(segments.length * 7, platform === "kick" ? 900 : 600),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoUrl } = await req.json();
    if (!videoUrl) throw new Error("Video URL is required");

    const parsed = parseVideoUrl(videoUrl);
    if (!parsed) {
      throw new Error("Unsupported video URL. Supported: YouTube, Twitch, Kick, TikTok, direct video files");
    }

    const metadata = await fetchPageMetadata(videoUrl);

    if (parsed.platform === "youtube") {
      try {
        const youtubeData = await fetchYouTubeTranscript(parsed.videoId);
        return new Response(
          JSON.stringify({
            success: true,
            platform: parsed.platform,
            videoId: parsed.videoId,
            transcript: youtubeData.transcript,
            segments: youtubeData.segments,
            duration: youtubeData.duration,
            fallback: false,
            metadata: youtubeData.metadata,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (youtubeError) {
        console.log("YouTube transcript unavailable, using fallback:", youtubeError);
      }
    }

    const fallbackData = buildHeuristicTranscript(parsed.platform, parsed.videoId, videoUrl, metadata);

    return new Response(
      JSON.stringify({
        success: true,
        platform: parsed.platform,
        videoId: parsed.videoId,
        transcript: fallbackData.transcript,
        segments: fallbackData.segments,
        duration: fallbackData.duration,
        fallback: true,
        metadata,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
