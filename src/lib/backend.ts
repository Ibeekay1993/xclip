const DEFAULT_API_URL = "https://clip-c2yu.onrender.com";

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || DEFAULT_API_URL;

export type ExportClipRequest = {
  videoId?: string;
  videoUrl: string;
  start: number;
  end: number;
  captions?: boolean;
  preset?: string;
  clipNumber?: number;
  title?: string;
};

export type ProcessVideoRequest = {
  url: string;
};

export type UploadVideoResponse = {
  success: boolean;
  video_id: string;
  duration?: number;
  error?: string;
};

export type ProcessVideoResponse = {
  success: boolean;
  video_id: string;
  duration?: number;
  clips?: Array<Record<string, unknown>>;
  transcription?: Array<Record<string, unknown>>;
  source_url?: string;
  error?: string;
};

export async function processVideoFromBackend(request: ProcessVideoRequest): Promise<ProcessVideoResponse> {
  const response = await fetch(`${API_URL}/process-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: request.url }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Process failed with status ${response.status}`);
  }
  return data as ProcessVideoResponse;
}

export async function uploadVideoToBackend(file: File): Promise<UploadVideoResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || `Upload failed with status ${response.status}`);
  }
  return data as UploadVideoResponse;
}

export async function analyzeVideoFromBackend(videoId: string): Promise<ProcessVideoResponse> {
  const response = await fetch(`${API_URL}/analyze/${videoId}`);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || `Analyze failed with status ${response.status}`);
  }
  return data as ProcessVideoResponse;
}

export function getBackendVideoUrl(videoId: string): string {
  return `${API_URL}/video/${encodeURIComponent(videoId)}`;
}

export async function exportClipFromBackend(request: ExportClipRequest): Promise<Blob> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10 * 60 * 1000);

  try {
    const response = await fetch(`${API_URL}/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        videoUrl: request.videoUrl,
        video_url: request.videoUrl,
        url: request.videoUrl,
        source_url: request.videoUrl,
        video_id: request.videoId,
        videoId: request.videoId,
        start: request.start,
        start_time: request.start,
        end: request.end,
        end_time: request.end,
        captions: request.captions ?? false,
        add_subtitles: request.captions ?? false,
        preset: request.preset ?? "9:16",
        export_preset: request.preset ?? "9:16",
        clipNumber: request.clipNumber ?? 1,
        clip_number: request.clipNumber ?? 1,
        title: request.title ?? "",
      }),
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      if (contentType.includes("application/json")) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Export failed with status ${response.status}`);
      }

      const text = await response.text().catch(() => "");
      throw new Error(text || `Export failed with status ${response.status}`);
    }

    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data?.error) throw new Error(data.error);
      const downloadUrl = data?.downloadUrl || data?.download_url || data?.file_url;
      if (downloadUrl) {
        const fileResponse = await fetch(downloadUrl);
        if (!fileResponse.ok) throw new Error(`Download URL failed with status ${fileResponse.status}`);
        return fileResponse.blob();
      }
      throw new Error("Export API returned JSON instead of a video file.");
    }

    return response.blob();
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("Export timed out while rendering the clip.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
